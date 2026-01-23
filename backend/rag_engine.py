"""
Enhanced RAG Engine with Conversation Memory and Gemini API
Handles vector database, semantic search, conversation history, and response generation
"""
import json
import os
import pickle
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import requests
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class ConversationMemory:
    """Manages conversation history for context-aware responses"""
    
    def __init__(self, max_history: int = 10):
        self.max_history = max_history
        self.conversations = {}  # session_id -> list of messages
    
    def add_message(self, session_id: str, role: str, content: str):
        """Add a message to conversation history"""
        if session_id not in self.conversations:
            self.conversations[session_id] = []
        
        self.conversations[session_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep only last max_history messages
        if len(self.conversations[session_id]) > self.max_history:
            self.conversations[session_id] = self.conversations[session_id][-self.max_history:]
    
    def get_history(self, session_id: str, last_n: int = 5) -> List[Dict]:
        """Get conversation history for a session"""
        if session_id not in self.conversations:
            return []
        return self.conversations[session_id][-last_n:]
    
    def clear_session(self, session_id: str):
        """Clear conversation history for a session"""
        if session_id in self.conversations:
            del self.conversations[session_id]


class RAGEngine:
    def __init__(self, data_path: str = "data.json", ollama_url: str = "http://localhost:11434"):
        self.data_path = data_path
        self.ollama_url = ollama_url
        self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        
        # Initialize Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                genai.configure(api_key=api_key)
                self.gemini_model = "configured"
                print("✅ Gemini API configured")
            except Exception as e:
                print(f"❌ Gemini configuration failed: {e}")
                self.gemini_model = None
        else:
            print("⚠️ GEMINI_API_KEY not found. LLM features will be disabled.")
            self.gemini_model = None
        
        # FAISS index
        self.index = None
        self.documents = []
        self.metadatas = []
        
        # Conversation memory
        self.memory = ConversationMemory(max_history=20)
        
        # Initialize database
        self._initialize_database()
    
    def _initialize_database(self):
        """Load university data and create embeddings"""
        print("Initializing database with university data...")
        
        # Check if we have cached embeddings
        cache_file = "faiss_index.pkl"
        if os.path.exists(cache_file):
            print("Loading cached embeddings...")
            with open(cache_file, 'rb') as f:
                data = pickle.load(f)
                self.index = data['index']
                self.documents = data['documents']
                self.metadatas = data['metadatas']
            print(f"Loaded {len(self.documents)} documents from cache")
            return
        
        with open(self.data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        documents = []
        metadatas = []
        
        # Process university info
        uni_info = data.get('university_info', {})
        doc = f"University: {uni_info.get('name')}. {uni_info.get('motto')}. Located at {uni_info.get('location')}. Established in {uni_info.get('established')}. Contact: {uni_info.get('phone')}, {uni_info.get('email')}"
        documents.append(doc)
        metadatas.append({"type": "university_info", "category": "general"})
        
        # Process faculties - with detailed info
        for faculty in data.get('faculties', []):
            # Main faculty info
            doc = f"Faculty: {faculty.get('name')}. Dean: {faculty.get('dean')}. Programs offered: {', '.join(faculty.get('programs', []))}. Specializations: {', '.join(faculty.get('specializations', []))}. Total students: {faculty.get('total_students')}. Faculty members: {faculty.get('faculty_count')}. Contact: {faculty.get('email')}, {faculty.get('phone')}"
            documents.append(doc)
            metadatas.append({"type": "faculty", "faculty_id": faculty.get('id'), "category": "academic", "name": faculty.get('name')})
            
            # Separate document for dean info (for better retrieval)
            dean_doc = f"The dean of {faculty.get('name')} is {faculty.get('dean')}. Contact: {faculty.get('email')}, {faculty.get('phone')}"
            documents.append(dean_doc)
            metadatas.append({"type": "dean_info", "faculty_id": faculty.get('id'), "category": "faculty", "dean": faculty.get('dean')})
        
        # Process courses
        for course in data.get('courses', []):
            doc = f"Course: {course.get('name')} ({course.get('code')}). Faculty: {course.get('faculty')}. Credits: {course.get('credits')}. Year {course.get('year')}, Semester {course.get('semester')}. Instructor: {course.get('instructor')}. Schedule: {course.get('schedule')}. Room: {course.get('room')}. Prerequisites: {course.get('prerequisites')}. Description: {course.get('description')}"
            documents.append(doc)
            metadatas.append({"type": "course", "code": course.get('code'), "category": "academic"})
        
        # Process faculty members
        for member in data.get('faculty_members', []):
            doc = f"Faculty Member: {member.get('name')} ({member.get('designation')}). Specialization: {member.get('specialization')}. Faculty: {member.get('faculty')}. Qualification: {member.get('qualification')}. Experience: {member.get('experience_years')} years. Office: {member.get('office')}. Office hours: {member.get('office_hours')}. Contact: {member.get('email')}, {member.get('phone')}"
            documents.append(doc)
            metadatas.append({"type": "faculty_member", "id": member.get('id'), "category": "faculty"})
        
        # Process facilities
        for facility in data.get('facilities', []):
            doc = f"Facility: {facility.get('name')}. Location: {facility.get('location')}. Capacity: {facility.get('capacity')}. Timings: {facility.get('timings')}. Amenities: {', '.join(facility.get('amenities', []))}. Contact: {facility.get('contact')}"
            documents.append(doc)
            metadatas.append({"type": "facility", "category": "infrastructure", "name": facility.get('name')})
        
        # Process FAQs
        for faq in data.get('faqs', []):
            doc = f"Question: {faq.get('question')} Answer: {faq.get('answer')} Category: {faq.get('category')}"
            documents.append(doc)
            metadatas.append({"type": "faq", "category": faq.get('category', 'general').lower()})
        
        # Process academic calendar
        for event in data.get('academic_calendar', []):
            doc = f"Event: {event.get('event')}. Date: {event.get('start_date')} to {event.get('end_date')}. Description: {event.get('description')}"
            documents.append(doc)
            metadatas.append({"type": "calendar", "category": "academic"})
        
        print(f"Creating embeddings for {len(documents)} documents...")
        
        # Create embeddings
        embeddings = self.embedding_model.encode(documents, show_progress_bar=True)
        embeddings = np.array(embeddings).astype('float32')
        
        # Create FAISS index
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings)
        
        self.documents = documents
        self.metadatas = metadatas
        
        # Cache the index
        print("Caching embeddings for faster startup...")
        with open(cache_file, 'wb') as f:
            pickle.dump({
                'index': self.index,
                'documents': self.documents,
                'metadatas': self.metadatas
            }, f)
        
        print("Database initialization complete!")
    
    def search(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant documents"""
        # Create query embedding
        query_embedding = self.embedding_model.encode([query])
        query_embedding = np.array(query_embedding).astype('float32')
        
        # Search
        distances, indices = self.index.search(query_embedding, n_results)
        
        retrieved_docs = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.documents):
                retrieved_docs.append({
                    'content': self.documents[idx],
                    'metadata': self.metadatas[idx],
                    'distance': float(distances[0][i])
                })
        
        return retrieved_docs
    
    def generate_response(self, query: str, context_docs: List[Dict[str, Any]], language: str = "English", conversation_history: List[Dict] = None) -> str:
        """Generate response using Ollama with conversation context and greeting handling"""
        
        # GREETING DETECTION - Handle greetings first
        greetings = {
            'english': ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'good night', 'greetings', 'goodbye', 'bye', 'see you'],
            'hindi': ['नमस्ते', 'हैलो', 'हाय', 'नमस्कार', 'शुभ रात्रि', 'अलविदा'],
            'marathi': ['नमस्कार', 'नमस्ते', 'हॅलो', 'शुभ रात्री'],
            'tamil': ['வணக்கம்', 'ஹலோ', 'வாழ்த்துக்கள்', 'vanakkam', 'இரவு வணக்கம்'],
            'telugu': ['నమస్కారం', 'హలో', 'శుభోదయం', 'శుభ రాత్రి']
        }
        
        is_greeting = False
        query_lower = query.lower().strip()
        
        # Check if query matches any greeting
        for lang_greetings in greetings.values():
            for greeting in lang_greetings:
                if greeting.lower() in query_lower or query_lower in greeting.lower():
                    is_greeting = True
                    break
            if is_greeting:
                break
        
        # Return greeting response if detected
        if is_greeting:
            # Check if it's a goodbye/good night
            goodbye_words = ['good night', 'goodbye', 'bye', 'see you', 'शुभ रात्रि', 'अलविदा', 'शुभ रात्री', 'இரவு வணக்கம்', 'శుభ రాత్రి']
            is_goodbye = any(word in query_lower for word in goodbye_words)
            
            if is_goodbye:
                goodbye_responses = {
                    'English': "Good night! Feel free to return anytime you need information about Karnavati University. Sleep well!",
                    'Hindi': "शुभ रात्रि! जब भी आपको कर्णावती विश्वविद्यालय के बारे में जानकारी चाहिए, वापस आएं।",
                    'Marathi': "शुभ रात्री! कर्णावती विद्यापीठाबद्दल माहिती हवी असल्यास कधीही परत या.",
                    'Tamil': "இரவு வணக்கம்! கர்ணாவதி பல்கலைக்கழகம் பற்றிய தகவல் தேவைப்பட்டால் எப்போது வேண்டுமானாலும் திரும்பி வாருங்கள்!",
                    'Telugu': "శుభ రాత్రి! కర్ణావతి విశ్వవిద్యాలయం గురించి సమాచారం కావాలంటే ఎప్పుడైనా తిరిగి రండి!"
                }
                response = goodbye_responses.get(language, goodbye_responses['English'])
                print(f"✅ Goodbye detected! Responding in {language}")
                return response
            
        if is_greeting:
            greeting_responses = {
                'English': "Hello! Welcome to Karnavati University's AI Assistant. I can help you with information about admissions, programs, facilities, faculty, and more. What would you like to know?",
                'Hindi': "नमस्ते! कर्णावती विश्वविद्यालय के AI सहायक में आपका स्वागत है। मैं आपको प्रवेश, कार्यक्रम, सुविधाएं, संकाय और अधिक के बारे में जानकारी देने में मदद कर सकता हूं। आप क्या जानना चाहेंगे?",
                'Marathi': "नमस्कार! कर्णावती विद्यापीठाच्या AI सहाय्यकामध्ये आपले स्वागत आहे। मी तुम्हाला प्रवेश, कार्यक्रम, सुविधा, शिक्षक आणि अधिक माहितीसाठी मदत करू शकतो. तुम्हाला काय जाणून घ्यायचे आहे?",
                'Tamil': "வணக்கம்! கர்ணாவதி பல்கலைக்கழகத்தின் AI உதவியாளருக்கு வரவேற்கிறோம். சேர்க்கை, திட்டங்கள், வசதிகள், ஆசிரியர்கள் மற்றும் பலவற்றைப் பற்றிய தகவல்களுக்கு நான் உங்களுக்கு உதவ முடியும். நீங்கள் என்ன தெரிந்து கொள்ள விரும்புகிறீர்கள்?",
                'Telugu': "నమస్కారం! కర్ణావతి విశ్వవిద్యాలయం AI సహాయకుడికి స్వాగతం. ప్రవేశాలు, కార్యక్రమాలు, సౌకర్యాలు, అధ్యాపకులు మరియు మరిన్ని గురించి సమాచారం కోసం నేను మీకు సహాయం చేయగలను. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?"
            }
            response = greeting_responses.get(language, greeting_responses['English'])
            print(f"✅ Greeting detected! Responding in {language}")
            return response
        
        # Build context from retrieved documents
        context = "\n\n".join([doc['content'] for doc in context_docs])
        
        # Build conversation history context
        history_context = ""
        if conversation_history and len(conversation_history) > 0:
            history_context = "\n\nPrevious conversation:\n"
            for msg in conversation_history[-5:]:  # Last 5 messages
                role = "Student" if msg['role'] == 'user' else "Assistant"
                history_context += f"{role}: {msg['content']}\n"
        
        
        # Language-specific instructions with STRONG enforcement
        language_instructions = {
            "Hindi": "You MUST answer ONLY in Hindi language. हिंदी में जवाब दें। Do not use any other language.",
            "Marathi": "You MUST answer ONLY in Marathi language. मराठीत उत्तर द्या। Do not use any other language.",
            "Tamil": "You MUST answer ONLY in Tamil language. தமிழில் பதிலளி। Do not use any other language.",
            "Telugu": "You MUST answer ONLY in Telugu language. తెలుగులో సమాధానం ఇవ్వండి। Do not use any other language.",
            "English": "You MUST answer ONLY in English language. Do not use any other language."
        }
        
        lang_instruction = language_instructions.get(language, "Answer in English")
        
        # Create EXTREMELY STRICT prompt - ONLY use university data
        prompt = f"""You are Karnavati University's AI assistant.

CRITICAL RULES:
1. LANGUAGE: {lang_instruction}
2. ONLY answer questions about Karnavati University
3. If question is NOT about Karnavati University, say: "I'm sorry, I can only provide information about Karnavati University."
4. If answer is NOT in Context, say: "I don't have that information. Please contact +91-2716-615000"
5. NEVER use general knowledge

REFUSE these types of questions:
- Weather, news, other universities, general knowledge
- Example: "What's the weather?" → "I'm sorry, I can only provide information about Karnavati University."

Context:
{context}
{history_context}

Question: {query}

Answer (in {language}):"""
        
        try:
            # Use Gemini API for response generation
            if not self.gemini_model:
                return "Error: Gemini API not configured. Please set GEMINI_API_KEY."
            
            # Configure generation with VERY strict settings
            generation_config = {
                "temperature": 0.1,  # Very low - stick to facts only, no creativity
                "top_p": 0.7,
                "top_k": 10,
                "max_output_tokens": 200,
            }
            
            # EXTREMELY STRICT system instruction
            system_instruction = f"""You are a DATABASE QUERY SYSTEM for Karnavati University.

ABSOLUTE RULES:
1. Answer ONLY in {language} language
2. Use ONLY information from the Context provided in the prompt
3. If information is NOT in the Context, say "I don't have that information"
4. NEVER use external knowledge, general information, or assumptions
5. NEVER mention airports, railways, or anything not in the Context
6. You are NOT a general AI - you are a DATABASE READER ONLY"""
            
            # Create model with system instruction
            model_with_instruction = genai.GenerativeModel(
                'gemini-1.5-flash',
                generation_config=generation_config,
                system_instruction=system_instruction
            )
            
            # Generate response
            response = model_with_instruction.generate_content(prompt)
            answer = response.text
            
            # Log for debugging
            print(f"Query in {language}: {query[:50]}...")
            print(f"Response preview: {answer[:100]}...")
            
            return answer
        
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            # Fallback: return context-based answer
            return f"Based on the university information: {context[:300]}..."
    
    def query(self, question: str, language: str = "English", session_id: str = "default") -> Dict[str, Any]:
        """Main query method with conversation memory"""
        # Get conversation history
        history = self.memory.get_history(session_id, last_n=5)
        
        # Search for relevant documents
        relevant_docs = self.search(question, n_results=5)
        
        # Generate response with conversation context
        answer = self.generate_response(question, relevant_docs, language, history)
        
        # Save to conversation memory
        self.memory.add_message(session_id, "user", question)
        self.memory.add_message(session_id, "assistant", answer)
        
        return {
            "question": question,
            "answer": answer,
            "sources": relevant_docs,
            "language": language,
            "session_id": session_id
        }
    
    def clear_conversation(self, session_id: str = "default"):
        """Clear conversation history for a session"""
        self.memory.clear_session(session_id)
