#!/bin/bash

# Multilingual Voice RAG System - Startup Script (Gemini API Version)
# No Ollama needed - uses cloud-based Gemini API

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🎓 Voice RAG System - Gemini API Version             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check Gemini API Key
echo "ℹ️  Checking Gemini API configuration..."
if [ ! -f ".env" ] || ! grep -q "GEMINI_API_KEY" .env; then
    echo "⚠️  GEMINI_API_KEY not found in .env file"
    echo "ℹ️  Please add your Gemini API key to .env file"
    exit 1
fi
echo "✅ Gemini API key configured"

# Start Backend
echo "ℹ️  Starting Backend API with Gemini..."
source venv/bin/activate
PYTHONPATH=/Users/meetpatel/Desktop/voicerag python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 > logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend with retries
echo "ℹ️  Waiting for backend to initialize..."
MAX_RETRIES=15
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "✅ Backend started (PID: $BACKEND_PID)"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo ""
    echo "❌ Backend failed to start within 15 seconds"
    echo "ℹ️  Check logs/backend.log for details"
    tail -20 logs/backend.log
    exit 1
fi
echo ""

# Start Frontend
echo "ℹ️  Starting Frontend..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend
sleep 3
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   🎉 ALL SERVICES RUNNING!                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Gemini API:     Configured (Cloud-based AI)"
echo "✅ Backend API:    http://localhost:8000  (PID: $BACKEND_PID)"
echo "✅ Frontend:       http://localhost:5173  (PID: $FRONTEND_PID)"
echo ""
echo "ℹ️  🌐 Open: http://localhost:5173"
echo "ℹ️  📝 Logs: logs/backend.log, logs/frontend.log"
echo ""
echo "ℹ️  Supported languages: English, Hindi, Tamil, Telugu, Marathi"
echo "ℹ️  Press Ctrl+C to stop all services..."
echo ""

wait
