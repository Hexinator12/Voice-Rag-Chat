import { useEffect, useRef } from 'react';
import './ChatInterface.css';

export interface Message {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    language?: string;
    isVoice?: boolean;
    highlightedWordIndex?: number;  // For synced audio word highlighting
}

interface ChatInterfaceProps {
    messages: Message[];
    isProcessing?: boolean;
}

export function ChatInterface({ messages, isProcessing }: ChatInterfaceProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Render message content with word highlighting for synced audio
    const renderMessageContent = (message: Message) => {
        if (message.type !== 'assistant' || message.highlightedWordIndex === undefined) {
            return message.content;
        }

        // Split into words and highlight the current one
        const words = message.content.split(/(\s+)/); // Keep whitespace
        let wordIndex = 0;

        return words.map((segment, i) => {
            if (segment.trim().length === 0) {
                // Whitespace - just return it
                return <span key={i}>{segment}</span>;
            }

            const isHighlighted = wordIndex === message.highlightedWordIndex;
            wordIndex++;

            return (
                <span
                    key={i}
                    className={isHighlighted ? 'highlighted-word' : ''}
                    style={isHighlighted ? {
                        backgroundColor: '#ffd700',
                        color: '#000',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontWeight: 'bold',
                        transition: 'all 0.1s ease'
                    } : {}}
                >
                    {segment}
                </span>
            );
        });
    };

    return (
        <div className="chat-messages">
            {messages.map((message, index) => (
                <div
                    key={message.id}
                    className={`message-wrapper ${message.type}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <div className="message-avatar">
                        {message.type === 'user' ? (
                            <div className="avatar user-avatar">
                                <span className="avatar-emoji">👤</span>
                            </div>
                        ) : (
                            <div className="avatar assistant-avatar">
                                <span className="avatar-emoji">🤖</span>
                                <div className="avatar-pulse"></div>
                            </div>
                        )}
                    </div>

                    <div className="message-content-wrapper">
                        <div className="message-header">
                            <span className="message-sender">
                                {message.type === 'user' ? 'You' : 'AI Assistant'}
                            </span>
                            {message.isVoice && (
                                <span className="voice-badge">
                                    🎤 Voice
                                </span>
                            )}
                            <span className="message-time">
                                {formatTime(message.timestamp)}
                            </span>
                        </div>

                        <div className={`message-bubble ${message.type}`}>
                            <div className="message-text">
                                {renderMessageContent(message)}
                            </div>
                            {message.type === 'assistant' && (
                                <div className="message-decoration">
                                    <div className="sparkle">✨</div>
                                </div>
                            )}
                        </div>

                        {message.language && message.language !== 'English' && (
                            <div className="language-tag">
                                🌐 {message.language}
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {isProcessing && (
                <div className="message-wrapper assistant processing">
                    <div className="message-avatar">
                        <div className="avatar assistant-avatar">
                            <span className="avatar-emoji">🤖</span>
                            <div className="avatar-pulse active"></div>
                        </div>
                    </div>

                    <div className="message-content-wrapper">
                        <div className="message-header">
                            <span className="message-sender">AI Assistant</span>
                        </div>

                        <div className="message-bubble assistant">
                            <div className="typing-indicator">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
