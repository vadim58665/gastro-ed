"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { WeekDay } from "@/components/ui/StreakHero";

export interface ProfilePageData {
  loading: boolean;
  /** Активность за последние 7 дней (пн-вс) для sparkline */
  weekPattern: WeekDay[];
  /** Сколько карточек к повтору сейчас (FSRS due) */
  reviewsDue: number;
  /** Точность за текущую неделю минус за прошлую (дельта в % пунктах) */
  accuracyTrend: number | null;
  /** Дней в продукте от created_at */
  daysInProduct: number;
  /** Кол-во уникальных card_id в user_answers */
  uniqueTopicsCount: number;
  /** Всего ответов за всё время */
  totalAnswers: number;
  /** Сколько AI-подсказок использовано в этом месяце */
  hintsThisMonth: number;
  /** Сколько карточек отвечено сегодня */
  cardsToday: number;
}

const EMPTY: ProfilePageData = {
  loading: true,
  weekPattern: [],
  reviewsDue: 0,
  accuracyTrend: null,
  daysInProduct: 0,
  uniqueTopicsCount: 0,
  totalAnswers: 0,
  hintsThisMonth: 0,
  cardsToday: 0,
};

const WEEK_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** JS Date.getDay() returns 0 for Sunday - normalize to Mon=0, Sun=6 */
function getDayIndex(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function startOfWeek(d: Date): Date {
  const idx = getDayIndex(d);
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - idx);
  return result;
}

function startOfMonth(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  result.setDate(1);
  return result;
}

export function useProfilePageData(): ProfilePageData {
  const { user } = useAuth();
  const [data, setData] = useState<ProfilePageData>(EMPTY);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) {
      setData({ ...EMPTY, loading: false });
      return;
    }

    let cancelled = false;
    const supabase = getSupabase();
    const userId = user.id;

    const today = new Date();
    const weekStart = startOfWeek(today);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const monthStart = startOfMonth(today);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    async function load() {
      try {
        const [
          answersThisWeek,
          answersLastWeek,
          totalAnswersRow,
          uniqueCards,
          reviewsDueRow,
          hintsRow,
          todayCards,
        ] = await Promise.all([
          // Answers this week (for sparkline + accuracy)
          supabase
            .from("user_answers")
            .select("answered_at, is_correct")
            .eq("user_id", userId)
            .gte("answered_at", weekStart.toISOString()),
          // Answers last week (for accuracy trend)
          supabase
            .from("user_answers")
            .select("is_correct")
            .eq("user_id", userId)
            .gte("answered_at", lastWeekStart.toISOString())
            .lt("answered_at", weekStart.toISOString()),
          // Total answers ever
          supabase
            .from("user_answers")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          // All card_ids (for unique count)
          supabase
            .from("user_answers")
            .select("card_id")
            .eq("user_id", userId),
          // Reviews due now
          supabase
            .from("review_cards")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .lte("due", new Date().toISOString()),
          // Hints this month
          supabase
            .from("ai_usage_log")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", monthStart.toISOString()),
          // Cards answered today
          supabase
            .from("user_answers")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("answered_at", todayStart.toISOString()),
        ]);

        if (cancelled) return;

        // Weekly pattern
        const thisWeekAnswers =
          (answersThisWeek.data as Array<{ answered_at: string; is_correct: boolean }> | null) ?? [];
        const dayCounts = new Array(7).fill(0) as number[];
        for (const row of thisWeekAnswers) {
          const idx = getDayIndex(new Date(row.answered_at));
          dayCounts[idx]++;
        }
        const maxActivity = Math.max(1, ...dayCounts);
        const todayIdx = getDayIndex(today);
        const weekPattern: WeekDay[] = WEEK_LABELS.map((label, i) => ({
          label,
          activity: dayCounts[i] / maxActivity,
          isToday: i === todayIdx,
        }));

        // Accuracy trend
        const thisCorrect = thisWeekAnswers.filter((r) => r.is_correct).length;
        const thisTotal = thisWeekAnswers.length;
        const thisAcc = thisTotal > 0 ? (thisCorrect / thisTotal) * 100 : 0;
        const lastWeekAnswers =
          (answersLastWeek.data as Array<{ is_correct: boolean }> | null) ?? [];
        const lastCorrect = lastWeekAnswers.filter((r) => r.is_correct).length;
        const lastTotal = lastWeekAnswers.length;
        const lastAcc = lastTotal > 0 ? (lastCorrect / lastTotal) * 100 : 0;
        const accuracyTrend =
          lastTotal > 0 && thisTotal > 0
            ? Math.round(thisAcc - lastAcc)
            : null;

        // Unique topics count
        const allCardIds =
          (uniqueCards.data as Array<{ card_id: string }> | null) ?? [];
        const uniqueTopicsCount = new Set(allCardIds.map((r) => r.card_id)).size;

        // Days in product - user.created_at is a standard Supabase User field (string)
        const createdAt = user.created_at
          ? new Date(user.created_at)
          : today;
        const daysInProduct = Math.max(1, daysBetween(createdAt, today));

        setData({
          loading: false,
          weekPattern,
          reviewsDue: reviewsDueRow.count ?? 0,
          accuracyTrend,
          daysInProduct,
          uniqueTopicsCount,
          totalAnswers: totalAnswersRow.count ?? 0,
          hintsThisMonth: hintsRow.count ?? 0,
          cardsToday: todayCards.count ?? 0,
        });
      } catch (err) {
        console.warn("[useProfilePageData] failed:", err);
        if (!cancelled) {
          setData({ ...EMPTY, loading: false });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.created_at]);

  return data;
}
