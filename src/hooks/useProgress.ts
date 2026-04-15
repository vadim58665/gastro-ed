"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { UserProgress } from "@/types/user";
import { useAuth } from "@/contexts/AuthContext";
import { pushProgress } from "@/lib/supabase/sync";
import { defaultProgress } from "@/data/defaults";

const STORAGE_KEY = "sd-progress";

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

function loadFromStorage(): UserProgress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultProgress;
    const raw = JSON.parse(saved);
    const parsed: UserProgress = { ...defaultProgress, ...raw };
    if (!raw.xp && parsed.totalPoints > 0) {
      parsed.xp = parsed.totalPoints;
    }
    const today = getLocalDateStr();
    if (parsed.lastActiveDate !== today) {
      const isConsecutive = parsed.lastActiveDate === getPreviousDate(today);
      if (!isConsecutive) {
        parsed.streakCurrent = 0;
      }
      if (parsed.todayCardsSeen < parsed.dailyGoal) {
        parsed.dailyGoalStreak = 0;
      }
      parsed.todayCardsSeen = 0;
    }
    return parsed;
  } catch {
    return defaultProgress;
  }
}

// --- Singleton store: one shared progress across all useProgress() calls ---
const listeners = new Set<() => void>();
let snapshot: UserProgress = defaultProgress;
let initialized = false;

function initStore() {
  if (initialized || typeof window === "undefined") return;
  snapshot = loadFromStorage();
  initialized = true;
}

function subscribe(cb: () => void): () => void {
  initStore();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): UserProgress {
  initStore();
  return snapshot;
}

function getServerSnapshot(): UserProgress {
  return defaultProgress;
}

function setSnapshot(next: UserProgress) {
  snapshot = next;
  listeners.forEach((cb) => cb());
}

export function useProgress() {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { user } = useAuth();
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const saveProgress = useCallback(
    (updated: UserProgress) => {
      const withTimestamp = { ...updated, updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));
      } catch (e) {
        console.error("Failed to save progress to localStorage", e);
      }
      setSnapshot(withTimestamp);

      if (user && navigator.onLine) {
        pushProgress(user.id, withTimestamp).catch(console.error);
      }
    },
    [user]
  );

  const recordAnswer = useCallback(
    (isCorrect: boolean, cardId?: string) => {
      const current = progressRef.current;
      const today = getLocalDateStr();
      const isFirstAnswerToday = current.lastActiveDate !== today;
      const updated: UserProgress = {
        ...current,
        cardsSeen: current.cardsSeen + 1,
        cardsCorrect: current.cardsCorrect + (isCorrect ? 1 : 0),
        totalPoints: current.totalPoints,
        todayCardsSeen: current.todayCardsSeen + 1,
        lastActiveDate: today,
        streakCurrent: isFirstAnswerToday
          ? current.streakCurrent + 1
          : current.streakCurrent || 1,
      };
      updated.streakBest = Math.max(updated.streakBest, updated.streakCurrent);
      saveProgress(updated);
    },
    [saveProgress]
  );

  return { progress, recordAnswer, saveProgress };
}
