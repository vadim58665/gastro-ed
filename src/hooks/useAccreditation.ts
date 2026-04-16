"use client";

import { useState, useCallback, useRef } from "react";
import type { AccreditationProgress, ExamResult, QuestionStats } from "@/types/accreditation";

const STORAGE_KEY = "sd-accreditation";

function loadProgress(): Record<string, AccreditationProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(data: Record<string, AccreditationProgress>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save accreditation progress", e);
  }
}

export function useAccreditation(specialty: string) {
  const [allProgress, setAllProgress] = useState(loadProgress);
  const progressRef = useRef(allProgress);
  progressRef.current = allProgress;

  const raw = allProgress[specialty];
  const progress: AccreditationProgress = raw
    ? { ...raw, questionStats: raw.questionStats ?? {} }
    : {
        specialty,
        blocks: [],
        examResults: [],
        mistakes: [],
        favorites: [],
        questionStats: {},
        updatedAt: Date.now(),
      };

  const updateProgress = useCallback(
    (updater: (prev: AccreditationProgress) => AccreditationProgress) => {
      setAllProgress((prev) => {
        const stored = prev[specialty];
        const current: AccreditationProgress = stored
          ? { ...stored, questionStats: stored.questionStats ?? {} }
          : {
              specialty,
              blocks: [],
              examResults: [],
              mistakes: [],
              favorites: [],
              questionStats: {},
              updatedAt: Date.now(),
            };
        const updated = { ...prev, [specialty]: updater(current) };
        saveProgress(updated);
        return updated;
      });
    },
    [specialty]
  );

  const markQuestionLearned = useCallback(
    (blockNumber: number, questionId: string) => {
      updateProgress((prev) => {
        const blocks = [...prev.blocks];
        let block = blocks.find((b) => b.blockNumber === blockNumber);
        if (!block) {
          block = { blockNumber, learned: 0, total: 100, mistakes: [] };
          blocks.push(block);
        }
        block.learned = Math.min(block.learned + 1, block.total);
        return { ...prev, blocks, updatedAt: Date.now() };
      });
    },
    [updateProgress]
  );

  const recordAnswer = useCallback(
    (questionId: string, correct: boolean) => {
      updateProgress((prev) => {
        const stats = { ...(prev.questionStats ?? {}) };
        const existing: QuestionStats = stats[questionId] ?? {
          attempts: 0,
          wrong: 0,
          lastSeen: 0,
          wasEverCorrect: false,
        };
        stats[questionId] = {
          attempts: existing.attempts + 1,
          wrong: existing.wrong + (correct ? 0 : 1),
          lastSeen: Date.now(),
          wasEverCorrect: existing.wasEverCorrect || correct,
        };

        let mistakes = prev.mistakes;
        if (correct) {
          mistakes = mistakes.filter((id) => id !== questionId);
        } else if (!mistakes.includes(questionId)) {
          mistakes = [...mistakes, questionId];
        }

        return { ...prev, mistakes, questionStats: stats, updatedAt: Date.now() };
      });
    },
    [updateProgress]
  );

  const toggleFavorite = useCallback(
    (questionId: string) => {
      updateProgress((prev) => {
        const favorites = prev.favorites.includes(questionId)
          ? prev.favorites.filter((id) => id !== questionId)
          : [...prev.favorites, questionId];
        return { ...prev, favorites, updatedAt: Date.now() };
      });
    },
    [updateProgress]
  );

  const saveExamResult = useCallback(
    (result: ExamResult) => {
      updateProgress((prev) => ({
        ...prev,
        examResults: [...prev.examResults, result],
        updatedAt: Date.now(),
      }));
    },
    [updateProgress]
  );

  const totalLearned = progress.blocks.reduce((sum, b) => sum + b.learned, 0);

  return {
    progress,
    totalLearned,
    markQuestionLearned,
    recordAnswer,
    toggleFavorite,
    saveExamResult,
  };
}
