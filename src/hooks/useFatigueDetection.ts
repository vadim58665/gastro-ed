"use client";

import { useState, useRef, useCallback } from "react";

interface FatigueState {
  isFatigued: boolean;
  message: string;
  consecutiveErrors: number;
  sessionMinutes: number;
}

const FATIGUE_THRESHOLDS = {
  consecutiveErrors: 4,
  sessionMinutes: 45,
  rapidAnswerMs: 1500,
  rapidAnswerStreak: 3,
};

export function useFatigueDetection() {
  const [fatigue, setFatigue] = useState<FatigueState>({
    isFatigued: false,
    message: "",
    consecutiveErrors: 0,
    sessionMinutes: 0,
  });

  const sessionStartRef = useRef(Date.now());
  const errorsRef = useRef(0);
  const lastAnswerRef = useRef(0);
  const rapidStreakRef = useRef(0);
  const dismissedRef = useRef(false);

  const recordAnswer = useCallback((isCorrect: boolean) => {
    const now = Date.now();

    // Track consecutive errors
    if (!isCorrect) {
      errorsRef.current += 1;
    } else {
      errorsRef.current = 0;
    }

    // Track rapid answering (clicking without reading)
    const timeSinceLast = now - lastAnswerRef.current;
    if (lastAnswerRef.current > 0 && timeSinceLast < FATIGUE_THRESHOLDS.rapidAnswerMs) {
      rapidStreakRef.current += 1;
    } else {
      rapidStreakRef.current = 0;
    }
    lastAnswerRef.current = now;

    // Session duration
    const sessionMin = Math.floor((now - sessionStartRef.current) / 60000);

    // Check fatigue conditions
    let fatigueMessage = "";

    if (errorsRef.current >= FATIGUE_THRESHOLDS.consecutiveErrors) {
      fatigueMessage = "Много ошибок подряд - сделайте перерыв 5 минут";
    } else if (sessionMin >= FATIGUE_THRESHOLDS.sessionMinutes) {
      fatigueMessage = `${sessionMin} минут без перерыва - отдохните немного`;
    } else if (rapidStreakRef.current >= FATIGUE_THRESHOLDS.rapidAnswerStreak) {
      fatigueMessage = "Вы отвечаете слишком быстро - читайте вопросы внимательнее";
    }

    if (fatigueMessage && !dismissedRef.current) {
      setFatigue({
        isFatigued: true,
        message: fatigueMessage,
        consecutiveErrors: errorsRef.current,
        sessionMinutes: sessionMin,
      });
    }
  }, []);

  const dismiss = useCallback(() => {
    setFatigue((prev) => ({ ...prev, isFatigued: false, message: "" }));
    dismissedRef.current = true;
    // Reset dismissed after 10 minutes
    setTimeout(() => {
      dismissedRef.current = false;
    }, 600000);
  }, []);

  const resetSession = useCallback(() => {
    sessionStartRef.current = Date.now();
    errorsRef.current = 0;
    rapidStreakRef.current = 0;
    dismissedRef.current = false;
    setFatigue({
      isFatigued: false,
      message: "",
      consecutiveErrors: 0,
      sessionMinutes: 0,
    });
  }, []);

  return { fatigue, recordAnswer, dismiss, resetSession };
}
