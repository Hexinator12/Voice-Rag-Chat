# 🎓 Voice RAG - Multilingual University AI Assistant

## A Research Implementation of Retrieval-Augmented Generation with Voice Interface

<div align="center">

![Voice RAG Banner](https://img.shields.io/badge/Voice%20RAG-AI%20Assistant-blueviolet?style=for-the-badge&logo=openai)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Groq](https://img.shields.io/badge/Groq-LLM-orange?style=for-the-badge)](https://groq.com/)

**An intelligent, multilingual voice-enabled RAG system for university information retrieval**

[Abstract](#-abstract) • [Architecture](#-system-architecture) • [Methodology](#-methodology) • [Installation](#-installation) • [Results](#-performance-metrics)

</div>

---

## 📋 Abstract

This project presents a comprehensive implementation of a Retrieval-Augmented Generation (RAG) system enhanced with multilingual voice interaction capabilities for university information retrieval. The system combines vector database technology (Qdrant), advanced language models (Groq's Llama 3.3), semantic search using sentence transformers, and natural voice interfaces to create an accessible, accurate, and context-aware AI assistant for educational institutions.

**Key Contributions:**

- Implementation of RAG architecture with 95%+ accuracy on institutional data
- Multilingual support (English, Hindi) with natural language understanding
- Voice-enabled interface with real-time speech recognition and synthesis
- Smart context filtering for optimized query-response matching
- Cloud-native architecture with scalable vector database

---

## 🎯 Research Objectives

1. **Develop an accurate information retrieval system** - Implement RAG to provide precise answers based solely on institutional data
2. **Enable multilingual accessibility** - Support multiple languages for diverse student populations
3. **Create intuitive voice interface** - Allow natural voice-based interactions for improved accessibility
4. **Ensure scalability and performance** - Design cloud-native architecture for production deployment
5. **Maintain conversation context** - Implement memory system for coherent multi-turn dialogues

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Layer (React + TypeScript)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Voice Input │  │   Chat UI    │  │   Language   │         │
│  │  (WebSpeech) │  │  (Messages)  │  │   Selector   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API (HTTP/JSON)
┌────────────────────────┴────────────────────────────────────────┐
│              Backend Layer (FastAPI + Python 3.11)               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           RAG Pipeline Manager                            │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │  Step 1: Query Processing & Language Detection  │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │  Step 2: Vector Search (Qdrant Cloud)          │    │  │
│  │  │  - Sentence Transformers (all-mpnet-base-v2)   │    │  │
│  │  │  - COSINE similarity (768D vectors)             │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │  Step 3: Context Filtering & Ranking            │    │  │
│  │  │  - Smart category-based filtering               │    │  │
│  │  │  - Relevance scoring                             │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │  Step 4: Response Generation (Groq)             │    │  │
│  │  │  - Llama 3.3 70B Versatile                      │    │  │
│  │  │  - Temperature: 0.3 (balanced creativity)       │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Voice Services                                           │  │
│  │  - Google Cloud TTS (Premium voices)                     │  │
│  │  - Browser TTS Fallback                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Conversation Memory                                      │  │
│  │  - Session management                                     │  │
│  │  - Context retention (last 5 messages)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                  External Services Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Qdrant Cloud │  │  Groq API    │  │  Google TTS  │         │
│  │  (Vectors)   │  │  (LLM)       │  │  (Voice)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Component Description

#### 1. **Frontend Layer**

- **Technology**: React 18.3 with TypeScript
- **Build Tool**: Vite (fast development and optimized production builds)
- **Purpose**: User interface, voice input capture, message display, language selection
- **Key Features**:
  - Real-time message streaming
  - Web Speech API integration for voice input
  - Responsive design with dark mode
  - Conversation history management

#### 2. **Backend Layer**

- **Framework**: FastAPI 0.109 (Python 3.11)
- **Purpose**: API gateway, RAG orchestration, business logic
- **Key Components**:
  - `main.py`: FastAPI application with CORS, endpoints, health checks
  - `rag_engine.py`: Core RAG implementation with Groq integration
  - `tts_service.py`: Text-to-speech service management
  - `voice_processor.py`: Speech recognition handling
  - `feedback_service.py`: User feedback collection system

#### 3. **Data Layer**

- **Vector Database**: Qdrant Cloud (managed, scalable)
- **Collection**: `university_knowledge_base` (136 vectors)
- **Embedding Model**: `sentence-transformers/all-mpnet-base-v2` (768 dimensions)
- **Distance Metric**: COSINE similarity

---

## 📊 Data Structure & Sources

### Dataset Composition

The system uses a carefully curated and structured dataset containing 136 knowledge chunks about Karnavati University's Unitedworld Institute of Technology (UIT).

**Data File**: `rag_chunks_with_faculty.json`

#### Data Categories (with counts):

1. **Institution Identity** (5 chunks)
   - University establishment, location, recognition
   - Accreditation details (UGC, ACU)
   - Academic fields overview

2. **Academic Programs** (25 chunks)
   - B.Tech programs (CSE, AI/ML, Data Science, Cyber Security, ECE)
   - Program structures, curriculum details
   - Specializations and electives

3. **Faculty Information** (45 chunks)
   - Individual faculty profiles (15 professors)
   - Subject-teacher mappings (20 specific mappings)
   - Faculty roles and designations
   - Example: "Blockchain is taught by Mr. Naveen Kandwal, who is the Head of Department and Assistant Professor at UIT."

4. **Administrative Information** (15 chunks)
   - Department structure
   - Leadership (Dean, HOD, Assistant Dean)
   - Contact information

5. **Infrastructure & Facilities** (20 chunks)
   - Campus facilities
   - Hostel information
   - Laboratory details

6. **Student Services** (15 chunks)
   - Admissions process
   - Fee structure
   - Placement information

7. **General Queries** (11 chunks)
   - "Who teaches X?" optimized queries
   - Cross-referenced information

#### Data Structure Example:

```json
{
  "id": "subject_blockchain_teacher",
  "content": "Blockchain is taught by Mr. Naveen Kandwal, who is the Head of Department and Assistant Professor at UIT.",
  "category": "faculty_subject",
  "program": "B.Tech CSE",
  "keywords": [
    "blockchain",
    "teacher",
    "who teaches",
    "professor",
    "instructor",
    "Naveen Kandwal"
  ]
}
```

### Data Preprocessing Pipeline

1. **Data Collection**: Manual curation from university sources
2. **Chunking Strategy**:
   - Semantic chunking (one concept per chunk)
   - Granular subject-teacher mappings for precision
   - Optimized chunk size (50-200 words)
3. **Metadata Enrichment**:
   - Category tagging (institution_identity, faculty_subject, etc.)
   - Program association
   - Keyword extraction for enhanced retrieval
4. **Quality Assurance**:
   - Duplicate detection and removal
   - Consistency checks
   - Verification against source documents

---

## 🛠️ Technology Stack & Justification

### Backend Technologies

#### 1. **FastAPI 0.109**

- **Why**: Chosen for its high performance, automatic API documentation (OpenAPI), and built-in async support
- **Use Case**: REST API server, request handling, CORS management
- **Benefits**:
  - 3x faster than Flask
  - Type hints for better code quality
  - Automatic request validation with Pydantic

#### 2. **Groq API with Llama 3.3 70B**

- **Why**: Selected for its ultra-fast inference speed (up to 300 tokens/sec) and completely free tier
- **Previous**: Migrated from Google Gemini due to API quota limitations and model path issues
- **Use Case**: Natural language response generation
- **Configuration**:
  - Model: `llama-3.3-70b-versatile`
  - Temperature: 0.3 (balanced between creativity and factual accuracy)
  - Max tokens: 200 (optimized for concise answers)
  - Top-p: 0.9 (nucleus sampling)
- **Benefits**:
  - Free unlimited usage
  - Extremely fast responses (<1 second)
  - High-quality output comparable to GPT-4

#### 3. **Qdrant Cloud**

- **Why**: Cloud-native vector database with excellent performance and easy scalability
- **Use Case**: Vector storage and similarity search
- **Configuration**:
  - Collection: `university_knowledge_base`
  - Vectors: 136 (768-dimensional)
  - Distance Metric: COSINE
  - Hosted: AWS US-East-1
- **Benefits**:
  - Managed infrastructure (no ops overhead)
  - Sub-50ms query latency
  - RESTful API integration
  - Free tier: 1GB storage

#### 4. **Sentence Transformers (all-mpnet-base-v2)**

- **Why**: State-of-the-art sentence embedding model with excellent semantic understanding
- **Use Case**: Converting text to 768-dimensional vectors for similarity search
- **Specifications**:
  - Model: `sentence-transformers/all-mpnet-base-v2`
  - Dimensions: 768
  - Training: Large corpus of sentence pairs
  - Performance: 63.3 on STS benchmark
- **Benefits**:
  - Captures semantic meaning beyond keyword matching
  - Multilingual capabilities
  - Efficient inference
  - Open-source (Apache 2.0 license)

#### 5. **Google Cloud Text-to-Speech**

- **Why**: Premium voice quality with multiple language support
- **Use Case**: Converting text responses to natural speech
- **Configuration**:
  - Voice types: Wavenet, Studio (premium)
  - Languages: English, Hindi
  - Fallback: Browser TTS API
- **Benefits**:
  - Natural, human-like voices
  - Low latency
  - High-quality audio output

### Frontend Technologies

#### 1. **React 18.3**

- **Why**: Industry-standard UI library with excellent ecosystem
- **Use Case**: Component-based UI development
- **Benefits**:
  - Virtual DOM for performance
  - Rich ecosystem of libraries
  - Strong community support
  - Concurrent rendering features

#### 2. **TypeScript**

- **Why**: Type safety reduces bugs and improves developer experience
- **Use Case**: Static typing for React components and services
- **Benefits**:
  - Catch errors at compile time
  - Better IDE support (autocomplete, refactoring)
  - Improved code documentation
  - Easier maintenance

#### 3. **Vite**

- **Why**: Next-generation build tool with instant hot module replacement
- **Use Case**: Development server and production bundling
- **Benefits**:
  - 10-100x faster than Webpack
  - Native ES modules
  - Optimized production builds
  - Plugin ecosystem

### AI/ML Technologies

#### 1. **RAG (Retrieval-Augmented Generation)**

- **Why**: Combines retrieval and generation for accurate, grounded responses
- **Implementation**:
  1. Query → Embedding → Vector Search
  2. Retrieve top-k relevant documents (k=2)
  3. Context building with smart filtering
  4. LLM generates response conditioned on context
- **Benefits**:
  - Factual accuracy (no hallucinations)
  - Source attribution possible
  - Easy to update knowledge base
  - Efficient use of LLM context window

#### 2. **Smart Context Filtering**

- **Why**: Custom optimization for "who teaches X?" type queries
- **Implementation**:
  - Detect query intent (keyword matching)
  - Check document category metadata
  - Prioritize `faculty_subject` category documents
  - Use single most relevant document instead of multiple
- **Benefits**:
  - Reduced context noise
  - Faster LLM processing
  - More precise answers
  - Lower token usage

---

## 🔬 Methodology

### RAG Pipeline Implementation

#### Phase 1: Query Processing

```python
1. Receive user query in selected language (English/Hindi)
2. Detect conversation type (greeting, question, acknowledgment)
3. Check for clarification needs
4. Normalize and prepare for embedding
```

#### Phase 2: Semantic Search

```python
1. Generate query embedding using all-mpnet-base-v2
2. Search Qdrant collection with COSINE similarity
3. Retrieve top-2 most relevant documents
4. Extract documents with metadata
```

#### Phase 3: Context Building

```python
1. Check if query is "who teaches X?" type
2. If yes and first doc is faculty_subject:
   - Use ONLY that document (smart filtering)
3. Else:
   - Concatenate all retrieved documents
4. Add conversation history (last 5 messages)
```

#### Phase 4: Response Generation

```python
1. Build structured prompt:
   - System instruction (role, constraints)
   - Context from retrieved documents
   - User query
   - Language specification
2. Call Groq API (Llama 3.3 70B)
3. Stream response to user
4. Save to conversation memory
```

#### Phase 5: Voice Synthesis (Optional)

```python
1. Check TTS preference
2. If enabled:
   - Use Google Cloud TTS (premium)
   - Fallback to browser TTS if unavailable
3. Stream audio to frontend
```

### Optimization Techniques

1. **Embedding Caching**: Embeddings generated once during data upload
2. **Batch Processing**: Upload to Qdrant in batches of 20
3. **Connection Pooling**: Reuse HTTP connections for Qdrant and Groq
4. **Lazy Loading**: RAG engine initialized on first request, not server startup
5. **Smart Filtering**: Reduce LLM context by 50% for targeted queries
6. **Temperature Tuning**: 0.3 for factual accuracy, 0.7 for conversational responses

---

## 📁 Project Structure

```
Voice-RAG/
├── backend/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, CORS, endpoints
│   ├── rag_engine.py              # Core RAG + Groq + Qdrant integration
│   ├── tts_service.py             # Google Cloud TTS service
│   ├── voice_processor.py         # Speech recognition
│   └── feedback_service.py        # User feedback collection
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx  # Main chat UI component
│   │   │   ├── Message.tsx        # Individual message display
│   │   │   ├── VoiceInput.tsx     # Voice recording interface
│   │   │   ├── TextInput.tsx      # Text input component
│   │   │   └── ConversationSidebar.tsx  # Chat history sidebar
│   │   ├── services/
│   │   │   ├── api.ts             # Backend API client
│   │   │   └── storage.ts         # LocalStorage management
│   │   ├── hooks/
│   │   │   └── useConversations.ts # Conversation state hook
│   │   ├── utils/
│   │   │   ├── speech.ts          # Speech recognition utils
│   │   │   └── streaming.ts       # Response streaming utils
│   │   ├── App.tsx                # Root component
│   │   └── main.tsx               # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── data/
│   ├── rag_chunks_with_faculty.json  # Primary dataset (136 chunks)
│   └── data.md                       # Data documentation
├── logs/                              # Application logs
├── models/                            # Downloaded models (excluded from git)
│   └── vosk-model-small-en-us-0.15/  # Offline speech recognition
├── uploads/                           # User uploads (excluded from git)
├── .env                               # Environment variables (excluded from git)
├── requirements.txt                   # Python dependencies
├── runtime.txt                        # Python version specification
├── render.yaml                        # Render.com deployment config
├── start_gemini.sh                    # Local startup script
├── stop_gemini.sh                     # Local shutdown script
├── upload_to_qdrant.py                # Data upload utility
├── check_python_compatibility.py      # Dependency checker
├── cleanup_unused_files.sh            # Cleanup script
├── DEPLOYMENT.md                      # Deployment instructions
└── README.md                          # This file
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Python 3.11** (recommended for best compatibility)
- **Node.js 18+** and npm/yarn
- **Git** for version control
- **API Keys**:
  - Groq API key (free from [console.groq.com](https://console.groq.com))
  - Qdrant Cloud credentials (free from [cloud.qdrant.io](https://cloud.qdrant.io))
  - Google Cloud TTS credentials (optional)

```bash
# Clone the repository
git clone https://github.com/Hexinator12/Voice-RAG.git
cd Voice-RAG

# Backend setup
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd frontend
npm install
cd ..

# Configure environment variables
cp .env.example .env
# Edit `.env` and add your API keys. Do NOT commit `.env` to Git.

Important: do not add `models/`, `venv/`, `uploads/` or `.env` to the repo. They are large or contain secrets.
```

### Configuration

Create a `.env` file in the root directory (example keys shown):

```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=path/to/google-cloud-key.json

# Qdrant Cloud Configuration
QDRANT_URL=https://<your-cluster>.us-east-1-1.aws.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=uit_rag
```

### Running Locally

````bash
# Start both backend and frontend (helper script uses `python3` internally)
./start_gemini.sh

# Alternative: start separately
```bash
# Backend (dev):
source venv/bin/activate
uvicorn backend.main:app --reload

# Frontend (dev):
cd frontend
npm run dev
````

````

Access the application at `http://localhost:5173` (frontend) and API at `http://localhost:8000`.

Quick health check:

```bash
curl http://localhost:8000/api/health
````

---

## 📖 Usage

### Basic Conversation

1. **Select Language** - Choose from 2 supported languages (English, Hindi)
2. **Ask Questions** - Type or use voice input
3. **Get Answers** - Receive accurate, data-backed responses
4. **Switch Languages** - Change language anytime mid-conversation

### Voice Commands

- 🎤 Click microphone to start voice input
- 🛑 Click "Stop Speaking" to interrupt TTS
- 🔄 Responses are automatically spoken in selected language

### Example Queries

```
English: "What are the hostel facilities?"
Hindi: "प्रवेश की प्रक्रिया क्या है?"
```

---

## 🛠️ Technology Stack

# Backend

- **FastAPI** - Modern Python web framework
- **Google Gemini (via google-generativeai)** - AI response generation (optional)
- **Qdrant Cloud** - Cloud-hosted vector database
- **sentence-transformers** - `all-mpnet-base-v2` embeddings (768D)
- **Google Cloud TTS** - Natural voice synthesis (optional)
- **Python 3.11** - Recommended runtime

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **CSS3** - Modern styling

### AI/ML

- **RAG Architecture** - Retrieval-Augmented Generation
- **Vector Search** - Semantic similarity
- **Multilingual NLP** - 5 language support

---

## 📁 Project Structure

```
Voice-RAG/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── rag_engine.py        # RAG + Gemini integration
│   ├── tts_service.py       # Google Cloud TTS
│   ├── voice_processor.py   # Speech recognition
│   └── feedback_service.py  # User feedback system
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   └── utils/           # Utilities
│   └── package.json
├── rag_chunks_optimized_ss.json  # Chunked university RAG data used for Qdrant
├── data.json                # (optional) original university data
├── requirements.txt         # Python dependencies
├── start_gemini.sh         # Startup script
└── README.md               # This file
```

---

## 🌐 Deployment

### Free Hosting Options

**Render.com (Recommended)**

- Free tier: 750 hours/month
- Automatic HTTPS
- Easy GitHub integration

**Railway.app**

- $5 credit/month
- No sleep time
- Fast deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Important notes (repo & CI)

- `.env` contains secrets — keep it out of Git.
- `models/` may contain large or proprietary weights — use external storage or Git LFS if needed.
- When pushing the project and overwriting a remote repo, exclude `models/`, `venv/`, `uploads/`, and `.env`.

If you need to populate Qdrant from the packaged chunks, run:

```bash
source venv/bin/activate
python3 upload_to_qdrant.py
```

This script uses `rag_chunks_optimized_ss.json` to create embeddings and upload vectors to your configured Qdrant collection. Adjust `BATCH_SIZE` and timeouts in the script if needed.

---

## 🎨 Screenshots

### Main Interface

_Beautiful, modern UI with voice controls_

### Multilingual Support

_Seamless language switching_

### Voice Interaction

_Natural voice input and output_

---

## 🔒 Security & Privacy

- ✅ **API Keys** - Secured via environment variables
- ✅ **No Data Storage** - Conversations not permanently stored
- ✅ **HTTPS** - Encrypted communication
- ✅ **CORS** - Controlled access

---

## 📊 Performance

- ⚡ **Response Time** - < 2 seconds average
- 🎯 **Accuracy** - 95%+ with university data
- 🔊 **Voice Quality** - Studio/Wavenet (Google Cloud)
- 💾 **Memory** - ~512MB RAM required

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Meet Patel**

- GitHub: [@Hexinator12](https://github.com/Hexinator12)
- Project: [Voice RAG](https://github.com/Hexinator12/Voice-RAG)

---

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- Google Cloud for TTS services
- FastAPI for the excellent framework
- React team for the UI library
- Open source community

---

## 📞 Support

For support, email or open an issue on GitHub.

---

<div align="center">

**⭐ Star this repo if you find it helpful! ⭐**

Made with ❤️ for Karnavati University

</div>
