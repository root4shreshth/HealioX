"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type VoiceEngineProps = {
  onTranscript: (text: string, isFinal: boolean) => void;
  isListening: boolean;
  speakEnabled: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionAny = any;

/**
 * Voice engine with proper TTS/ASR coordination.
 *
 * Key design:
 *  - Mic is PAUSED while TTS is speaking (prevents the AI from hearing itself)
 *  - A 400ms cooldown after TTS ends before resuming the mic (lets speaker
 *    audio fully die out before we start listening again)
 *  - Final transcript only fires on `onend` (full sentence), not per-word
 */
export function useVoiceEngine({ onTranscript, isListening, speakEnabled }: VoiceEngineProps) {
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const finalBufferRef = useRef<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  // Ref flags synchronize TTS/ASR so the mic never captures TTS audio
  const isSpeakingRef = useRef(false);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR && !!window.speechSynthesis);
  }, []);

  useEffect(() => {
    shouldListenRef.current = isListening;
  }, [isListening]);

  const startRecognition = useCallback(() => {
    // Guard: don't start if we shouldn't be listening or AI is speaking
    if (!shouldListenRef.current || isSpeakingRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    finalBufferRef.current = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // If AI started speaking mid-recognition, discard and stop listening
      if (isSpeakingRef.current) {
        try { recognition.stop(); } catch { /* noop */ }
        return;
      }

      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalBufferRef.current += (finalBufferRef.current ? " " : "") + transcript.trim();
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim || finalBufferRef.current);
    };

    recognition.onend = () => {
      const fullSentence = finalBufferRef.current.trim();
      // Only fire if we actually captured something AND AI isn't speaking
      if (fullSentence && !isSpeakingRef.current) {
        onTranscript(fullSentence, true);
        finalBufferRef.current = "";
        setInterimTranscript("");
      }

      // Auto-restart if still meant to be listening and AI isn't talking
      if (shouldListenRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (shouldListenRef.current && !isSpeakingRef.current) {
            try { recognitionRef.current?.start(); } catch { /* noop */ }
          }
        }, 250);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* already started */ }
  }, [onTranscript]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    finalBufferRef.current = "";
    setInterimTranscript("");
  }, []);

  // Start/stop recognition in response to `isListening`
  useEffect(() => {
    if (isListening && !isSpeakingRef.current) {
      startRecognition();
    } else {
      stopRecognition();
    }
    return () => stopRecognition();
  }, [isListening, startRecognition, stopRecognition]);

  // ── Text-to-speech with mic pause ────────────────────────────────────────
  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      // Strip any stray JSON braces if they snuck through (safety net)
      const cleanText = text.replace(/[{}]/g, "").replace(/"message"\s*:\s*"/gi, "").trim() || text;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-IN";

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.includes("en-IN") || v.lang.includes("en-GB") || v.lang.includes("en-US")
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        // CRITICAL: stop listening while we speak so mic doesn't capture our voice
        stopRecognition();
      };

      const onFinished = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        // Cooldown before resuming mic — lets speaker audio die out
        setTimeout(() => {
          if (shouldListenRef.current && !isSpeakingRef.current) {
            startRecognition();
          }
        }, 400);
      };

      utterance.onend = onFinished;
      utterance.onerror = onFinished;

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [speakEnabled, startRecognition, stopRecognition]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    // Resume mic immediately on manual stop
    if (shouldListenRef.current) {
      setTimeout(() => startRecognition(), 100);
    }
  }, [startRecognition]);

  return { isSupported, isSpeaking, interimTranscript, speak, stopSpeaking };
}
