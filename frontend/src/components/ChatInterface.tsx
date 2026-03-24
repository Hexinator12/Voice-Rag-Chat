import { useEffect, useRef } from 'react';
import { TypingIndicator } from './TypingIndicator';
import './ChatInterface.css';

export interface Message {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    language?: string;
    isVoice?: boolean;
    highlightedWordIndex?: number;  // For synced audio word highlighting
    trustScore?: number;
    evidence?: Array<{
        rank: number;
        score: number;
        raw_score: number;
        snippet: string;
        metadata: Record<string, any>;
    }>;
    sources?: Array<{
        content: string;
        metadata: Record<string, any>;
        distance: number;
    }>;
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

    // Voice sync stays enabled, but visual word highlighting is disabled.
    const renderMessageContent = (message: Message) => {
        return message.content;
    };

    const getTrustLevel = (score?: number) => {
        if (score === undefined) return 'unknown';
        if (score >= 75) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    };

    const buildFallbackEvidence = (message: Message) => {
        const sources = message.sources || [];
        if (sources.length === 0) {
            return { trustScore: undefined as number | undefined, evidence: [] as NonNullable<Message['evidence']> };
        }

        const top = sources.slice(0, 3);
        const confidences = top.map((s) => Math.max(0, Math.min(1, Number(s.distance || 0))));
        const topConfidence = confidences[0];
        const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

        const answerTokens = new Set((message.content || '').toLowerCase().split(/\W+/).filter(Boolean));
        const contextTokens = new Set(
            top
                .map((s) => (s.content || '').toLowerCase())
                .join(' ')
                .split(/\W+/)
                .filter(Boolean)
        );
        const coverage =
            answerTokens.size > 0 && contextTokens.size > 0
                ? [...answerTokens].filter((t) => contextTokens.has(t)).length / answerTokens.size
                : 0;

        const agreement = confidences.filter((c) => c >= 0.6).length / confidences.length;

        const evidence = top.map((s, idx) => ({
            rank: idx + 1,
            score: Number((confidences[idx] * 100).toFixed(2)),
            raw_score: Number((Number(s.distance || 0)).toFixed(6)),
            snippet: (s.content || '').slice(0, 280) + ((s.content || '').length > 280 ? '...' : ''),
            metadata: s.metadata || {},
        }));

        const trustScore = Number(
            ((0.55 * topConfidence + 0.25 * avgConfidence + 0.15 * coverage + 0.05 * agreement) * 100).toFixed(2)
        );
        return { trustScore, evidence };
    };

    const shouldShowProcessing =
        !!isProcessing && !(messages.length > 0 && messages[messages.length - 1]?.type === 'assistant');

    return (
        <div className="chat-messages">
            {messages.map((message, index) => {
                const fallback = buildFallbackEvidence(message);
                const effectiveTrustScore = message.trustScore ?? fallback.trustScore;
                const effectiveEvidence = (message.evidence && message.evidence.length > 0) ? message.evidence : fallback.evidence;
                const strongEvidence = effectiveEvidence.filter((item) => item.score >= 20);
                const weakEvidence = effectiveEvidence.filter((item) => item.score < 20);

                return (
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

                        {message.type === 'assistant' && (effectiveTrustScore !== undefined || effectiveEvidence.length > 0) && (
                            <div className="trust-evidence-panel">
                                {effectiveTrustScore !== undefined && (
                                    <div className={`trust-score-chip ${getTrustLevel(effectiveTrustScore)}`}>
                                        Answer Confidence: {effectiveTrustScore.toFixed(1)}%
                                    </div>
                                )}

                                {!!effectiveEvidence.length && (
                                    <details className="evidence-details">
                                        <summary>View Evidence ({strongEvidence.length})</summary>
                                        <div className="evidence-list">
                                            <div className="evidence-summary">
                                                {strongEvidence.length} strong source{strongEvidence.length === 1 ? '' : 's'}, {weakEvidence.length} weak source{weakEvidence.length === 1 ? '' : 's'}
                                            </div>

                                            {strongEvidence.map((item) => (
                                                <div key={`${message.id}-ev-${item.rank}`} className="evidence-item">
                                                    <div className="evidence-meta">
                                                        <span>#{item.rank}</span>
                                                        <span>{item.score.toFixed(1)}%</span>
                                                    </div>
                                                    <p>{item.snippet}</p>
                                                </div>
                                            ))}

                                            {!!weakEvidence.length && (
                                                <details className="weak-evidence-details">
                                                    <summary>Weak Context ({weakEvidence.length})</summary>
                                                    <div className="weak-evidence-list">
                                                        {weakEvidence.map((item) => (
                                                            <div key={`${message.id}-weak-${item.rank}`} className="evidence-item weak">
                                                                <div className="evidence-meta">
                                                                    <span>#{item.rank}</span>
                                                                    <span>{item.score.toFixed(1)}%</span>
                                                                </div>
                                                                <p>{item.snippet}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}

                        {message.language && message.language !== 'English' && (
                            <div className="language-tag">
                                🌐 {message.language}
                            </div>
                        )}
                    </div>
                </div>
                );
            })}

            {shouldShowProcessing && (
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
                            <TypingIndicator isVisible={true} message="AI is thinking..." />
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
