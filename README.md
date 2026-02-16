# 🎓 Voice RAG - Multilingual University AI Assistant

<div align="center">

![Voice RAG Banner](https://img.shields.io/badge/Voice%20RAG-AI%20Assistant-blueviolet?style=for-the-badge&logo=openai)
[![Python](https://img.shields.io/badge/Python-3.9+-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-1.5%20Flash-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)

**An intelligent, multilingual voice-enabled RAG system for university information**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [Deployment](#-deployment)

</div>

---

## ✨ Features

### 🌍 **Multilingual Support**

- 🇬🇧 **English** - Natural, fluent responses
- 🇮🇳 **Hindi (हिंदी)** - Native language support

### 🤖 **AI-Powered Intelligence**

- ⚡ **Google Gemini 1.5 Flash** - Latest AI technology
- 🎯 **RAG Architecture** - Retrieval-Augmented Generation
- ☁️ **Qdrant Cloud** - Cloud-hosted vector database
- 🔍 **Gemini Embeddings** - 768-dimensional semantic search
- 🔒 **Strict Data Mode** - Only uses provided university data
- 💬 **Context-Aware** - Remembers conversation history

### 🎙️ **Voice Interaction**

- 🎤 **Voice Input** - Speech recognition in all 5 languages
- 🔊 **Natural Voice Output** - Google Cloud Text-to-Speech
- 🎵 **Premium Voices** - Studio & Wavenet quality
- 🔄 **Real-time Streaming** - Word-by-word text display

### 💎 **User Experience**

- 🎨 **Modern UI** - Beautiful, responsive design
- 🌙 **Dark Mode** - Easy on the eyes
- 💬 **Conversation History** - Save and resume chats
- 🔄 **Language Switching** - Change language mid-conversation
- 👍 **Feedback System** - Rate responses (backend ready)

---

## 🎯 Use Cases

- 🏫 **University Information** - Admissions, programs, facilities
- 📞 **24/7 Support** - Always available AI assistant
- 🌐 **Multilingual Access** - Serve diverse student population
- 📱 **Accessible** - Voice interface for all users
- 🎓 **Student Onboarding** - Quick answers to common questions

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Voice UI │  │ Chat UI  │  │ Language │             │
│  │          │  │          │  │ Selector │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────┴────────────────────────────────────┐
│              Backend (FastAPI + Python)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  RAG Engine (Qdrant Cloud + Gemini Embeddings)  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Google Gemini 1.5 Flash (Response Generation)   │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Google Cloud TTS (Voice Synthesis)              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11 (recommended)
- Node.js 16+
- Google Gemini API Key (optional — used for response generation)
- Google Cloud TTS credentials (optional — for server-side TTS)

### Installation

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
