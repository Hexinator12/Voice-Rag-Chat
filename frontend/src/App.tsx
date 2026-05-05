import { useState, useEffect, useRef } from 'react';
import { ChatInterface, Message } from './components/ChatInterface';
import { TextInput } from './components/TextInput';
import { VoiceInput } from './components/VoiceInput';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { apiService, Language, API_BASE_URL, QueryResponse } from './services/api';
import { stopSpeaking } from './utils/speech';
import { useConversations } from './hooks/useConversations';
import { getFirebaseAuth } from './services/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import './App.css';
import './components/ProfilePanel.css';
import { ProfilePanel } from './components/ProfilePanel';

function App() {
    type UserProfile = { user_id: string; email?: string; name?: string; picture?: string; role?: string | null };
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [languages, setLanguages] = useState<Language[]>([]);
    const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [elevenlabsStatus, setElevenlabsStatus] = useState<any>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const syncedQueueRef = useRef<{ clear: () => void } | null>(null);
    const streamAbortControllerRef = useRef<AbortController | null>(null);
    const messagesRef = useRef<Message[]>([]);
    const activeConversationIdRef = useRef<string | null>(null);

    const {
        conversations,
        activeConversation,
        activeConversationId,
        createNewConversation,
        switchConversation,
        updateConversationById,
        deleteConversation,
        searchConversations,
        incrementConversationUnreadCount,
    } = useConversations();

    // Sidebar open by default on desktop, closed on mobile
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

    const setVisibleMessages = (msgs: Message[]) => {
        messagesRef.current = msgs;
        setMessages(msgs);
    };

    const persistConversationMessages = (
        conversationId: string,
        msgs: Message[],
        language: string,
        hydrateVisible = true
    ) => {
        messagesRef.current = msgs;
        if (hydrateVisible) {
            setMessages(msgs);
        }
        updateConversationById(conversationId, msgs, language);
    };

    // Keep messages in sync with the active conversation
    useEffect(() => {
        if (activeConversation) {
            activeConversationIdRef.current = activeConversation.id;
            setVisibleMessages(activeConversation.messages || []);
        } else {
            activeConversationIdRef.current = null;
            setVisibleMessages([]);
        }
    }, [activeConversation]);

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

    const handleTTSStart = () => setIsSpeaking(true);
    const handleTTSEnd = () => setIsSpeaking(false);

    useEffect(() => {
        window.addEventListener('tts-started', handleTTSStart);
        window.addEventListener('tts-ended', handleTTSEnd);

        return () => {
            window.removeEventListener('tts-started', handleTTSStart);
            window.removeEventListener('tts-ended', handleTTSEnd);
        };
    }, []);

    useEffect(() => {
        loadLanguages();
        checkBackendHealth(); // Initial visible check

        const pollIntervalMs = API_BASE_URL.includes('.onrender.com') ? 30000 : 5000;

        const interval = setInterval(() => {
            checkBackendHealth(true); // Silent poll
        }, pollIntervalMs);

        return () => clearInterval(interval);
    }, []);

    // Fetch current authenticated user (if any) and keep Firebase auth in sync
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const me = await apiService.getCurrentUser();
                setUser(me);
            } catch {
                setUser(null);
            }
        };

        fetchUser();

        const auth = getFirebaseAuth();
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setUser(null);
                return;
            }
            try {
                const token = await firebaseUser.getIdToken();
                const profile = await apiService.firebaseSignIn(token);
                setUser(profile);
            } catch (err) {
                console.error('Firebase session sync failed', err);
                // Fall back to client-side profile so UI shows signed-in state even if backend sync fails
                setUser({
                    user_id: firebaseUser.uid,
                    email: firebaseUser.email || undefined,
                    name: firebaseUser.displayName || undefined,
                    picture: firebaseUser.photoURL || undefined,
                    role: null,
                });
            }
        });

        return () => unsub();
    }, []);

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

    const checkBackendHealth = async (silent = false) => {
        try {
            if (!silent) setBackendStatus('checking');
            const health = await apiService.healthCheck();
            if (health.status === 'healthy') {
                setBackendStatus('online');
            } else {
                setBackendStatus('offline');
            }
        } catch (error) {
            // Only log errors on initial check to avoid console spam
            if (!silent) console.error('Backend health check failed:', error);
            if (!silent) {
                setBackendStatus('offline');
            }
        }
    };

    const handleLogout = async () => {
        try {
            const auth = getFirebaseAuth();
            await signOut(auth);
            await apiService.logout();
            setUser(null);
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    const handleFirebaseLogin = async (): Promise<UserProfile | null> => {
        try {
            const auth = getFirebaseAuth();
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const token = await result.user.getIdToken();
            try {
                const profile = await apiService.firebaseSignIn(token);
                setUser(profile);
                return profile;
            } catch (err) {
                console.error('Firebase login backend sync failed', err);
                const fallbackProfile = {
                    user_id: result.user.uid,
                    email: result.user.email || undefined,
                    name: result.user.displayName || undefined,
                    picture: result.user.photoURL || undefined,
                    role: null,
                } satisfies UserProfile;
                setUser(fallbackProfile);
                return fallbackProfile;
            }
        } catch (err) {
            console.error('Firebase login failed', err);
            return null;
        }
    };

    const handleProfileSave = async (payload: { role?: string; name?: string }) => {
        try {
            const profile = await apiService.updateProfile(payload);
            setUser(profile);
        } catch (err: any) {
            console.error('Profile update failed', err);

            // If the session cookie expired, refresh it from Firebase and retry once.
            const status = err?.response?.status;
            if (status === 401) {
                try {
                    const auth = getFirebaseAuth();
                    const fbUser = auth.currentUser;
                    if (fbUser) {
                        const token = await fbUser.getIdToken(true);
                        const refreshedProfile = await apiService.firebaseSignIn(token);
                        setUser(refreshedProfile);
                        const retryProfile = await apiService.updateProfile(payload);
                        setUser(retryProfile);
                        return;
                    } else {
                        const relog = await handleFirebaseLogin();
                        if (relog) {
                            const retryProfile = await apiService.updateProfile(payload);
                            setUser(retryProfile);
                            return;
                        }
                    }
                } catch (refreshErr) {
                    console.error('Session refresh failed', refreshErr);
                }
            }

            throw err;
        }
    };

    // Fetch ElevenLabs subscription status periodically
    useEffect(() => {
        const fetchElevenlabsStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/elevenlabs-status`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.status) {
                        setElevenlabsStatus(data.status);
                    }
                }
            } catch (error) {
                // Silent fail - only for optional display
            }
        };

        // Check immediately
        fetchElevenlabsStatus();

        // Check every 60 seconds (to avoid frequent API calls)
        const interval = setInterval(fetchElevenlabsStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    const clearChat = () => {
        streamAbortControllerRef.current?.abort();
        streamAbortControllerRef.current = null;
        syncedQueueRef.current?.clear();
        stopSpeaking(); // Stop any ongoing speech
        setVisibleMessages([]); // Clear messages from UI
        // If there's an active conversation, clear its messages too
        if (activeConversationIdRef.current) {
            const currentId = activeConversationIdRef.current;
            updateConversationById(currentId, [], selectedLanguage);
            // Keep backend session memory aligned with cleared UI chat.
            void apiService.clearSessionMemory(currentId);
        }
    };

    const handleStopSpeaking = () => {
        streamAbortControllerRef.current?.abort();
        streamAbortControllerRef.current = null;
        syncedQueueRef.current?.clear();
        stopSpeaking();
    };

    const handleNewChat = () => {
        streamAbortControllerRef.current?.abort();
        streamAbortControllerRef.current = null;
        const newId = createNewConversation(selectedLanguage);
        activeConversationIdRef.current = newId;
        setVisibleMessages([]);
    };

    const handleSelectConversation = (id: string) => {
        streamAbortControllerRef.current?.abort();
        streamAbortControllerRef.current = null;
        activeConversationIdRef.current = id;
        switchConversation(id);
    };

    const handleTextQuery = async (question: string) => {
        if (!question.trim() || backendStatus === 'offline') return;

        // Stop any previous playback before starting a new streamed response.
        syncedQueueRef.current?.clear();
        stopSpeaking();

        setIsProcessing(true);

        let conversationId = activeConversationIdRef.current;
        if (!conversationId) {
            conversationId = createNewConversation(selectedLanguage);
            activeConversationIdRef.current = conversationId;
        }
        const convId = conversationId;
        if (!convId) return; // Safeguard

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: question,
            timestamp: new Date(),
            language: selectedLanguage,
        };

        const userMessages = [...messagesRef.current, userMessage];
        persistConversationMessages(convId, userMessages, selectedLanguage, true);

        try {
            const useStreamingText = (import.meta.env.VITE_STREAMING_TEXT ?? 'true') !== 'false';
            // TTS should NOT auto-play on text queries, only on voice queries
            const useStreamingTTS = false;
            const assistantMessageId = (Date.now() + 1).toString();
            let streamedAnswer = '';
            let streamedTrustScore: number | undefined;
            let streamedEvidence: QueryResponse['evidence'] = undefined;
            let streamedSources: QueryResponse['sources'] = [];
            let streamTtsQueue: {
                addSentence: (text: string, language: string) => Promise<void>;
                clear: () => void;
            } | null = null;

            const upsertAssistantMessage = (
                content: string,
                metadata?: {
                    trustScore?: number;
                    evidence?: QueryResponse['evidence'];
                    sources?: QueryResponse['sources'];
                }
            ) => {
                const stillActive = activeConversationIdRef.current === convId;
                const baseMessages = stillActive ? messagesRef.current : userMessages;
                const existingIndex = baseMessages.findIndex((msg) => msg.id === assistantMessageId);

                let nextMessages: Message[];
                if (existingIndex >= 0) {
                    nextMessages = baseMessages.map((msg) =>
                        msg.id === assistantMessageId ? { ...msg, content } : msg
                    );
                } else {
                    nextMessages = [
                        ...baseMessages,
                        {
                            id: assistantMessageId,
                            type: 'assistant',
                            content,
                            timestamp: new Date(),
                            language: selectedLanguage,
                            trustScore: metadata?.trustScore,
                            evidence: metadata?.evidence,
                            sources: metadata?.sources,
                        },
                    ];
                    
                    // Increment unread count for non-active conversation - Phase 2.5
                    if (!stillActive) {
                        incrementConversationUnreadCount(convId);
                    }
                }

                if (existingIndex >= 0 && metadata) {
                    nextMessages = nextMessages.map((msg) =>
                        msg.id === assistantMessageId
                            ? {
                                  ...msg,
                                  trustScore: metadata.trustScore ?? msg.trustScore,
                                  evidence: metadata.evidence ?? msg.evidence,
                                                                    sources: metadata.sources ?? msg.sources,
                              }
                            : msg
                    );
                }

                persistConversationMessages(convId, nextMessages, selectedLanguage, stillActive);
            };

            if (useStreamingText) {
                upsertAssistantMessage('');

                streamAbortControllerRef.current?.abort();
                const streamController = new AbortController();
                streamAbortControllerRef.current = streamController;

                if (useStreamingTTS) {
                    const { SyncedTTSQueue } = await import('./utils/syncedAudio');
                    streamTtsQueue = new SyncedTTSQueue();
                    syncedQueueRef.current = streamTtsQueue;
                }

                let streamedSentenceCount = 0;

                try {
                    const response = await apiService.textQueryStream(
                        question,
                        selectedLanguage,
                        convId,
                        {
                            onDelta: (delta) => {
                                if (!delta) return;
                                streamedAnswer += delta;
                                upsertAssistantMessage(streamedAnswer);
                            },
                            onSentence: (sentence) => {
                                const text = sentence?.trim();
                                if (!text || !streamTtsQueue) return;
                                if (activeConversationIdRef.current !== convId) return;

                                streamedSentenceCount += 1;
                                // Fire-and-forget queueing keeps stream rendering responsive.
                                void streamTtsQueue.addSentence(text, selectedLanguage);
                            },
                            onDone: (payload) => {
                                if (payload.answer && payload.answer.length > streamedAnswer.length) {
                                    streamedAnswer = payload.answer;
                                    upsertAssistantMessage(streamedAnswer);
                                }

                                streamedTrustScore = payload.trust_score;
                                streamedEvidence = payload.evidence;
                                streamedSources = payload.sources || [];
                                upsertAssistantMessage(streamedAnswer, {
                                    trustScore: streamedTrustScore,
                                    evidence: streamedEvidence,
                                    sources: streamedSources,
                                });
                            },
                            onError: (message) => {
                                console.error('Streaming query error:', message);
                            },
                        },
                        {
                            signal: streamController.signal,
                            timeoutMs: 120000,
                            inactivityTimeoutMs: 45000,
                        }
                    );

                    if (!streamedAnswer && response.answer) {
                        streamedAnswer = response.answer;
                        upsertAssistantMessage(response.answer);
                    }

                    // If no chunk was spoken during stream, fallback to one-shot TTS.
                    if (useStreamingTTS && streamTtsQueue && streamedSentenceCount === 0 && streamedAnswer.trim()) {
                        void streamTtsQueue.addSentence(streamedAnswer.trim(), selectedLanguage);
                    }
                } catch (streamError) {
                    console.error('Streaming path failed, falling back to non-stream query', streamError);

                    const fallbackResponse = await apiService.textQuery(question, selectedLanguage, convId);
                    streamedAnswer = fallbackResponse.answer;
                    upsertAssistantMessage(fallbackResponse.answer, {
                        trustScore: fallbackResponse.trust_score,
                        evidence: fallbackResponse.evidence,
                        sources: fallbackResponse.sources,
                    });

                    // Graceful fallback to full-response TTS if stream path fails.
                    if (useStreamingTTS) {
                        if (!streamTtsQueue) {
                            const { SyncedTTSQueue } = await import('./utils/syncedAudio');
                            streamTtsQueue = new SyncedTTSQueue();
                            syncedQueueRef.current = streamTtsQueue;
                        }
                        if (fallbackResponse.answer?.trim()) {
                            void streamTtsQueue.addSentence(fallbackResponse.answer.trim(), selectedLanguage);
                        }
                    }
                } finally {
                    if (streamAbortControllerRef.current === streamController) {
                        streamAbortControllerRef.current = null;
                    }
                }
            } else {
                const response = await apiService.textQuery(question, selectedLanguage, convId);

                const assistantMessage: Message = {
                    id: assistantMessageId,
                    type: 'assistant',
                    content: response.answer,
                    timestamp: new Date(),
                    language: selectedLanguage,
                    trustScore: response.trust_score,
                    evidence: response.evidence,
                    sources: response.sources,
                };

                const stillActive = activeConversationIdRef.current === convId;
                const assistantMessages = [...(stillActive ? messagesRef.current : userMessages), assistantMessage];
                persistConversationMessages(convId, assistantMessages, selectedLanguage, stillActive);
            }
        } catch (error) {
            console.error('Error querying backend:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVoiceQuery = async (transcript: string, _detectedLanguage?: string) => {
        if (!transcript.trim() || backendStatus === 'offline') return;

        setIsProcessing(true);

        let conversationId = activeConversationIdRef.current;
        if (!conversationId) {
            conversationId = createNewConversation(selectedLanguage);
            activeConversationIdRef.current = conversationId;
        }
        const convId = conversationId;
        if (!convId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: transcript,
            timestamp: new Date(),
            language: selectedLanguage,
            isVoice: true,
        };

        const userMessages = [...messagesRef.current, userMessage];
        persistConversationMessages(convId, userMessages, selectedLanguage, true);

        try {
            // Get full response from backend
            const response = await apiService.textQuery(transcript, selectedLanguage, convId);

            // Create assistant message with the full content
            const assistantMessageId = (Date.now() + 1).toString();
            const assistantMessage: Message = {
                id: assistantMessageId,
                type: 'assistant',
                content: response.answer,
                timestamp: new Date(),
                language: selectedLanguage,
                trustScore: response.trust_score,
                evidence: response.evidence,
                sources: response.sources,
                highlightedWordIndex: undefined
            };

            const stillActive = activeConversationIdRef.current === convId;
            const assistantMessages = [...(stillActive ? messagesRef.current : userMessages), assistantMessage];
            persistConversationMessages(convId, assistantMessages, selectedLanguage, stillActive);

            // Stop loading as soon as text response is available.
            // Voice playback can continue independently.
            setIsProcessing(false);

            // Import synced audio utilities
            const { SyncedTTSQueue } = await import('./utils/syncedAudio');

            syncedQueueRef.current?.clear();

            // Create synced TTS queue
            const syncedQueue = new SyncedTTSQueue();
            syncedQueueRef.current = syncedQueue;

            // Set up word highlighting callback
            syncedQueue.setWordUpdateCallback((wordIndex: number) => {
                if (activeConversationIdRef.current !== convId) {
                    return;
                }

                setVisibleMessages(messagesRef.current.map(msg =>
                    msg.id === assistantMessageId
                        ? { ...msg, highlightedWordIndex: wordIndex }
                        : msg
                ));
            });

            // Add the full response to the queue for synced playback
            await syncedQueue.addSentence(response.answer, selectedLanguage);

            if (syncedQueueRef.current === syncedQueue) {
                syncedQueueRef.current = null;
            }

            if (activeConversationIdRef.current === convId) {
                setVisibleMessages(messagesRef.current.map(msg =>
                    msg.id === assistantMessageId
                        ? { ...msg, highlightedWordIndex: undefined }
                        : msg
                ));
            }

        } catch (error) {
            console.error('Error processing voice query:', error);
            setIsProcessing(false);
        }
    };

    return (
        <>
        <div className="app">
            {/* Conversation Sidebar */}
            <ConversationSidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onNewChat={handleNewChat}
                onSelectConversation={handleSelectConversation}
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
                            <h2>Voice RAG</h2>
                        </div>

                        <div className="header-controls">
                            <div className="status-row">
                                <div className="status-indicator">
                                    <span className={`status-dot ${backendStatus}`}></span>
                                    <span>
                                        {backendStatus === 'checking' && 'Connecting...'}
                                        {backendStatus === 'online' && 'Connected'}
                                        {backendStatus === 'offline' && 'Offline'}
                                    </span>
                                </div>

                                {elevenlabsStatus && (
                                    <div className="status-indicator elevenlabs-status">
                                        <span className="status-dot elevenlabs">🎤</span>
                                        <span title={`${elevenlabsStatus.characters_used} / ${elevenlabsStatus.character_limit} characters used`}>
                                            {elevenlabsStatus.characters_remaining.toLocaleString()} chars left
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="control-row">
                                <div className="language-selector control-pill">
                                    <label>Language</label>
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

                                <div className="control-pill theme-pill">
                                    <ThemeToggle />
                                </div>

                                {messages.length > 0 && (
                                    <button
                                        className="clear-chat-btn compact"
                                        onClick={clearChat}
                                        title="Clear conversation"
                                    >
                                        🗑️ Clear Chat
                                    </button>
                                )}

                                <div className="auth-section">
                                    {user ? (
                                        <div className="profile-actions">
                                            <button className="profile-chip" onClick={() => setProfileOpen(true)} title="Profile">
                                                <div className="avatar-circle small">
                                                    {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
                                                </div>
                                                <div className="profile-meta">
                                                    <span className="profile-name">{user.name || 'Profile'}</span>
                                                    <span className="profile-subtle">Profile & settings</span>
                                                </div>
                                            </button>
                                            <button className="auth-action ghost" onClick={handleLogout}>Logout</button>
                                        </div>
                                    ) : (
                                        <div className="auth-pill ghost">
                                            <button className="auth-action" onClick={handleFirebaseLogin}>Login with Google</button>
                                        </div>
                                    )}
                                </div>
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
                                <p>Ask me anything about UIT (Unitedworld Institute of Technology) - admissions, programs, faculty, facilities, and more!</p>

                                <div className="example-questions">
                                    <div className="example-question" onClick={() => handleTextQuery("What are the admission requirements for B.Tech CSE?")}>
                                        <div className="icon">📚</div>
                                        <div className="text">What are the admission requirements for B.Tech CSE?</div>
                                    </div>
                                    <div className="example-question" onClick={() => handleTextQuery("Tell me about hostel facilities")}>
                                        <div className="icon">🏠</div>
                                        <div className="text">Tell me about hostel facilities</div>
                                    </div>
                                    <div className="example-question" onClick={() => handleTextQuery("Who is the assistant dean for faculty?")}>
                                        <div className="icon">👨‍🏫</div>
                                        <div className="text">Who is the assistant dean for faculty?</div>
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
                                <div className="speaking-animation">
                                    <div className="wave"></div>
                                    <div className="wave"></div>
                                    <div className="wave"></div>
                                </div>
                                <span className="speaking-indicator">
                                    🎵 AI is speaking...
                                </span>
                                <button
                                    className="stop-speaking-btn"
                                    onClick={handleStopSpeaking}
                                    title="Stop the AI voice"
                                >
                                    ⏹️ Stop
                                </button>
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

        <ProfilePanel
            open={profileOpen}
            userName={user?.name || ''}
            userEmail={user?.email || ''}
            userRole={user?.role || null}
            onClose={() => setProfileOpen(false)}
            onSave={handleProfileSave}
        />
        </>
    );
}

export default App;
