"""
OFFLINE Voice Processor using Vosk - NO INTERNET REQUIRED
Works 100% locally on your machine
"""
import os
import json
import wave
from typing import Tuple
from vosk import Model, KaldiRecognizer
import soundfile as sf
from googletrans import Translator


class VoiceProcessor:
    def __init__(self):
        """Initialize OFFLINE voice processor with Vosk"""
        print("🎤 Initializing OFFLINE Voice Processor (Vosk)...")
        
        # Load Vosk model
        model_path = "models/vosk-model-small-en-us-0.15"
        if not os.path.exists(model_path):
            raise Exception(f"Vosk model not found at {model_path}. Please download it first.")
        
        self.model = Model(model_path)
        self.translator = Translator()
        
        print("✅ OFFLINE Voice Processor ready! (No internet needed)")
    
    def transcribe_audio(self, audio_path: str, language: str = 'auto') -> Tuple[str, str]:
        """
        Transcribe audio OFFLINE using Vosk
        Returns: (transcribed_text, detected_language)
        """
        try:
            print(f"\n🎤 Transcribing audio (OFFLINE): {audio_path}")
            
            # Convert to WAV if needed
            wav_path = audio_path
            if not audio_path.lower().endswith('.wav'):
                print("Converting to WAV...")
                data, samplerate = sf.read(audio_path)
                wav_path = audio_path.rsplit('.', 1)[0] + '_converted.wav'
                sf.write(wav_path, data, samplerate)
            
            # Open WAV file
            wf = wave.open(wav_path, "rb")
            
            # Check format
            if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
                print("Audio must be WAV format mono PCM.")
                wf.close()
                raise Exception("Invalid audio format")
            
            # Create recognizer
            rec = KaldiRecognizer(self.model, wf.getframerate())
            rec.SetWords(True)
            
            # Process audio
            text_parts = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    result = json.loads(rec.Result())
                    if 'text' in result and result['text']:
                        text_parts.append(result['text'])
            
            # Get final result
            final_result = json.loads(rec.FinalResult())
            if 'text' in final_result and final_result['text']:
                text_parts.append(final_result['text'])
            
            wf.close()
            
            # Clean up converted file
            if wav_path != audio_path and os.path.exists(wav_path):
                os.remove(wav_path)
            
            # Combine text
            text = ' '.join(text_parts).strip()
            
            if not text:
                raise Exception("No speech detected in audio")
            
            print(f"✅ Transcribed (OFFLINE): '{text}'")
            
            # Vosk only does English, so detected language is always English
            return text, 'English'
        
        except Exception as e:
            print(f"❌ Transcription error: {e}")
            raise
    
    def translate_to_english(self, text: str, source_language: str) -> str:
        """Already in English from Vosk"""
        return text
    
    def process_voice_query(self, audio_path: str, language: str = 'auto') -> Tuple[str, str, str]:
        """
        Complete OFFLINE voice processing
        Returns: (original_text, english_text, detected_language)
        """
        try:
            # Transcribe offline
            text, detected_lang = self.transcribe_audio(audio_path, language)
            
            # Already in English
            return text, text, detected_lang
        
        except Exception as e:
            print(f"❌ Voice processing failed: {e}")
            raise
