"use client";

import { useState, useCallback, useRef } from "react";
import type { AccreditationProgress, ExamResult } from "@/types/accreditation";

const STORAGE_KEY = "gastro-ed-accreditation";

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

  const progress: AccreditationProgress = allProgress[specialty] || {
    specialty,
    blocks: [],
    examResults: [],
    mistakes: [],
    favorites: [],
    updatedAt: Date.now(),
  };

  const updateProgress = useCallback(
    (updater: (prev: AccreditationProgress) => AccreditationProgress) => {
      setAllProgress((prev) => {
        const current = prev[specialty] || {
          specialty,
          blocks: [],
          examResults: [],
          mistakes: [],
          favorites: [],
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

  const recordMistake = useCallback(
    (questionId: string) => {
      updateProgress((prev) => {
        const mistakes = prev.mistakes.includes(questionId)
          ? prev.mistakes
          : [...prev.mistakes, questionId];
        return { ...prev, mistakes, updatedAt: Date.now() };
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
    recordMistake,
    toggleFavorite,
    saveExamResult,
  };
}
