/**
 * IndexedDB-очередь ответов пользователя для офлайн-синхронизации.
 *
 * Контракт:
 * - `enqueueAnswer` добавляет ответ в очередь (безопасно из любого event handler).
 * - `flushQueue` пытается отправить всё в Python-бэкенд. Идемпотентность
 *    обеспечивает `idempotency_key`: повторные попытки не создают дубликаты.
 * - `clearSynced` удаляет подтверждённые записи.
 *
 * Service Worker + Background Sync добавляется в следующем PR: для MVP
 * достаточно ручного flush при `online`-событии и при открытии приложения.
 */

import type { AnswerRecord, BatchAnswersRequest, FsrsStateDelta } from "@/lib/backend/sync";
import { BackendSync, isBackendEnabled } from "@/lib/backend";

const DB_NAME = "umnyvrach-sync";
const DB_VERSION = 1;
const STORE_ANSWERS = "answers";
const STORE_FSRS = "fsrs_updates";

const BATCH_LIMIT = 200;

type QueuedAnswer = AnswerRecord & { _queued_at: number };
type QueuedFsrs = FsrsStateDelta & { _queued_at: number };

let cachedDb: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (cachedDb) return Promise.resolve(cachedDb);
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB недоступен в этом окружении"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ANSWERS)) {
        db.createObjectStore(STORE_ANSWERS, { keyPath: "idempotency_key" });
      }
      if (!db.objectStoreNames.contains(STORE_FSRS)) {
        db.createObjectStore(STORE_FSRS, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      cachedDb = request.result;
      resolve(cachedDb);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Только для тестов: закрыть и сбросить кеш. */
export function __resetSyncQueueForTests(): void {
  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
  }
}

function tx<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    const result = fn(objectStore);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function enqueueAnswer(answer: AnswerRecord): Promise<void> {
  const db = await openDb();
  const record: QueuedAnswer = { ...answer, _queued_at: Date.now() };
  await tx(db, STORE_ANSWERS, "readwrite", (store) => store.put(record));
}

export async function enqueueFsrsUpdate(update: FsrsStateDelta): Promise<void> {
  const db = await openDb();
  const key = `${update.source}::${update.entity_id}`;
  const record = { ...update, key, _queued_at: Date.now() };
  await tx(db, STORE_FSRS, "readwrite", (store) => store.put(record));
}

export async function getQueuedAnswers(limit = BATCH_LIMIT): Promise<QueuedAnswer[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ANSWERS, "readonly");
    const store = transaction.objectStore(STORE_ANSWERS);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = (request.result as QueuedAnswer[]) ?? [];
      resolve(all.slice(0, limit));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedFsrs(limit = BATCH_LIMIT): Promise<QueuedFsrs[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FSRS, "readonly");
    const store = transaction.objectStore(STORE_FSRS);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = (request.result as QueuedFsrs[]) ?? [];
      resolve(all.slice(0, limit));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearSyncedAnswers(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDb();
  await tx(db, STORE_ANSWERS, "readwrite", (store) => {
    for (const key of keys) store.delete(key);
  });
}

export async function clearSyncedFsrs(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDb();
  await tx(db, STORE_FSRS, "readwrite", (store) => {
    for (const key of keys) store.delete(key);
  });
}

export interface FlushResult {
  attempted: number;
  synced: number;
  duplicates: number;
  skipped: boolean;
  error?: string;
}

export async function flushQueue(): Promise<FlushResult> {
  if (!isBackendEnabled()) {
    return { attempted: 0, synced: 0, duplicates: 0, skipped: true };
  }

  const answers = await getQueuedAnswers();
  const fsrsRaw = await getQueuedFsrs();
  if (answers.length === 0 && fsrsRaw.length === 0) {
    return { attempted: 0, synced: 0, duplicates: 0, skipped: false };
  }

  const payload: BatchAnswersRequest = {
    answers: answers.map(({ _queued_at, ...a }) => {
      void _queued_at;
      return a;
    }),
    fsrs_updates: fsrsRaw.map((f) => {
      const { _queued_at, key, ...rest } = f as QueuedFsrs & { key: string };
      void _queued_at;
      void key;
      return rest;
    }),
  };

  try {
    const response = await BackendSync.submitBatch(payload);
    const allAnswerKeys = answers.map((a) => a.idempotency_key);
    const allFsrsKeys = fsrsRaw.map((f) => `${f.source}::${f.entity_id}`);
    await clearSyncedAnswers(allAnswerKeys);
    await clearSyncedFsrs(allFsrsKeys);
    return {
      attempted: answers.length + fsrsRaw.length,
      synced: response.answers_accepted + response.fsrs_upserts,
      duplicates: response.answers_duplicates,
      skipped: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      attempted: answers.length + fsrsRaw.length,
      synced: 0,
      duplicates: 0,
      skipped: false,
      error: message,
    };
  }
}

export async function queueSize(): Promise<{ answers: number; fsrs: number }> {
  const db = await openDb();
  const answers = await new Promise<number>((resolve, reject) => {
    const request = db.transaction(STORE_ANSWERS, "readonly").objectStore(STORE_ANSWERS).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const fsrs = await new Promise<number>((resolve, reject) => {
    const request = db.transaction(STORE_FSRS, "readonly").objectStore(STORE_FSRS).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return { answers, fsrs };
}
