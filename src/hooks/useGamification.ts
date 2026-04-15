"use client";

import { useCallback, useRef } from "react";
import { useProgress } from "./useProgress";
import { useReview } from "./useReview";
import type { ReviewSource } from "./useReview";
import { useAuth } from "@/contexts/AuthContext";
import { useMode } from "@/contexts/ModeContext";
import { logAnswer } from "@/lib/supabase/sync";
import { achievements } from "@/data/achievements";
import { getLevelForXp } from "@/data/levels";
import type { AchievementDef, GamificationEvent } from "@/types/gamification";
import type { UserProgress, CardHistoryEntry } from "@/types/user";

const ALL_CARD_TYPES = [
  "clinical_case",
  "myth_or_fact",
  "build_scheme",
  "visual_quiz",
  "blitz_test",
  "fill_blank",
  "red_flags",
];

function checkAchievement(
  def: AchievementDef,
  progress: UserProgress
): boolean {
  const c = def.condition;
  switch (c.type) {
    case "streak_days":
      return progress.streakCurrent >= c.days;
    case "cards_total":
      return progress.cardsSeen >= c.count;
    case "cards_correct":
      return progress.cardsCorrect >= c.count;
    case "accuracy_percent":
      return (
        progress.cardsSeen >= c.minCards &&
        (progress.cardsCorrect / progress.cardsSeen) * 100 >= c.percent
      );
    case "perfect_blitz":
      return (progress.perfectBlitzCount || 0) >= c.count;
    case "all_types_answered":
      return ALL_CARD_TYPES.every(
        (t) => (progress.typeCounts?.[t] || 0) > 0
      );
    case "all_topics_answered": {
      const topics = progress.topicsAnswered || [];
      return topics.length >= 10;
    }
    case "daily_goal_streak":
      return (progress.dailyGoalStreak || 0) >= c.days;
    case "cards_in_day":
      return progress.todayCardsSeen >= c.count;
    case "specialties_tried": {
      const specialties = new Set<string>();
      for (const key of Object.keys(progress.cardHistory || {})) {
        const prefix = key.split("-").slice(0, 2).join("-");
        specialties.add(prefix);
      }
      return specialties.size >= c.count;
    }
    default:
      return false;
  }
}

export function useGamification() {
  const { progress, saveProgress } = useProgress();
  const { scheduleCard } = useReview();
  const { user } = useAuth();
  const { mode } = useMode();
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const recordAnswerWithGamification = useCallback(
    (
      isCorrect: boolean,
      cardId: string,
      cardType: string,
      topic: string,
      options?: { skipReviewSchedule?: boolean }
    ): GamificationEvent => {
      const prev = progressRef.current;
      const previousLevel = getLevelForXp(prev.xp || 0).level;

      // Update card history
      const history = prev.cardHistory || {};
      const entry: CardHistoryEntry = history[cardId] || {
        attempts: 0,
        correct: 0,
        lastSeen: "",
        consecutiveFails: 0,
      };
      const updatedEntry: CardHistoryEntry = {
        attempts: entry.attempts + 1,
        correct: entry.correct + (isCorrect ? 1 : 0),
        lastSeen: new Date().toISOString(),
        consecutiveFails: isCorrect ? 0 : entry.consecutiveFails + 1,
      };

      // Update type counts
      const typeCounts = { ...(prev.typeCounts || {}) };
      typeCounts[cardType] = (typeCounts[cardType] || 0) + 1;

      // Update topics answered
      const topicsAnswered = [...(prev.topicsAnswered || [])];
      if (!topicsAnswered.includes(topic)) {
        topicsAnswered.push(topic);
      }

      // Streak + date
      const today = new Date().toISOString().slice(0, 10);
      const isFirstToday = prev.lastActiveDate !== today;

      // XP: only for daily visit and 100 cards/day milestones
      let xpGained = 0;
      if (isFirstToday) {
        xpGained += 50; // Daily visit bonus
      }
      const newTodayCount = prev.todayCardsSeen + 1;
      if (newTodayCount === 100) {
        xpGained += 100; // 100 cards/day milestone
      }

      // Добавляем в очередь ошибок только при неверном ответе.
      // skipReviewSchedule=true используется на странице /mistakes — там ошибка
      // обнуляется через cardHistory.consecutiveFails и не должна возвращаться
      // через FSRS-расписание.
      if (!isCorrect && !options?.skipReviewSchedule) {
        const reviewSource: ReviewSource = mode === "feed" ? "feed" : "prep";
        scheduleCard(cardId, false, reviewSource);
      }

      // Build the FULL updated progress (single source of truth)
      const newStreak = isFirstToday
        ? prev.streakCurrent + 1
        : prev.streakCurrent || 1;

      // Perfect blitz tracking
      const newPerfectBlitz = (cardType === "blitz_test" && isCorrect)
        ? (prev.perfectBlitzCount || 0) + 1
        : (prev.perfectBlitzCount || 0);

      // Daily goal streak
      const dailyGoalReached = newTodayCount === prev.dailyGoal;
      let newDailyGoalStreak = prev.dailyGoalStreak || 0;
      if (dailyGoalReached) {
        newDailyGoalStreak += 1;
      }

      const updatedProgress: UserProgress = {
        ...prev,
        cardsSeen: prev.cardsSeen + 1,
        cardsCorrect: prev.cardsCorrect + (isCorrect ? 1 : 0),
        totalPoints: (prev.xp || 0) + xpGained,
        todayCardsSeen: newTodayCount,
        lastActiveDate: today,
        streakCurrent: newStreak,
        streakBest: Math.max(prev.streakBest, newStreak),
        xp: (prev.xp || 0) + xpGained,
        cardHistory: { ...history, [cardId]: updatedEntry },
        typeCounts,
        topicsAnswered,
        perfectBlitzCount: newPerfectBlitz,
        dailyGoalStreak: newDailyGoalStreak,
        dailyGoalStreakBest: Math.max(prev.dailyGoalStreakBest || 0, newDailyGoalStreak),
      };

      // Check achievements
      const newAchievements: AchievementDef[] = [];
      const unlocked = { ...(prev.unlockedAchievements || {}) };
      for (const def of achievements) {
        if (unlocked[def.id]) continue;
        if (checkAchievement(def, updatedProgress)) {
          unlocked[def.id] = new Date().toISOString();
          newAchievements.push(def);
          updatedProgress.xp += def.xpReward;
        }
      }

      const currentLevel = getLevelForXp(updatedProgress.xp).level;
      updatedProgress.level = currentLevel;
      updatedProgress.unlockedAchievements = unlocked;

      // Save everything in one call
      saveProgress(updatedProgress);

      // Log answer to Supabase
      if (cardId && user && navigator.onLine) {
        logAnswer(user.id, cardId, isCorrect).catch(console.error);
      }

      return {
        newAchievements,
        levelUp: currentLevel > previousLevel,
        previousLevel,
        currentLevel,
        xpGained,
        challengeCompleted: null,
        dailyGoalReached,
      };
    },
    [saveProgress, scheduleCard, user, mode]
  );

  const currentLevel = getLevelForXp(progress.xp || 0);

  return {
    progress,
    recordAnswerWithGamification,
    currentLevel,
    achievements: achievements.map((def) => ({
      ...def,
      unlocked: !!(progress.unlockedAchievements || {})[def.id],
      unlockedAt: (progress.unlockedAchievements || {})[def.id] || null,
    })),
  };
}
