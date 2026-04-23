"use client";

/**
 * React-хук автосинхронизации с Python-бэкендом.
 *
 * Что делает:
 * 1. Первый вход залогиненного пользователя → запускает одноразовый
 *    `bulkImportLocalProgress()`, переливая весь localStorage в Supabase.
 * 2. Периодически (и на событие `online`) → `flushQueue()` отправляет
 *    всё что пока застряло в IndexedDB-очереди (если она в будущем будет
 *    заполняться из хуков).
 *
 * Бездействует пока `NEXT_PUBLIC_BACKEND_URL` не задан. Никогда не бросает
 * наружу - только логирует warnings в console.
 *
 * Подключается в одном месте (например, в AuthContext или layout.tsx) -
 * остальное приложение ничего не замечает.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { isBackendEnabled } from "@/lib/backendClient";
import { bulkImportLocalProgress, type BulkImportResult } from "@/lib/migration/bulkImport";
import { flushQueue, type FlushResult, queueSize } from "@/lib/syncQueue";

export interface BackendSyncState {
  enabled: boolean;
  syncing: boolean;
  lastFlushAt: number | null;
  lastError: string | null;
  pendingAnswers: number;
  pendingFsrs: number;
  bulkImportResult: BulkImportResult | null;
  /** Ручной запуск flush (например, из отладочной панели). */
  sync: () => Promise<FlushResult | null>;
}

export interface UseBackendSyncOptions {
  /** Запускать bulk-import при изменении userId на не-null. По умолчанию true. */
  runBulkImport?: boolean;
  /** Как часто рефрешить счётчики очереди в фоне, мс. По умолчанию 30 сек. */
  pollIntervalMs?: number;
}

export function useBackendSync(
  userId: string | null,
  options: UseBackendSyncOptions = {},
): BackendSyncState {
  const { runBulkImport = true, pollIntervalMs = 30_000 } = options;

  const [syncing, setSyncing] = useState(false);
  const [lastFlushAt, setLastFlushAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState(0);
  const [pendingFsrs, setPendingFsrs] = useState(0);
  const [bulkImportResult, setBulkImportResult] = useState<BulkImportResult | null>(null);

  const enabled = isBackendEnabled();
  const inFlight = useRef(false);

  const refreshCounts = useCallback(async () => {
    if (!enabled) return;
    try {
      const size = await queueSize();
      setPendingAnswers(size.answers);
      setPendingFsrs(size.fsrs);
    } catch {
      // тихо игнорируем, счётчики необязательны
    }
  }, [enabled]);

  const sync = useCallback(async (): Promise<FlushResult | null> => {
    if (!enabled || inFlight.current) return null;
    inFlight.current = true;
    setSyncing(true);
    try {
      const result = await flushQueue();
      setLastFlushAt(Date.now());
      if (result.error) {
        setLastError(result.error);
      } else {
        setLastError(null);
      }
      await refreshCounts();
      return result;
    } finally {
      inFlight.current = false;
      setSyncing(false);
    }
  }, [enabled, refreshCounts]);

  // Один раз при получении userId - bulk-import из localStorage
  useEffect(() => {
    if (!enabled || !userId || !runBulkImport) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await bulkImportLocalProgress();
        if (!cancelled) setBulkImportResult(result);
      } catch (err) {
        if (!cancelled) {
          setLastError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, userId, runBulkImport]);

  // Авто-flush на online-событие + периодический poll
  useEffect(() => {
    if (!enabled || !userId) return;

    const onOnline = () => {
      void sync();
    };
    window.addEventListener("online", onOnline);

    void refreshCounts();
    const timer = window.setInterval(() => {
      void refreshCounts();
      void sync();
    }, pollIntervalMs);

    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, [enabled, userId, pollIntervalMs, sync, refreshCounts]);

  return {
    enabled,
    syncing,
    lastFlushAt,
    lastError,
    pendingAnswers,
    pendingFsrs,
    bulkImportResult,
    sync,
  };
}
