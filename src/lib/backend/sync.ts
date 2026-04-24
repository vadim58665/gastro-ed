/**
 * Клиент progress-sync API. Контракт 1:1 с `backend/app/models/sync.py`.
 */

import { backendFetch } from "@/lib/backendClient";

export type EntityType = "card" | "accreditation_question";
export type AnswerSource = "feed" | "prep" | "exam" | "browse";
export type FsrsSource = "feed" | "prep";

export interface AnswerRecord {
  entity_type: EntityType;
  entity_id: string;
  is_correct: boolean;
  answered_at_ms: number;
  time_spent_ms?: number;
  source: AnswerSource;
  idempotency_key: string;
}

export interface FsrsStateDelta {
  entity_id: string;
  source: FsrsSource;
  state: Record<string, unknown>;
  updated_at_ms: number;
}

export interface BatchAnswersRequest {
  answers: AnswerRecord[];
  fsrs_updates: FsrsStateDelta[];
}

export interface BatchAnswersResponse {
  answers_accepted: number;
  answers_duplicates: number;
  fsrs_upserts: number;
}

export interface FsrsStateRow {
  entity_id: string;
  source: FsrsSource;
  state: Record<string, unknown>;
  updated_at_ms: number;
}

export interface FsrsStateResponse {
  rows: FsrsStateRow[];
  total: number;
}

export interface AnswerRow {
  entity_type: EntityType;
  entity_id: string;
  is_correct: boolean;
  answered_at_ms: number;
  time_spent_ms: number | null;
  source: AnswerSource;
}

export interface AnswersSinceResponse {
  rows: AnswerRow[];
  total: number;
}

export function submitBatch(
  payload: BatchAnswersRequest,
  opts?: { signal?: AbortSignal },
): Promise<BatchAnswersResponse> {
  return backendFetch<BatchAnswersResponse>("/api/answers/batch", {
    method: "POST",
    body: payload,
    signal: opts?.signal,
  });
}

export function fetchFsrsState(
  query: { since?: number; source?: FsrsSource } = {},
  opts?: { signal?: AbortSignal },
): Promise<FsrsStateResponse> {
  return backendFetch<FsrsStateResponse>("/api/fsrs/state", {
    query,
    signal: opts?.signal,
  });
}

export function fetchAnswersSince(
  query: { since?: number; limit?: number } = {},
  opts?: { signal?: AbortSignal },
): Promise<AnswersSinceResponse> {
  return backendFetch<AnswersSinceResponse>("/api/answers/since", {
    query,
    signal: opts?.signal,
  });
}
