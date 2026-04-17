"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  /** 0..1 normalized microphone input level (0 when not listening). */
  level: number;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export function useVoiceInput(
  onResult?: (text: string) => void
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const cleanupAudio = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      cleanupAudio();
    };
  }, [cleanupAudio]);

  const attachAudioMeter = useCallback(async () => {
    // Audio level meter in parallel with SpeechRecognition for a live UI signal.
    // Safari requires a user gesture (start() is called from onClick) + HTTPS.
    try {
      const AC =
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);
        // RMS → roughly 0..1.
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setLevel(Math.min(1, rms * 2.5));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Meter is decorative — ignore failures (e.g. denied mic).
    }
  }, []);

  const start = useCallback(() => {
    if (!isSupported || isListening) return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();

    recognition.lang = "ru-RU";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      vibrate(20);
      attachAudioMeter();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setTranscript(final || interim);

      if (final) {
        vibrate([15, 40, 15]);
        onResult?.(final);
      }
    };

    recognition.onerror = (event: Event) => {
      const e = event as unknown as { error?: string };
      const code = e.error ?? "unknown";
      // Friendly messages, kept short.
      const labelByCode: Record<string, string> = {
        "not-allowed": "Разрешите доступ к микрофону",
        "service-not-allowed": "Голосовой ввод недоступен",
        "no-speech": "Не услышал речь",
        network: "Нет соединения",
        aborted: "",
      };
      setError(labelByCode[code] ?? "Ошибка распознавания");
      setIsListening(false);
      cleanupAudio();
    };

    recognition.onend = () => {
      setIsListening(false);
      cleanupAudio();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, isListening, onResult, attachAudioMeter, cleanupAudio]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    cleanupAudio();
  }, [cleanupAudio]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return { isListening, isSupported, transcript, level, error, start, stop, toggle };
}
