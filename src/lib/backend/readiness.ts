/**
 * Клиент readiness-API. Контракт 1:1 с `backend/app/models/readiness.py`.
 */

import { backendFetch } from "@/lib/backendClient";

export interface QuestionStatsServer {
  attempts: number;
  wrong: number;
  last_seen_ms: number;
  was_ever_correct: boolean;
  last_answer_correct: boolean;
  correct_streak: number;
}

export interface QuestionInputServer {
  question_id: string;
  block_number: number;
  stats: QuestionStatsServer | null;
}

export interface ComputeReadinessPayload {
  specialty: string;
  questions: QuestionInputServer[];
  now_ms?: number;
}

export interface BlockReport {
  block_number: number;
  level: "not_started" | "started" | "weak" | "ready" | "strong";
  average_strength: number;
  coverage: number;
  size: number;
  weak_question_ids: string[];
}

export interface ReadinessReport {
  specialty: string;
  total_questions: number;
  exam_readiness: number;
  exam_readiness_percent: number;
  coverage: number;
  average_strength: number;
  weak_count: number;
  blocks_ready: number;
  blocks: BlockReport[];
  computed_at_ms: number;
}

export function computeReadinessRemote(
  payload: ComputeReadinessPayload,
  opts?: { signal?: AbortSignal },
): Promise<ReadinessReport> {
  return backendFetch<ReadinessReport>("/api/readiness/compute", {
    method: "POST",
    body: payload,
    signal: opts?.signal,
  });
}
