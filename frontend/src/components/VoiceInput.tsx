import React, { useState, useRef, useEffect } from 'react';

interface VoiceInputProps {
    onTranscript: (text: string, detectedLanguage?: string) => void;
    isProcessing: boolean;
    selectedLanguage: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, isProcessing, selectedLanguage }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef(''); // Ref to access latest transcript in closures
    const hasSubmittedRef = useRef(false); // Ref to prevent double submission

    useEffect(() => {
        // Initialize Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();

            // EXTENDED SETTINGS for longer questions
            recognition.continuous = true;  // Keep listening even after pauses
            recognition.interimResults = true;  // Show what's being said in real-time
            recognition.maxAlternatives = 1;

            // Map selected language to browser language code (only well-supported languages)
            const languageCodeMap: { [key: string]: string } = {
                'English': 'en-US',
                'Hindi': 'hi-IN'
            };

            recognition.lang = languageCodeMap[selectedLanguage] || 'en-US';
            console.log('🎤 Speech recognition language set to:', recognition.lang);

            recognition.onstart = () => {
                console.log('🎤 Speech recognition started');
                setIsListening(true);
                setTranscript('');
                transcriptRef.current = '';
                hasSubmittedRef.current = false;
            };

            recognition.onresult = (event: any) => {
                // Accumulate all results (both interim and final)
                let fullTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    fullTranscript += event.results[i][0].transcript;
                }

                // Update the display with current transcript
                setTranscript(fullTranscript);
                transcriptRef.current = fullTranscript;
                console.log('📝 Current transcript:', fullTranscript);
            };

            recognition.onend = () => {
                console.log('🛑 Speech recognition ended');
                setIsListening(false);

                // Send the final transcript ONLY if we haven't submitted manually yet
                if (!hasSubmittedRef.current && transcriptRef.current && transcriptRef.current.trim().length > 0) {
                    const detectedLang = recognition.lang || 'en-US';
                    console.log('✅ Final transcript (auto):', transcriptRef.current, 'Language:', detectedLang);
                    onTranscript(transcriptRef.current, detectedLang);
                    hasSubmittedRef.current = true;
                }
            };

            recognition.onerror = (event: any) => {
                console.error('❌ Speech recognition error:', event.error);

                if (event.error === 'network') {
                    // Network errors are often false positives - just log and continue
                    console.warn('Network error in speech recognition - this is usually a transient browser issue');
                    // Don't stop listening, recognition will continue automatically
                } else if (event.error === 'no-speech') {
                    // Ignore no-speech error for UX, just stop
                    console.log('No speech detected - timeout');
                    setIsListening(false);
                } else if (event.error === 'not-allowed') {
                    setIsListening(false);
                    alert('Microphone access denied. Please allow microphone access in your browser settings.');
                } else if (event.error === 'aborted') {
                    // Ignore aborted - user action
                    setIsListening(false);
                } else if (event.error === 'audio-capture') {
                    setIsListening(false);
                    alert('No microphone detected. Please check your microphone connection.');
                } else {
                    setIsListening(false);
                    console.warn(`Speech recognition error: ${event.error}`);
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [onTranscript, selectedLanguage]);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                transcriptRef.current = ''; // Reset ref
                hasSubmittedRef.current = false;
                recognitionRef.current.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
                alert('Could not start voice recognition. Please try again.');
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            try {
                // Send the transcript before stopping (Manual Submit)
                if (!hasSubmittedRef.current && transcriptRef.current && transcriptRef.current.trim().length > 0) {
                    const detectedLang = recognitionRef.current.lang || 'en-US';
                    console.log('✅ Sending transcript on stop:', transcriptRef.current, 'Language:', detectedLang);
                    onTranscript(transcriptRef.current, detectedLang);
                    hasSubmittedRef.current = true; // Mark as submitted
                }

                recognitionRef.current.stop();
                setIsListening(false);
                setTranscript('');
                transcriptRef.current = '';
            } catch (error) {
                console.error('Error stopping recognition:', error);
                setIsListening(false);
            }
        }
    };

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        return (
            <div className="voice-input">
                <button className="mic-button" disabled title="Speech recognition not supported in this browser">
                    🎤 ❌
                </button>
                <p style={{ color: 'red', fontSize: '12px' }}>Voice not supported in this browser</p>
            </div>
        );
    }

    return (
        <div className="voice-input">
            {!isListening ? (
                <button
                    onClick={startListening}
                    disabled={isProcessing}
                    className="mic-button"
                    title="Click to speak"
                >
                    🎤
                </button>
            ) : (
                <div className="voice-overlay">
                    <div className="voice-content">
                        <div className="voice-status">Listening...</div>

                        <div className="voice-visualizer">
                            <div className="visualizer-bar"></div>
                            <div className="visualizer-bar"></div>
                            <div className="visualizer-bar"></div>
                            <div className="visualizer-bar"></div>
                            <div className="visualizer-bar"></div>
                        </div>

                        <div className="voice-transcript">
                            {transcript || "Speak now..."}
                        </div>
                    </div>

                    <div className="voice-controls">
                        <button onClick={stopListening} className="stop-listening-btn">
                            ⏹️ Stop Listening
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
