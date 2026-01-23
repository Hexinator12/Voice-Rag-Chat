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

from backend.rag_engine import RAGEngine
from backend.voice_processor import VoiceProcessor  # Re-enabled with SpeechRecognition
from backend.tts_service import tts_service  # Google Cloud TTS
from backend.feedback_service import feedback_service  # Feedback system


# Initialize FastAPI app
app = FastAPI(
    title="Multilingual Voice RAG API",
    description="RAG system for university data with voice and text input",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG engine and voice processor
rag_engine = None
voice_processor = None

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
        "voice_processor": "initialized" if voice_processor else "not initialized"
    }


@app.post("/api/query", response_model=QueryResponse)
async def text_query(query: TextQuery):
    """Handle text-based queries with conversation memory"""
    global rag_engine
    if not rag_engine:
        print("⏳ Initializing RAG Engine...")
        rag_engine = RAGEngine(data_path="data.json")
        print("✅ RAG Engine ready!")
    
    try:
        # Use a default session ID (in production, this would come from user authentication)
        session_id = "default_session"
        
        # Process query with conversation memory
        result = rag_engine.query(query.question, query.language, session_id=session_id)
        
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
    if not rag_engine or not voice_processor:
        raise HTTPException(status_code=503, detail="Services not initialized")
    
    # Save uploaded audio file
    temp_path = None
    try:
        # Create temporary file
        suffix = Path(audio.filename).suffix or '.wav'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=UPLOAD_DIR) as temp_file:
            temp_path = temp_file.name
            shutil.copyfileobj(audio.file, temp_file)
        
        # Process voice
        original_text, english_text, detected_lang = voice_processor.process_voice_query(temp_path)
        
        # Use detected language if auto
        query_language = detected_lang if language == "auto" else language
        
        # Query RAG system with English text
        result = rag_engine.query(english_text, query_language)
        
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
            except:
                pass


@app.get("/api/languages")
async def get_supported_languages():
    """Get list of supported languages (only those with excellent voice support)"""
    return {
        "languages": [
            {"code": "en", "name": "English", "nativeName": "English"},
            {"code": "hi", "name": "Hindi", "nativeName": "हिंदी"},
            {"code": "mr", "name": "Marathi", "nativeName": "मराठी"},
            {"code": "ta", "name": "Tamil", "nativeName": "தமிழ்"},
            {"code": "te", "name": "Telugu", "nativeName": "తెలుగు"}
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Import TTS service
try:
    from backend.tts_service import tts_service
except ImportError:
    print("⚠️ TTS service not available")
    tts_service = None


# TTS Request Model
class TTSRequest(BaseModel):
    text: str
    language: str = "English"


@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Google Cloud TTS
    Returns base64-encoded MP3 audio
    """
    if not tts_service or not tts_service.enabled:
        raise HTTPException(
            status_code=503,
            detail="TTS service not available. Please configure Google Cloud credentials."
        )
    
    try:
        audio_base64 = tts_service.synthesize_speech(
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

# Pydantic model for feedback
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
