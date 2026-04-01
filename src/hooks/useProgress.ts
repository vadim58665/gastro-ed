"use client";

import { useState, useCallback, useEffect } from "react";
import type { UserProgress } from "@/types/user";
import { useAuth } from "@/contexts/AuthContext";
import { pushProgress, logAnswer } from "@/lib/supabase/sync";

const STORAGE_KEY = "gastro-ed-progress";

const defaultProgress: UserProgress = {
  streakCurrent: 0,
  streakBest: 0,
  totalPoints: 0,
  cardsSeen: 0,
  cardsCorrect: 0,
  lastActiveDate: "",
  dailyGoal: 10,
  todayCardsSeen: 0,
};

function getLocalDateStr(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPreviousDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return getLocalDateStr(prev);
}

function loadProgress(): UserProgress {
  if (typeof window === "undefined") return defaultProgress;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultProgress;
    const parsed = JSON.parse(saved) as UserProgress;
    const today = getLocalDateStr();
    if (parsed.lastActiveDate !== today) {
      const isConsecutive = parsed.lastActiveDate === getPreviousDate(today);
      if (!isConsecutive) {
        parsed.streakCurrent = 0;
      }
      parsed.todayCardsSeen = 0;
    }
    return parsed;
  } catch {
    return defaultProgress;
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const { user } = useAuth();

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const saveProgress = useCallback(
    (updated: UserProgress) => {
      const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
      setProgress(withTimestamp);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));

      if (user && navigator.onLine) {
        pushProgress(user.id, withTimestamp).catch(console.error);
      }
    },
    [user]
  );

  const recordAnswer = useCallback(
    (isCorrect: boolean, cardId?: string) => {
      const today = getLocalDateStr();
      const isFirstAnswerToday = progress.lastActiveDate !== today;
      const updated: UserProgress = {
        ...progress,
        cardsSeen: progress.cardsSeen + 1,
        cardsCorrect: progress.cardsCorrect + (isCorrect ? 1 : 0),
        totalPoints: progress.totalPoints + (isCorrect ? 10 : 2),
        todayCardsSeen: progress.todayCardsSeen + 1,
        lastActiveDate: today,
        streakCurrent: isFirstAnswerToday
          ? progress.streakCurrent + 1
          : progress.streakCurrent || 1,
      };
      updated.streakBest = Math.max(updated.streakBest, updated.streakCurrent);
      saveProgress(updated);

      if (cardId && user && navigator.onLine) {
        logAnswer(user.id, cardId, isCorrect).catch(console.error);
      }
    },
    [progress, saveProgress, user]
  );

  return { progress, recordAnswer };
}
