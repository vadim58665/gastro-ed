/**
 * Одноразовый импорт прогресса из localStorage в Supabase при первом входе
 * пользователя после деплоя Python-бэкенда.
 *
 * Ключевые свойства:
 * - **Идемпотентность**: каждая запись получает стабильный `idempotency_key`
 *   в формате `local:<entity_id>:<answered_at_ms>`. Повторный вызов безопасен.
 * - **Один раз на пользователя**: флаг `umnyvrach-bulk-import-done-v1` в
 *   localStorage отмечает что импорт завершён.
 * - **Batch**: отправляется пачками по 200, чтобы не упереться в лимит API.
 * - **Resumable**: прерванный импорт можно запустить снова; дубликаты
 *   игнорируются на уровне БД.
 */

import type { AnswerRecord, AnswerSource, EntityType } from "@/lib/backend/sync";
import { BackendSync, isBackendEnabled } from "@/lib/backend";

const BATCH_SIZE = 200;
const DONE_FLAG = "umnyvrach-bulk-import-done-v1";

interface LegacyCardHistoryEntry {
  cardId: string;
  isCorrect: boolean;
  timestamp: number;
  source?: "feed" | "prep" | "exam" | "browse";
  timeSpentMs?: number;
}

interface LegacyAccreditationAttempt {
  questionId: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface BulkImportResult {
  skipped: boolean;
  reason?: "already_done" | "backend_disabled" | "no_data";
  total_uploaded: number;
  total_duplicates: number;
  batches_sent: number;
  errors: string[];
}

function alreadyDone(): boolean {
  try {
    return localStorage.getItem(DONE_FLAG) === "1";
  } catch {
    return false;
  }
}

function markDone(): void {
  try {
    localStorage.setItem(DONE_FLAG, "1");
  } catch {
    // ignore (Safari private mode)
  }
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function collectCardAnswers(): AnswerRecord[] {
  const raw = (typeof localStorage !== "undefined" && localStorage.getItem("sd-progress")) || null;
  const progress = safeParse<{ cardHistory?: LegacyCardHistoryEntry[] }>(raw);
  const history = progress?.cardHistory ?? [];
  return history.map<AnswerRecord>((entry) => ({
    entity_type: "card",
    entity_id: entry.cardId,
    is_correct: entry.isCorrect,
    answered_at_ms: entry.timestamp,
    time_spent_ms: entry.timeSpentMs,
    source: (entry.source ?? "feed") as AnswerSource,
    idempotency_key: `local:card:${entry.cardId}:${entry.timestamp}`,
  }));
}

function collectAccreditationAnswers(): AnswerRecord[] {
  const raw = (typeof localStorage !== "undefined" && localStorage.getItem("sd-accreditation")) || null;
  const rootRecord = safeParse<Record<string, { mistakes?: LegacyAccreditationAttempt[] }>>(raw);
  if (!rootRecord) return [];
  const answers: AnswerRecord[] = [];
  for (const [, data] of Object.entries(rootRecord)) {
    const mistakes = data?.mistakes ?? [];
    for (const attempt of mistakes) {
      const ts =
        typeof (attempt as LegacyAccreditationAttempt).timestamp === "number"
          ? (attempt as LegacyAccreditationAttempt).timestamp
          : 0;
      if (!ts) continue;
      answers.push({
        entity_type: "accreditation_question",
        entity_id: (attempt as LegacyAccreditationAttempt).questionId,
        is_correct: (attempt as LegacyAccreditationAttempt).isCorrect,
        answered_at_ms: ts,
        source: "prep",
        idempotency_key: `local:accred:${(attempt as LegacyAccreditationAttempt).questionId}:${ts}`,
      });
    }
  }
  return answers;
}

type EntityTypeLiteral = EntityType;
void (null as EntityTypeLiteral | null); // reference to avoid unused-import

export async function bulkImportLocalProgress(
  options: { force?: boolean } = {},
): Promise<BulkImportResult> {
  if (!options.force && alreadyDone()) {
    return {
      skipped: true,
      reason: "already_done",
      total_uploaded: 0,
      total_duplicates: 0,
      batches_sent: 0,
      errors: [],
    };
  }
  if (!isBackendEnabled()) {
    return {
      skipped: true,
      reason: "backend_disabled",
      total_uploaded: 0,
      total_duplicates: 0,
      batches_sent: 0,
      errors: [],
    };
  }

  const all = [...collectCardAnswers(), ...collectAccreditationAnswers()];
  if (all.length === 0) {
    markDone();
    return {
      skipped: true,
      reason: "no_data",
      total_uploaded: 0,
      total_duplicates: 0,
      batches_sent: 0,
      errors: [],
    };
  }

  let uploaded = 0;
  let duplicates = 0;
  let batches = 0;
  const errors: string[] = [];

  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    const batch = all.slice(i, i + BATCH_SIZE);
    try {
      const response = await BackendSync.submitBatch({
        answers: batch,
        fsrs_updates: [],
      });
      uploaded += response.answers_accepted;
      duplicates += response.answers_duplicates;
      batches += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`batch ${batches + 1}: ${message}`);
      break;
    }
  }

  if (errors.length === 0) {
    markDone();
  }

  return {
    skipped: false,
    total_uploaded: uploaded,
    total_duplicates: duplicates,
    batches_sent: batches,
    errors,
  };
}

export function resetBulkImportFlag(): void {
  try {
    localStorage.removeItem(DONE_FLAG);
  } catch {
    // ignore
  }
}
