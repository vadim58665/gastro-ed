"use client";

import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/ui/BottomNav";
import DailyCasePlayer from "@/components/daily/DailyCasePlayer";
import DailyCaseResult from "@/components/daily/DailyCaseResult";
import DailyCaseHeader from "@/components/daily/DailyCaseHeader";
import { getDailyCase, getTodayDateStr } from "@/data/dailyCases";
import { useProgress } from "@/hooks/useProgress";
import { getSupabase } from "@/lib/supabase/client";
import {
  clearSession,
  loadSession,
  type StoredSession,
} from "@/lib/dailyCaseSession";
import { useMedMind } from "@/contexts/MedMindContext";
import type { StepResult } from "@/types/dailyCase";

/** "2026-04-18" -> "18 апр" */
function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${d} ${months[m - 1] ?? ""}`.trim();
}

export default function DailyCasePage() {
  const { progress, saveProgress } = useProgress();
  const [dateStr] = useState(getTodayDateStr);
  const dailyCase = getDailyCase(dateStr);

  // Одноразовый сброс по URL: /daily-case?reset=1 — удаляем локальный
  // результат дня и незавершённую сессию, чтобы пройти заново.
  // Сделано через window.location, чтобы не тянуть Suspense-требующий
  // useSearchParams в Next 16.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") !== "1") return;
    clearSession();
    const next = { ...progress };
    if (next.dailyCaseHistory[dateStr]) {
      const { [dateStr]: _drop, ...rest } = next.dailyCaseHistory;
      next.dailyCaseHistory = rest;
      saveProgress(next);
    }
    // Убираем ?reset из URL и полностью перезагружаем страницу,
    // чтобы lazy-init хуков перечитал localStorage.
    window.history.replaceState(null, "", "/daily-case");
    window.location.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const existing = progress.dailyCaseHistory[dateStr];
  // Lazy init: если кейс уже завершён сегодня — подхватим result,
  // иначе — восстановим незавершённую сессию из localStorage
  // (таймер продолжится с того же `stepStartTime`, переходы между вкладками
  // больше не сбрасывают состояние).
  const [initialSession] = useState<StoredSession | null>(() => {
    if (typeof window === "undefined") return null;
    if (existing) return null;
    return loadSession(dateStr, dailyCase.id);
  });
  const [stepResults, setStepResults] = useState<StepResult[] | null>(
    existing ? existing.steps : null
  );
  const [started, setStarted] = useState<boolean>(
    !!existing || !!initialSession
  );

  useEffect(() => {
    if (existing) {
      setStepResults(existing.steps);
      setStarted(true);
    }
  }, [existing]);

  // Пока плеер не смонтирован (лендинг «Начать» или экран итогов),
  // ассистент должен видеть раздел. DailyCasePlayer перекроет этот
  // screen на `daily_case_step` как только пользователь нажмёт «Начать».
  const { setScreen } = useMedMind();
  useEffect(() => {
    if (!started || stepResults) {
      setScreen({ kind: "other", label: "Диагноз дня" });
    }
  }, [started, stepResults, setScreen]);

  const handleComplete = useCallback(
    (results: StepResult[]) => {
      // Сессия окончена — сбрасываем persistence, чтобы завтра не подхватывать.
      clearSession();
      setStepResults(results);
      const totalPoints = results.reduce((s, r) => s + r.points, 0);
      const maxPoints = dailyCase.steps.length * 500;
      const updated = {
        ...progress,
        dailyCaseHistory: {
          ...progress.dailyCaseHistory,
          [dateStr]: {
            completedAt: new Date().toISOString(),
            totalPoints,
            maxPoints,
            steps: results,
          },
        },
      };
      saveProgress(updated);

      // Отправить результат на сервер для рейтинга (fire-and-forget)
      void (async () => {
        try {
          const {
            data: { session },
          } = await getSupabase().auth.getSession();
          const token =
            session?.access_token ??
            (process.env.NEXT_PUBLIC_DEV_MODE === "true"
              ? "dev-test-token"
              : null);
          if (!token) return;
          await fetch("/api/daily-case/result", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              caseDate: dateStr,
              caseId: dailyCase.id,
              totalPoints,
              maxPoints,
            }),
          });
        } catch {
          // не ломаем прогресс, если сеть упала
        }
      })();
    },
    [progress, dateStr, saveProgress, dailyCase.steps.length, dailyCase.id]
  );

  return (
    <div className="daily-case-shell flex flex-col min-h-screen">
      <DailyCaseHeader
        title={dailyCase.title}
        dateLabel={formatDateLabel(dateStr)}
        difficulty={dailyCase.difficulty}
      />

      {/* Content */}
      <main className="flex-1 pt-20 pb-24 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-4">
          {stepResults ? (
            <DailyCaseResult
              dailyCase={dailyCase}
              stepResults={stepResults}
              dateStr={dateStr}
            />
          ) : !started ? (
            <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-6">
              <div
                className="text-[96px] font-extralight leading-none tracking-tight aurora-text mb-3"
                style={{ filter: `drop-shadow(0 0 40px color-mix(in srgb, var(--color-aurora-violet) 35%, transparent))` }}
              >
                {dailyCase.steps.length}
              </div>
              <p
                className="text-[10px] uppercase tracking-[0.24em] font-semibold mb-8"
                style={{ color: "var(--color-aurora-violet)" }}
              >
                {dailyCase.steps.length === 1 ? "этап" : "этапов"}
              </p>

              <p className="text-[18px] font-extralight text-white leading-snug max-w-xs mb-3">
                {dailyCase.title}
              </p>
              <p className="text-[12px] leading-relaxed max-w-xs mb-12" style={{ color: "rgba(255,255,255,0.55)" }}>
                На каждый этап дается ограниченное время. Отвечайте быстро и точно для максимума очков.
              </p>

              <button
                onClick={() => setStarted(true)}
                className="btn-press inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-[13px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  color: "var(--color-ink)",
                  boxShadow: `0 8px 32px -8px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent), 0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.2)`,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
                Начать
              </button>
            </div>
          ) : (
            <DailyCasePlayer
              dailyCase={dailyCase}
              dateStr={dateStr}
              initialSession={initialSession}
              onComplete={handleComplete}
            />
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
