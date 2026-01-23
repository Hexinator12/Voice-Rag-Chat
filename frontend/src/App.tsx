import { useState, useEffect } from 'react';
import { ChatInterface, Message } from './components/ChatInterface';
import { TextInput } from './components/TextInput';
import { VoiceInput } from './components/VoiceInput';
import { ConversationSidebar } from './components/ConversationSidebar';
import { apiService, Language } from './services/api';
import { stopSpeaking } from './utils/speech';
import { useConversations } from './hooks/useConversations';
import './App.css';

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [languages, setLanguages] = useState<Language[]>([]);
    const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [isSpeaking, setIsSpeaking] = useState(false);
    // Sidebar open by default on desktop, closed on mobile
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Conversation management
    const {
        conversations,
        activeConversation,
        createNewConversation,
        switchConversation,
        updateCurrentConversation,
        deleteConversation,
        searchConversations
    } = useConversations();

    // Sync messages with active conversation
    useEffect(() => {
        if (activeConversation) {
            setMessages(activeConversation.messages);
        } else {
            setMessages([]);
        }
    }, [activeConversation]);

    // Save messages to active conversation
    useEffect(() => {
        if (messages.length > 0) {
            updateCurrentConversation(messages);
        }
    }, [messages, updateCurrentConversation]);

    // Listen for TTS events
    useEffect(() => {
        const handleTTSStart = () => setIsSpeaking(true);
        const handleTTSEnd = () => setIsSpeaking(false);

        window.addEventListener('tts-started', handleTTSStart);
        window.addEventListener('tts-ended', handleTTSEnd);

        return () => {
            window.removeEventListener('tts-started', handleTTSStart);
            window.removeEventListener('tts-ended', handleTTSEnd);
        };
    }, []);

    useEffect(() => {
        loadLanguages();
        checkBackendHealth();

        const interval = setInterval(() => {
            if (backendStatus === 'offline') {
                checkBackendHealth();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [backendStatus]);

    const loadLanguages = async () => {
        try {
            const langs = await apiService.getSupportedLanguages();
            setLanguages(langs);
        } catch (error) {
            console.error('Error loading languages:', error);
            setLanguages([
                { code: 'en', name: 'English' },
                { code: 'hi', name: 'Hindi' }
            ]);
        }
    };

    const checkBackendHealth = async () => {
        try {
            setBackendStatus('checking');
            const health = await apiService.healthCheck();
            if (health.status === 'healthy') {
                setBackendStatus('online');
            } else {
                setBackendStatus('offline');
            }
        } catch (error) {
            console.error('Backend health check failed:', error);
            setBackendStatus('offline');
        }
    };

    const clearChat = () => {
        stopSpeaking(); // Stop any ongoing speech
        setMessages([]); // Clear messages from UI
        // If there's an active conversation, clear its messages too
        if (activeConversation) {
            updateCurrentConversation([]);
        }
    };

    const handleTextQuery = async (question: string) => {
        if (!question.trim() || backendStatus === 'offline') return;

        setIsProcessing(true);

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: question,
            timestamp: new Date(),
            language: selectedLanguage,
        };

        setMessages(prev => [...prev, userMessage]);

        try {
            const response = await apiService.textQuery(question, selectedLanguage);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: response.answer,
                timestamp: new Date(),
                language: selectedLanguage,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error querying backend:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVoiceQuery = async (transcript: string, _detectedLanguage?: string) => {
        if (!transcript.trim() || backendStatus === 'offline') return;

        setIsProcessing(true);

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: transcript,
            timestamp: new Date(),
            language: selectedLanguage,
            isVoice: true,
        };

        setMessages(prev => [...prev, userMessage]);

        try {
            // Get full response from backend
            const response = await apiService.textQuery(transcript, selectedLanguage);

            // Create assistant message with empty content initially
            const assistantMessageId = (Date.now() + 1).toString();
            const assistantMessage: Message = {
                id: assistantMessageId,
                type: 'assistant',
                content: '', // Start empty
                timestamp: new Date(),
                language: selectedLanguage,
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Import streaming utilities
            const { TextStreamer, TTSQueue } = await import('./utils/streaming');

            // Set up TTS queue
            const ttsLanguageMap: { [key: string]: string } = {
                'English': 'en-US',
                'Hindi': 'hi-IN',
                'Marathi': 'mr-IN',
                'Tamil': 'ta-IN',
                'Telugu': 'te-IN'
            };
            const ttsLanguage = ttsLanguageMap[selectedLanguage] || 'en-US';
            const ttsQueue = new TTSQueue(ttsLanguage);

            // Stream the response word by word
            const streamer = new TextStreamer(response.answer, {
                onWord: (_word: string, fullText: string) => {
                    // Update message content with accumulated text
                    setMessages(prev => prev.map(msg =>
                        msg.id === assistantMessageId
                            ? { ...msg, content: fullText }
                            : msg
                    ));
                },
                onSentenceComplete: (sentence: string) => {
                    // Speak each sentence as it completes
                    ttsQueue.addSentence(sentence);
                },
                onComplete: () => {
                    setIsProcessing(false);
                },
                wordsPerSecond: 5 // Slower to match voice better
            });

            streamer.start();

        } catch (error) {
            console.error('Error processing voice query:', error);
            setIsProcessing(false);
        }
    };

    return (
        <div className="app">
            {/* Conversation Sidebar */}
            <ConversationSidebar
                conversations={conversations}
                activeConversationId={activeConversation?.id || null}
                onNewChat={() => {
                    createNewConversation(selectedLanguage);
                    setMessages([]);
                }}
                onSelectConversation={switchConversation}
                onDeleteConversation={deleteConversation}
                onSearch={searchConversations}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
            />

            {/* Main Content */}
            <div className="app-content">
                <header>
                    <div className="header-content">
                        <div className="logo-section">
                            {/* Mobile Sidebar Toggle - Visible only on mobile via CSS */}
                            <button
                                className="mobile-menu-btn"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Open menu"
                            >
                                ☰
                            </button>
                            <div className="logo">🎓</div>
                            <div className="title-section">
                                <h1>Voice RAG</h1>
                                <p className="subtitle">AI-Powered Intelligent Information Assistant</p>
                            </div>
                        </div>

                        <div className="header-controls">
                            <div className="status-indicator">
                                <span className={`status-dot ${backendStatus}`}></span>
                                <span>
                                    {backendStatus === 'checking' && 'Connecting...'}
                                    {backendStatus === 'online' && 'Connected'}
                                    {backendStatus === 'offline' && 'Offline'}
                                </span>
                            </div>

                            {messages.length > 0 && (
                                <button
                                    className="clear-chat-btn"
                                    onClick={clearChat}
                                    title="Clear conversation"
                                >
                                    🗑️ Clear Chat
                                </button>
                            )}

                            <div className="language-selector">
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                >
                                    {languages.map(lang => (
                                        <option key={lang.code} value={lang.name}>
                                            {lang.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </header>

                <main>
                    <div className="chat-container">
                        {messages.length === 0 ? (
                            <div className="welcome-screen">
                                <div className="welcome-icon">🎓</div>
                                <h2>Welcome to Voice RAG!</h2>
                                <p>Ask me anything about Karnavati University - admissions, programs, facilities, and more!</p>

                                <div className="example-questions">
                                    <div className="example-question" onClick={() => handleTextQuery("What are the admission requirements for B.Tech IT?")}>
                                        <div className="icon">📚</div>
                                        <div className="text">What are the admission requirements for B.Tech IT?</div>
                                    </div>
                                    <div className="example-question" onClick={() => handleTextQuery("Tell me about hostel facilities")}>
                                        <div className="icon">🏠</div>
                                        <div className="text">Tell me about hostel facilities</div>
                                    </div>
                                    <div className="example-question" onClick={() => handleTextQuery("Who is the dean of the Law faculty?")}>
                                        <div className="icon">👨‍🏫</div>
                                        <div className="text">Who is the dean of the Law faculty?</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <ChatInterface messages={messages} isProcessing={isProcessing} />
                        )}
                    </div>
                </main>

                <footer>
                    <div className="footer-content">
                        <div className="mode-selector">
                            <button
                                className={`mode-button ${inputMode === 'text' ? 'active' : ''}`}
                                onClick={() => setInputMode('text')}
                            >
                                ⌨️ Text
                            </button>
                            <button
                                className={`mode-button ${inputMode === 'voice' ? 'active' : ''}`}
                                onClick={() => setInputMode('voice')}
                            >
                                🎤 Voice
                            </button>
                        </div>

                        {isSpeaking && (
                            <div className="stop-speaking-container">
                                <button
                                    className="stop-speaking-btn"
                                    onClick={stopSpeaking}
                                >
                                    🔇 Stop Speaking
                                </button>
                                <span className="speaking-indicator">
                                    AI is speaking...
                                </span>
                            </div>
                        )}

                        <div className="input-container">
                            {inputMode === 'text' ? (
                                <TextInput onSubmit={handleTextQuery} isProcessing={isProcessing || backendStatus === 'offline'} />
                            ) : (
                                <VoiceInput
                                    onTranscript={handleVoiceQuery}
                                    isProcessing={isProcessing || backendStatus === 'offline'}
                                    selectedLanguage={selectedLanguage}
                                />
                            )}
                        </div>
                    </div>
                </footer>
            </div> {/* End app-content */}
        </div>
    );
}

export default App;
