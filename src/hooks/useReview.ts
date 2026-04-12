"use client";

import { useState, useCallback, useEffect } from "react";
import { fsrs, createEmptyCard, Rating, State } from "ts-fsrs";
import type { Card as FSRSCard, Grade } from "ts-fsrs";
import { useAuth } from "@/contexts/AuthContext";
import { pushReviewCards } from "@/lib/supabase/sync";
import { demoCards } from "@/data/cards";

const STORAGE_KEY = "gastro-ed-review";

export type ReviewSource = "feed" | "prep";

export interface ReviewCard {
  cardId: string;
  fsrs: FSRSCard;
  source?: ReviewSource;
}

const f = fsrs({
  request_retention: 0.85,
  maximum_interval: 365,
  enable_fuzz: true,
});

const validCardIds = new Set(demoCards.map((c) => c.id));

function loadReviewCards(): ReviewCard[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as ReviewCard[];
    // Restore Date objects from JSON + remove orphaned cards
    return parsed
      .filter((rc) => validCardIds.has(rc.cardId))
      .map((rc) => ({
        ...rc,
        fsrs: {
          ...rc.fsrs,
          due: new Date(rc.fsrs.due),
          last_review: rc.fsrs.last_review
            ? new Date(rc.fsrs.last_review)
            : undefined,
        },
      }));
  } catch {
    return [];
  }
}

function saveReviewCards(cards: ReviewCard[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error("Failed to save review cards to localStorage", e);
  }
}

export function useReview() {
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    setReviewCards(loadReviewCards());
  }, []);

  const syncToSupabase = useCallback(
    (cards: ReviewCard[]) => {
      if (user && navigator.onLine) {
        pushReviewCards(user.id, cards).catch(console.error);
      }
    },
    [user]
  );

  // Schedule a card for review (called after answering in feed or prep)
  const scheduleCard = useCallback(
    (cardId: string, isCorrect: boolean, source: ReviewSource = "feed") => {
      const now = new Date();
      const existing = reviewCards.find((rc) => rc.cardId === cardId);
      const grade: Grade = isCorrect ? Rating.Good : Rating.Again;

      let updatedCard: FSRSCard;

      if (existing) {
        const result = f.next(existing.fsrs, now, grade);
        updatedCard = grade === Rating.Again ? { ...result.card, due: now } : result.card;
      } else {
        const emptyCard = createEmptyCard(now);
        const result = f.next(emptyCard, now, grade);
        updatedCard = grade === Rating.Again ? { ...result.card, due: now } : result.card;
      }

      const updated = existing
        ? reviewCards.map((rc) =>
            rc.cardId === cardId ? { cardId, fsrs: updatedCard, source: rc.source || source } : rc
          )
        : [...reviewCards, { cardId, fsrs: updatedCard, source }];

      setReviewCards(updated);
      saveReviewCards(updated);
      syncToSupabase(updated);
    },
    [reviewCards, syncToSupabase]
  );

  // Review a card (from review screen) with 4 grades
  const reviewCard = useCallback(
    (cardId: string, grade: Grade) => {
      const now = new Date();
      const existing = reviewCards.find((rc) => rc.cardId === cardId);
      if (!existing) return;

      const result = f.next(existing.fsrs, now, grade);
      const updatedFsrs = grade === Rating.Again
        ? { ...result.card, due: now }
        : result.card;

      const updated = reviewCards.map((rc) =>
        rc.cardId === cardId ? { cardId, fsrs: updatedFsrs, source: rc.source } : rc
      );

      setReviewCards(updated);
      saveReviewCards(updated);
      syncToSupabase(updated);
    },
    [reviewCards, syncToSupabase]
  );

  // Get cards that are due for review, optionally filtered by source
  const getDueCards = useCallback((source?: ReviewSource): string[] => {
    const now = new Date();
    return reviewCards
      .filter((rc) => new Date(rc.fsrs.due) <= now)
      .filter((rc) => !source || (rc.source || "feed") === source)
      .sort(
        (a, b) =>
          new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime()
      )
      .map((rc) => rc.cardId);
  }, [reviewCards]);

  // Count of due cards by source
  const getDueCount = useCallback((source?: ReviewSource): number => {
    const now = new Date();
    return reviewCards
      .filter((rc) => new Date(rc.fsrs.due) <= now)
      .filter((rc) => !source || (rc.source || "feed") === source)
      .length;
  }, [reviewCards]);

  // Total due count (all sources)
  const dueCount = reviewCards.filter(
    (rc) => new Date(rc.fsrs.due) <= new Date()
  ).length;

  // Next due date among cards that are NOT yet due
  const getNextDueDate = useCallback((source?: ReviewSource): Date | null => {
    const now = new Date();
    const futureDue = reviewCards
      .filter((rc) => new Date(rc.fsrs.due) > now)
      .filter((rc) => !source || (rc.source || "feed") === source);
    if (futureDue.length === 0) return null;
    return futureDue.reduce((earliest, rc) => {
      const d = new Date(rc.fsrs.due);
      return d < earliest ? d : earliest;
    }, new Date(futureDue[0].fsrs.due));
  }, [reviewCards]);

  // Stats: mastered / learning / problem counts
  const getCardStats = useCallback((source?: ReviewSource) => {
    const filtered = reviewCards
      .filter((rc) => !source || (rc.source || "feed") === source);
    let mastered = 0;
    let learning = 0;
    for (const rc of filtered) {
      if (rc.fsrs.state === State.Review && rc.fsrs.stability > 10) {
        mastered++;
      } else {
        learning++;
      }
    }
    return { mastered, learning, total: filtered.length };
  }, [reviewCards]);

  // Get single review card's FSRS data
  const getReviewCard = useCallback((cardId: string): ReviewCard | undefined => {
    return reviewCards.find((rc) => rc.cardId === cardId);
  }, [reviewCards]);

  return { scheduleCard, reviewCard, getDueCards, getDueCount, dueCount, reviewCards, getNextDueDate, getCardStats, getReviewCard };
}
