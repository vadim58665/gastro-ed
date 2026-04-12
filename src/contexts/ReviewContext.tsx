"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
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
  } catch (e) {
    console.warn("Failed to load review cards:", e);
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

interface ReviewContextValue {
  reviewCards: ReviewCard[];
  scheduleCard: (cardId: string, isCorrect: boolean, source?: ReviewSource) => void;
  reviewCard: (cardId: string, grade: Grade) => void;
  getDueCards: (source?: ReviewSource) => string[];
  getDueCount: (source?: ReviewSource) => number;
  dueCount: number;
  getNextDueDate: (source?: ReviewSource) => Date | null;
  getCardStats: (source?: ReviewSource) => { mastered: number; learning: number; total: number };
  getReviewCard: (cardId: string) => ReviewCard | undefined;
}

const ReviewContext = createContext<ReviewContextValue>({
  reviewCards: [],
  scheduleCard: () => {},
  reviewCard: () => {},
  getDueCards: () => [],
  getDueCount: () => 0,
  dueCount: 0,
  getNextDueDate: () => null,
  getCardStats: () => ({ mastered: 0, learning: 0, total: 0 }),
  getReviewCard: () => undefined,
});

export function ReviewProvider({ children }: { children: ReactNode }) {
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

  const scheduleCard = useCallback(
    (cardId: string, isCorrect: boolean, source: ReviewSource = "feed") => {
      setReviewCards((prev) => {
        const now = new Date();
        const existing = prev.find((rc) => rc.cardId === cardId);
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
          ? prev.map((rc) =>
              rc.cardId === cardId ? { cardId, fsrs: updatedCard, source: rc.source || source } : rc
            )
          : [...prev, { cardId, fsrs: updatedCard, source }];

        saveReviewCards(updated);
        syncToSupabase(updated);
        return updated;
      });
    },
    [syncToSupabase]
  );

  const reviewCard = useCallback(
    (cardId: string, grade: Grade) => {
      setReviewCards((prev) => {
        const now = new Date();
        const existing = prev.find((rc) => rc.cardId === cardId);
        if (!existing) return prev;

        let updated: ReviewCard[];
        if (grade === Rating.Good) {
          updated = prev.filter((rc) => rc.cardId !== cardId);
        } else {
          const result = f.next(existing.fsrs, now, grade);
          const card = { ...result.card, due: now };
          updated = prev.map((rc) =>
            rc.cardId === cardId ? { cardId, fsrs: card, source: rc.source } : rc
          );
        }

        saveReviewCards(updated);
        syncToSupabase(updated);
        return updated;
      });
    },
    [syncToSupabase]
  );

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

  const getDueCount = useCallback((source?: ReviewSource): number => {
    const now = new Date();
    return reviewCards
      .filter((rc) => new Date(rc.fsrs.due) <= now)
      .filter((rc) => !source || (rc.source || "feed") === source)
      .length;
  }, [reviewCards]);

  const dueCount = reviewCards.filter(
    (rc) => new Date(rc.fsrs.due) <= new Date()
  ).length;

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

  const getReviewCard = useCallback((cardId: string): ReviewCard | undefined => {
    return reviewCards.find((rc) => rc.cardId === cardId);
  }, [reviewCards]);

  return (
    <ReviewContext.Provider
      value={{
        reviewCards,
        scheduleCard,
        reviewCard,
        getDueCards,
        getDueCount,
        dueCount,
        getNextDueDate,
        getCardStats,
        getReviewCard,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  return useContext(ReviewContext);
}
