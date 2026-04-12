"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type VoiceEngineProps = {
  onTranscript: (text: string, isFinal: boolean) => void;
  isListening: boolean;
  speakEnabled: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionAny = any;

// Web Speech API wrapper for voice input + output
export function useVoiceEngine({ onTranscript, isListening, speakEnabled }: VoiceEngineProps) {
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR && !!window.speechSynthesis);
  }, []);

  // Start/stop recognition
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (isListening) {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-AU";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        setInterimTranscript(interim);

        if (final) {
          onTranscript(final.trim(), true);
          setInterimTranscript("");
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.error("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        if (isListening && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch { /* already started */ }
        }
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch { /* already started */ }
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* already stopped */ }
        recognitionRef.current = null;
      }
    };
  }, [isListening, onTranscript]);

  // Text-to-speech
  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || !window.speechSynthesis) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85; // Slightly slower for elderly users
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-AU";

      // Try to find an Australian or friendly English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.includes("en-AU") || v.lang.includes("en-GB")
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [speakEnabled]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isSupported,
    isSpeaking,
    interimTranscript,
    speak,
    stopSpeaking,
  };
}

