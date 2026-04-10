"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { CharacterState } from "@/components/medmind/CharacterAvatar";

const IDLE_TIMEOUT = 30000; // 30 seconds → sleeping

const HAPPY_MESSAGES = [
  "Верно!",
  "Так держать!",
  "Отличная работа!",
  "Молодец!",
  "Правильно!",
];

const SAD_MESSAGES = [
  "Давай разберём",
  "Не страшно",
  "Попробуем ещё",
  "Бывает",
  "Разберём вместе",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useMedMindCompanion() {
  const [characterState, setCharacterState] = useState<CharacterState>("idle");
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setCharacterState("sleeping");
      setBubbleMessage(null);
    }, IDLE_TIMEOUT);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const onCorrectAnswer = useCallback(() => {
    setCharacterState("happy");
    setBubbleMessage(randomFrom(HAPPY_MESSAGES));
    resetIdleTimer();
    setTimeout(() => {
      setCharacterState("idle");
      setBubbleMessage(null);
    }, 2000);
  }, [resetIdleTimer]);

  const onWrongAnswer = useCallback(() => {
    setCharacterState("sad");
    setBubbleMessage(randomFrom(SAD_MESSAGES));
    resetIdleTimer();
    setTimeout(() => {
      setCharacterState("idle");
      setBubbleMessage(null);
    }, 2500);
  }, [resetIdleTimer]);

  const onThinking = useCallback(() => {
    setCharacterState("thinking");
    resetIdleTimer();
  }, [resetIdleTimer]);

  const onSpeaking = useCallback((message: string) => {
    setCharacterState("speaking");
    setBubbleMessage(message);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const onIdle = useCallback(() => {
    setCharacterState("idle");
    setBubbleMessage(null);
    resetIdleTimer();
  }, [resetIdleTimer]);

  return {
    characterState,
    bubbleMessage,
    onCorrectAnswer,
    onWrongAnswer,
    onThinking,
    onSpeaking,
    onIdle,
  };
}
