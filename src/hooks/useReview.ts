"use client";

import { useState, useCallback, useEffect } from "react";
import { fsrs, createEmptyCard, Rating, State } from "ts-fsrs";
import type { Card as FSRSCard, Grade } from "ts-fsrs";
import { useAuth } from "@/contexts/AuthContext";
import { pushReviewCards } from "@/lib/supabase/sync";

const STORAGE_KEY = "gastro-ed-review";

export interface ReviewCard {
  cardId: string;
  fsrs: FSRSCard;
}

const f = fsrs({
  request_retention: 0.85,
  maximum_interval: 365,
  enable_fuzz: true,
});

function loadReviewCards(): ReviewCard[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as ReviewCard[];
    // Restore Date objects from JSON
    return parsed.map((rc) => ({
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
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

  // Schedule a card for review (called after answering in feed)
  const scheduleCard = useCallback(
    (cardId: string, isCorrect: boolean) => {
      const now = new Date();
      const existing = reviewCards.find((rc) => rc.cardId === cardId);
      const grade: Grade = isCorrect ? Rating.Good : Rating.Again;

      let updatedCard: FSRSCard;

      if (existing) {
        const result = f.next(existing.fsrs, now, grade);
        updatedCard = result.card;
      } else {
        const emptyCard = createEmptyCard(now);
        const result = f.next(emptyCard, now, grade);
        updatedCard = result.card;
      }

      const updated = existing
        ? reviewCards.map((rc) =>
            rc.cardId === cardId ? { cardId, fsrs: updatedCard } : rc
          )
        : [...reviewCards, { cardId, fsrs: updatedCard }];

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
      const updated = reviewCards.map((rc) =>
        rc.cardId === cardId ? { cardId, fsrs: result.card } : rc
      );

      setReviewCards(updated);
      saveReviewCards(updated);
      syncToSupabase(updated);
    },
    [reviewCards, syncToSupabase]
  );

  // Get cards that are due for review
  const getDueCards = useCallback((): string[] => {
    const now = new Date();
    return reviewCards
      .filter((rc) => new Date(rc.fsrs.due) <= now)
      .sort(
        (a, b) =>
          new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime()
      )
      .map((rc) => rc.cardId);
  }, [reviewCards]);

  // Count of due cards
  const dueCount = reviewCards.filter(
    (rc) => new Date(rc.fsrs.due) <= new Date()
  ).length;

  return { scheduleCard, reviewCard, getDueCards, dueCount, reviewCards };
}
