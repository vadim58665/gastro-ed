/**
 * Клиент analytics-API. Контракт 1:1 с `backend/app/models/analytics.py`.
 */

import { backendFetch } from "@/lib/backendClient";

export interface MistakeRow {
  entity_type: "card" | "accreditation_question";
  entity_id: string;
  wrong_count: number;
  total_attempts: number;
  last_wrong_at_ms: number;
  accuracy: number;
}

export interface MistakesResponse {
  rows: MistakeRow[];
  total: number;
  period_ms: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  nickname: string | null;
  total_points: number;
  max_points: number;
  completed_at_ms: number;
}

export interface LeaderboardResponse {
  case_date: string;
  rows: LeaderboardEntry[];
  total: number;
}

export interface DailyStat {
  date: string;
  correct: number;
  wrong: number;
  total: number;
  accuracy: number;
}

export interface MonthlyStatsResponse {
  year: number;
  month: number;
  days: DailyStat[];
  total_answers: number;
  total_correct: number;
  average_accuracy: number;
}

export interface MistakesQuery {
  entity_type?: "card" | "accreditation_question";
  period_days?: number;
  limit?: number;
}

export function fetchMistakes(
  query: MistakesQuery = {},
  opts?: { signal?: AbortSignal },
): Promise<MistakesResponse> {
  return backendFetch<MistakesResponse>("/api/analytics/mistakes", {
    query: { ...query },
    signal: opts?.signal,
  });
}

export function fetchDailyCaseLeaderboard(
  caseDate: string,
  limit = 50,
  opts?: { signal?: AbortSignal },
): Promise<LeaderboardResponse> {
  return backendFetch<LeaderboardResponse>("/api/analytics/leaderboard/daily-case", {
    query: { case_date: caseDate, limit },
    signal: opts?.signal,
  });
}

export function fetchMonthlyStats(
  year: number,
  month: number,
  opts?: { signal?: AbortSignal },
): Promise<MonthlyStatsResponse> {
  return backendFetch<MonthlyStatsResponse>("/api/analytics/stats/monthly", {
    query: { year, month },
    signal: opts?.signal,
  });
}
