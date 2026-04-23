/**
 * Клиент AI-pipeline API. Контракт 1:1 с `backend/app/models/ai.py`.
 */

import { backendFetch } from "@/lib/backendClient";

export type AiEntityType = "card" | "accreditation_question";
export type AiContentType = "hint" | "explain_short" | "explain_long";

export interface GenerationRequest {
  entity_type: AiEntityType;
  entity_id: string;
  content_type: AiContentType;
  prompt: string;
}

export interface BatchEnqueueRequest {
  items: GenerationRequest[];
}

export interface EnqueueResponse {
  job_id: string;
  enqueued: number;
}

export interface BatchStatus {
  job_id: string;
  status: "queued" | "started" | "finished" | "failed" | "deferred" | "scheduled" | "stopped";
  total: number;
  completed: number;
  failed: number;
  cost_usd: number;
}

export function enqueueBatch(
  payload: BatchEnqueueRequest,
  opts?: { signal?: AbortSignal },
): Promise<EnqueueResponse> {
  return backendFetch<EnqueueResponse>("/api/ai/enqueue", {
    method: "POST",
    body: payload,
    signal: opts?.signal,
  });
}

export function fetchJobStatus(
  jobId: string,
  opts?: { signal?: AbortSignal },
): Promise<BatchStatus> {
  return backendFetch<BatchStatus>(`/api/ai/status/${encodeURIComponent(jobId)}`, {
    signal: opts?.signal,
  });
}
