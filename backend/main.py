"""
FastAPI Backend for Multilingual Voice RAG System
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import tempfile
import shutil
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# from backend.tts_service import tts_service  # Google Cloud TTS (requires billing)
from backend.edge_tts_service import edge_tts_service
from backend.elevenlabs_tts_service import elevenlabs_tts_service
from backend.feedback_service import feedback_service  # Feedback system


# Prefer ElevenLabs if configured, otherwise fallback to Edge TTS.
tts_service = elevenlabs_tts_service if elevenlabs_tts_service.enabled else edge_tts_service


# Initialize FastAPI app
app = FastAPI(
    title="Multilingual Voice RAG API",
    description="RAG system for university data with voice and text input",
    version="1.0.0"
)

# CORS middleware
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://voicerag-frontend.onrender.com",
    "https://voice-rag.onrender.com",
]

# Optional override for deployment environments.
frontend_url = os.getenv("FRONTEND_URL", "").strip()
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG engine and voice processor
rag_engine = None
voice_processor = None
DATA_PATH = Path(__file__).resolve().parent.parent / "rag_chunks_with_faculty.json"

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# Pydantic models
class TextQuery(BaseModel):
    question: str
    language: Optional[str] = "English"


class QueryResponse(BaseModel):
    question: str
    answer: str
    language: str
    sources: List[Dict[str, Any]]


class VoiceQueryResponse(BaseModel):
    original_text: str
    english_text: str
    detected_language: str
    answer: str
    sources: List[Dict[str, Any]]


class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "English"


class FeedbackRequest(BaseModel):
    message_id: str
    rating: str
    query: str
    response: str
    language: str
    session_id: Optional[str] = None
    category: Optional[str] = None
    comment: Optional[str] = None


def get_rag_engine():
    """Lazily initialize the RAG engine with the workspace dataset."""
    global rag_engine

    if rag_engine is None:
        from backend.rag_engine import RAGEngine
        print("⏳ Initializing RAG Engine...")
        rag_engine = RAGEngine(data_path=str(DATA_PATH))
        print("✅ RAG Engine ready!")

    return rag_engine


def get_voice_processor():
    """Lazily initialize voice processing for audio queries."""
    global voice_processor

    if voice_processor is None:
        from backend.voice_processor import VoiceProcessor
        voice_processor = VoiceProcessor()

    return voice_processor


@app.on_event("startup")
async def startup_event():
    """Fast startup - models load on first request"""
    print("🚀 Server starting (models will load on first request)...")
    print("✅ Server ready!")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Multilingual Voice RAG API",
        "status": "running",
        "endpoints": {
            "text_query": "/api/query",
            "voice_query": "/api/voice-query",
            "health": "/api/health"
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "rag_engine": "initialized" if rag_engine else "not initialized",
        "voice_processor": "initialized" if voice_processor else "not initialized",
        "tts_service": "initialized" if tts_service and tts_service.enabled else "not available",
        "data_path": str(DATA_PATH.name)
    }


@app.post("/api/query", response_model=QueryResponse)
async def text_query(query: TextQuery):
    """Handle text-based queries with conversation memory"""
    try:
        engine = get_rag_engine()

        # Use a default session ID (in production, this would come from user authentication)
        session_id = "default_session"
        
        # Process query with conversation memory
        result = engine.query(query.question, query.language, session_id=session_id)
        
        return QueryResponse(
            question=result['question'],
            answer=result['answer'],
            language=result['language'],
            sources=result['sources']
        )
    
    except Exception as e:
        print(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/voice-query", response_model=VoiceQueryResponse)
async def voice_query(
    audio: UploadFile = File(...),
    language: Optional[str] = Form("auto")
):
    """Handle voice-based queries"""
    # Save uploaded audio file
    temp_path = None
    try:
        engine = get_rag_engine()
        processor = get_voice_processor()

        # Create temporary file
        suffix = Path(audio.filename).suffix or '.wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=UPLOAD_DIR) as temp_file:
            temp_path = temp_file.name
            shutil.copyfileobj(audio.file, temp_file)
        
        # Process voice
        original_text, english_text, detected_lang = processor.process_voice_query(temp_path)
        
        # Use detected language if auto
        query_language = detected_lang if language == "auto" else language
        
        # Query RAG system with English text
        result = engine.query(english_text, query_language, session_id="default_session")
        
        return VoiceQueryResponse(
            original_text=original_text,
            english_text=english_text,
            detected_language=detected_lang,
            answer=result['answer'],
            sources=result['sources']
        )
    
    except Exception as e:
        print(f"Error processing voice query: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.get("/api/languages")
async def get_supported_languages():
    """Get list of supported languages (only those with excellent voice support)"""
    return {
        "languages": [
            {"code": "en", "name": "English", "nativeName": "English"},
            {"code": "hi", "name": "Hindi", "nativeName": "हिंदी"}
        ]
    }


@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Microsoft Edge TTS (FREE)
    Returns base64-encoded MP3 audio
    """
    if not tts_service or not tts_service.enabled:
        raise HTTPException(
            status_code=503,
            detail="TTS service not available. Using browser TTS fallback."
        )
    
    try:
        # Use async version of synthesize_speech
        audio_base64 = await tts_service.synthesize_speech_async(
            text=request.text,
            language=request.language
        )
        
        if not audio_base64:
            raise HTTPException(status_code=500, detail="TTS generation failed")
        
        return {
            "audio": audio_base64,
            "format": "mp3"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


@app.post("/api/tts-synced")
async def text_to_speech_synced(request: TTSRequest):
    """
    Convert text to speech with word-level timing information
    Returns base64-encoded MP3 audio + word timings for synchronized playback
    Perfect for highlighting words as they're spoken!
    """
    if not tts_service or not tts_service.enabled:
        raise HTTPException(
            status_code=503,
            detail="TTS service not available"
        )
    
    try:
        # Use the new synced method
        result = await tts_service.synthesize_speech_with_timings_async(
            text=request.text,
            language=request.language
        )
        
        if not result:
            raise HTTPException(status_code=500, detail="Synced TTS generation failed")
        
        return result  # Returns { audio, timings, format }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synced TTS error: {str(e)}")

# Feedback endpoints
@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Submit user feedback"""
    try:
        feedback_record = feedback_service.submit_feedback(
            message_id=request.message_id,
            rating=request.rating,
            query=request.query,
            response=request.response,
            language=request.language,
            session_id=request.session_id,
            category=request.category,
            comment=request.comment
        )
        return {"success": True, "feedback_id": feedback_record["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feedback/stats")
async def get_feedback_stats():
    """Get feedback statistics"""
    try:
        return feedback_service.get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/elevenlabs-status")
async def get_elevenlabs_status():
    """Get ElevenLabs account subscription and character usage"""
    try:
        if elevenlabs_tts_service.enabled:
            status = elevenlabs_tts_service.get_subscription_status()
            if status:
                return {"success": True, "status": status}
            else:
                return {"success": False, "error": "Could not fetch subscription status"}
        else:
            return {"success": False, "error": "ElevenLabs not configured"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
