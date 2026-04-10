"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { TestQuestion } from "@/types/accreditation";

export type TestMode =
  | "training"       // Тренировка: подсказки + ответы сразу
  | "quiz_answers"   // Зачёт с ответами: нет подсказок, ответы сразу
  | "quiz"           // Зачёт: нет подсказок, ответы в конце
  | "exam"           // Экзамен: таймер 90 мин, нет подсказок, ответы в конце
  | "mistakes"       // Работа над ошибками: только неправильные, подсказки + ответы сразу
  | "sprint"         // Спринт: 25 вопросов, 15 мин, ответы в конце
  | "weak_topics";   // Слабые темы: AI подбирает, подсказки + ответы сразу

export interface TestModeConfig {
  hintsEnabled: boolean;
  showAnswersImmediately: boolean;
  timerSeconds: number | null;   // null = no timer
  questionCount: number | null;  // null = all questions
}

export const TEST_MODE_CONFIGS: Record<TestMode, TestModeConfig> = {
  training:     { hintsEnabled: true,  showAnswersImmediately: true,  timerSeconds: null, questionCount: null },
  quiz_answers: { hintsEnabled: false, showAnswersImmediately: true,  timerSeconds: null, questionCount: null },
  quiz:         { hintsEnabled: false, showAnswersImmediately: false, timerSeconds: null, questionCount: null },
  exam:         { hintsEnabled: false, showAnswersImmediately: false, timerSeconds: 5400, questionCount: null },
  mistakes:     { hintsEnabled: true,  showAnswersImmediately: true,  timerSeconds: null, questionCount: null },
  sprint:       { hintsEnabled: false, showAnswersImmediately: false, timerSeconds: 900,  questionCount: 25 },
  weak_topics:  { hintsEnabled: true,  showAnswersImmediately: true,  timerSeconds: null, questionCount: null },
};

export interface TestModeInfo {
  id: TestMode;
  label: string;
  description: string;
  icon: string;
}

export const TEST_MODES: TestModeInfo[] = [
  { id: "training",     label: "Тренировка",           description: "Подсказки и ответы сразу",          icon: "book" },
  { id: "quiz_answers", label: "Зачёт с ответами",     description: "Без подсказок, ответы сразу",       icon: "check" },
  { id: "quiz",         label: "Зачёт",                description: "Без подсказок, ответы в конце",     icon: "clipboard" },
  { id: "exam",         label: "Экзамен",              description: "90 минут, как на аккредитации",     icon: "timer" },
  { id: "mistakes",     label: "Работа над ошибками",  description: "Только неправильные вопросы",       icon: "refresh" },
  { id: "sprint",       label: "Спринт",               description: "25 вопросов за 15 минут",           icon: "zap" },
  { id: "weak_topics",  label: "Слабые темы",           description: "AI подбирает проблемные темы",      icon: "target" },
];

export interface Answer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

interface UseTestModeReturn {
  mode: TestMode | null;
  config: TestModeConfig | null;
  currentIndex: number;
  questions: TestQuestion[];
  answers: Answer[];
  finished: boolean;
  timeRemaining: number | null;
  timerActive: boolean;
  selectMode: (mode: TestMode) => void;
  startTest: (questions: TestQuestion[], mistakeIds?: string[], overrideMode?: TestMode) => void;
  submitAnswer: (questionId: string, selectedIndex: number, isCorrect: boolean) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  finishTest: () => void;
  reset: () => void;
  correctCount: number;
  totalCount: number;
}

export function useTestMode(): UseTestModeReturn {
  const [mode, setMode] = useState<TestMode | null>(null);
  const [config, setConfig] = useState<TestModeConfig | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [finished, setFinished] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer logic
  useEffect(() => {
    if (timerActive && timeRemaining !== null && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            setTimerActive(false);
            setFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timeRemaining]);

  const selectMode = useCallback((m: TestMode) => {
    setMode(m);
    setConfig(TEST_MODE_CONFIGS[m]);
  }, []);

  const startTest = useCallback(
    (qs: TestQuestion[], mistakeIds?: string[], overrideMode?: TestMode) => {
      const activeMode = overrideMode ?? mode;
      if (!activeMode) return;
      if (overrideMode) {
        setMode(overrideMode);
        setConfig(TEST_MODE_CONFIGS[overrideMode]);
      }
      const cfg = TEST_MODE_CONFIGS[activeMode];

      let filtered = qs;
      if (activeMode === "mistakes" && mistakeIds) {
        const idSet = new Set(mistakeIds);
        filtered = qs.filter((q) => idSet.has(q.id));
      }

      if (activeMode === "sprint") {
        // Random 25 questions
        const shuffled = [...filtered].sort(() => Math.random() - 0.5);
        filtered = shuffled.slice(0, 25);
      }

      if (cfg.questionCount && filtered.length > cfg.questionCount) {
        filtered = filtered.slice(0, cfg.questionCount);
      }

      setQuestions(filtered);
      setCurrentIndex(0);
      setAnswers([]);
      setFinished(false);

      if (cfg.timerSeconds) {
        setTimeRemaining(cfg.timerSeconds);
        setTimerActive(true);
      } else {
        setTimeRemaining(null);
        setTimerActive(false);
      }
    },
    [mode]
  );

  const submitAnswer = useCallback(
    (questionId: string, selectedIndex: number, isCorrect: boolean) => {
      setAnswers((prev) => [...prev, { questionId, selectedIndex, isCorrect }]);
    },
    []
  );

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      setTimerActive(false);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, questions.length]);

  const previousQuestion = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : 0));
  }, []);

  const finishTest = useCallback(() => {
    setFinished(true);
    setTimerActive(false);
  }, []);

  const reset = useCallback(() => {
    setMode(null);
    setConfig(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setFinished(false);
    setTimeRemaining(null);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const correctCount = answers.filter((a) => a.isCorrect).length;

  return {
    mode,
    config,
    currentIndex,
    questions,
    answers,
    finished,
    timeRemaining,
    timerActive,
    selectMode,
    startTest,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    finishTest,
    reset,
    correctCount,
    totalCount: questions.length,
  };
}
