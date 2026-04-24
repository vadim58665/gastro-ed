/**
 * Одноразовая миграция FSRS-состояния из localStorage в Supabase при первом
 * входе пользователя после деплоя Python-бэкенда.
 *
 * Что мигрируем:
 * - `sd-review` (массив ReviewCard с FSRS state) → POST /api/answers/batch
 *   в виде `fsrs_updates[]`. Это позволяет пользователю видеть свой прогресс
 *   по карточкам с любого устройства после миграции.
 *
 * Что НЕ мигрируем и почему:
 * - `sd-progress` (useProgress): хранит агрегаты (streak, xp, totalPoints),
 *   а не историю ответов. Восстанавливать синтетические ответы с
 *   выдуманными timestamp'ами вреднее чем оставить пустую историю.
 * - `sd-accreditation.questionStats` / `mistakes[]`: хранит только
 *   агрегаты (attempts, wrong, lastSeen), не полную историю. Аналогично.
 *
 * Ключевые свойства:
 * - **Идемпотентность**: UPSERT по (user_id, entity_id, source) на сервере.
 * - **Один раз на устройство**: флаг `umnyvrach-bulk-import-done-v2`.
 *   Версия v2 поставлена из-за смены стратегии по сравнению с первичным
 *   вариантом (ранее пытались импортировать синтетические ответы).
 */

import type { BatchAnswersRequest, FsrsStateDelta, FsrsSource } from "@/lib/backend/sync";
import { BackendSync, isBackendEnabled } from "@/lib/backend";

const BATCH_SIZE = 200;
const DONE_FLAG = "umnyvrach-bulk-import-done-v2";

interface LegacyFsrsCard {
  cardId: string;
  fsrs?: {
    stability?: number;
    difficulty?: number;
    due?: string | number | Date;
    last_review?: string | number | Date;
    reps?: number;
    lapses?: number;
    state?: number;
    elapsed_days?: number;
    scheduled_days?: number;
  };
  source?: string;
}

export interface BulkImportResult {
  skipped: boolean;
  reason?: "already_done" | "backend_disabled" | "no_data";
  fsrs_uploaded: number;
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
    // Safari private mode и прочие случаи - игнорируем, не критично.
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

function toMillis(value: string | number | Date | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? t : null;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSource(raw: string | undefined): FsrsSource {
  return raw === "prep" ? "prep" : "feed";
}

function collectFsrsUpdates(): FsrsStateDelta[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem("sd-review");
  const cards = safeParse<LegacyFsrsCard[]>(raw);
  if (!Array.isArray(cards)) return [];

  const now = Date.now();
  const deltas: FsrsStateDelta[] = [];
  for (const card of cards) {
    if (!card?.cardId || !card.fsrs) continue;
    const lastReviewMs = toMillis(card.fsrs.last_review);
    deltas.push({
      entity_id: String(card.cardId),
      source: normalizeSource(card.source),
      state: {
        stability: card.fsrs.stability ?? 0,
        difficulty: card.fsrs.difficulty ?? 0,
        due: toMillis(card.fsrs.due),
        last_review: lastReviewMs,
        reps: card.fsrs.reps ?? 0,
        lapses: card.fsrs.lapses ?? 0,
        state: card.fsrs.state ?? 0,
        elapsed_days: card.fsrs.elapsed_days,
        scheduled_days: card.fsrs.scheduled_days,
      },
      updated_at_ms: lastReviewMs ?? now,
    });
  }
  return deltas;
}

export async function bulkImportLocalProgress(
  options: { force?: boolean } = {},
): Promise<BulkImportResult> {
  if (!options.force && alreadyDone()) {
    return {
      skipped: true,
      reason: "already_done",
      fsrs_uploaded: 0,
      batches_sent: 0,
      errors: [],
    };
  }
  if (!isBackendEnabled()) {
    return {
      skipped: true,
      reason: "backend_disabled",
      fsrs_uploaded: 0,
      batches_sent: 0,
      errors: [],
    };
  }

  const updates = collectFsrsUpdates();
  if (updates.length === 0) {
    markDone();
    return {
      skipped: true,
      reason: "no_data",
      fsrs_uploaded: 0,
      batches_sent: 0,
      errors: [],
    };
  }

  let uploaded = 0;
  let batches = 0;
  const errors: string[] = [];

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batchSlice = updates.slice(i, i + BATCH_SIZE);
    const payload: BatchAnswersRequest = {
      answers: [],
      fsrs_updates: batchSlice,
    };
    try {
      const response = await BackendSync.submitBatch(payload);
      uploaded += response.fsrs_upserts;
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
    fsrs_uploaded: uploaded,
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
