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
            };

            recognition.onresult = (event: any) => {
                // Accumulate all results (both interim and final)
                let fullTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    fullTranscript += event.results[i][0].transcript;
                }

                // Update the display with current transcript
                setTranscript(fullTranscript);
                console.log('📝 Current transcript:', fullTranscript);
            };

            recognition.onend = () => {
                console.log('🛑 Speech recognition ended');
                setIsListening(false);

                // Send the final transcript when recognition ends
                if (transcript && transcript.trim().length > 0) {
                    const detectedLang = recognition.lang || 'en-US';
                    console.log('✅ Final transcript:', transcript, 'Language:', detectedLang);
                    onTranscript(transcript, detectedLang);
                }
            };

            recognition.onerror = (event: any) => {
                console.error('❌ Speech recognition error:', event.error);
                setIsListening(false);

                if (event.error === 'network') {
                    alert('⚠️ Voice requires internet connection. Please connect to WiFi and try again.');
                } else if (event.error === 'no-speech') {
                    alert('No speech detected. Please try again.');
                } else if (event.error === 'not-allowed') {
                    alert('Microphone access denied. Please allow microphone access.');
                } else {
                    alert(`Error: ${event.error}`);
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
                // Send the transcript before stopping
                if (transcript && transcript.trim().length > 0) {
                    const detectedLang = recognitionRef.current.lang || 'en-US';
                    console.log('✅ Sending transcript on stop:', transcript, 'Language:', detectedLang);
                    onTranscript(transcript, detectedLang);
                }
                
                recognitionRef.current.stop();
                setIsListening(false);
                setTranscript('');
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
                    title="Click to speak (requires internet)"
                >
                    🎤
                </button>
            ) : (
                <div className="recording-controls">
                    <div className="recording-indicator">
                        <span className="recording-dot"></span>
                        <span className="recording-time">Listening...</span>
                        {transcript && (
                            <div className="interim-transcript" style={{ marginTop: '8px', fontSize: '14px' }}>
                                "{transcript}"
                            </div>
                        )}
                    </div>
                    <button onClick={stopListening} className="stop-button">
                        ⏹️ Stop
                    </button>
                </div>
            )}
        </div>
    );
};
