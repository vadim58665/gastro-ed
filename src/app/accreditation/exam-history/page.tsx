"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import GradientRing from "@/components/ui/GradientRing";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} мин ${s} сек` : `${s} сек`;
}

export default function ExamHistoryPage() {
  const router = useRouter();
  const { activeSpecialty } = useSpecialty();
  const specialtyId = activeSpecialty?.id || "";
  const { progress } = useAccreditation(specialtyId);

  const attempts = useMemo(
    () => [...progress.examResults].reverse(),
    [progress.examResults]
  );

  const stats = useMemo(() => {
    if (attempts.length === 0) {
      return { avg: 0, best: 0, firstPct: 0, lastPct: 0, trend: 0 };
    }
    const pcts = attempts.map((a) => a.percentage);
    const avg = Math.round(pcts.reduce((s, n) => s + n, 0) / pcts.length);
    const best = Math.max(...pcts);
    const firstPct = pcts[pcts.length - 1];
    const lastPct = pcts[0];
    const trend = lastPct - firstPct;
    return { avg, best, firstPct, lastPct, trend };
  }, [attempts]);

  if (!activeSpecialty) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-24 flex items-center justify-center px-6">
          <p className="text-sm text-muted text-center">
            Выберите специальность в профиле
          </p>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-24 flex items-center justify-center px-6">
          <div className="text-center max-w-xs">
            <p
              className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              История экзаменов
            </p>
            <h2 className="text-xl font-extralight aurora-text tracking-tight mb-3">
              Ещё не было пробных попыток
            </h2>
            <p className="text-xs text-muted mb-6 leading-relaxed">
              Пройдите пробный экзамен, чтобы увидеть здесь ваш результат и тренд роста.
            </p>
            <button
              onClick={() => router.push("/modes/exam")}
              className="px-8 py-3 rounded-xl btn-premium-dark text-sm font-medium"
            >
              Пройти пробный
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // For sparkline we need chronological (oldest → newest)
  const chronological = [...attempts].reverse();

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-24 overflow-y-auto">
        <div className="px-6">
          <p
            className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            История экзаменов
          </p>
          <h1 className="text-2xl font-extralight aurora-text tracking-tight mb-1">
            Пробные попытки
          </h1>
          <p className="text-xs text-muted mb-6">
            {activeSpecialty.name} · {attempts.length}{" "}
            {pluralize(attempts.length, "попытка", "попытки", "попыток")}
          </p>

          {/* Trend hero */}
          <div
            className="rounded-3xl aurora-hairline p-5 mb-6"
            style={{ background: "var(--color-card)" }}
          >
            <div className="flex items-center gap-5 mb-4">
              <GradientRing value={stats.avg} size={88} thickness={5} />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted font-medium mb-1">
                  Средний балл
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extralight aurora-text tabular-nums leading-none">
                    {stats.avg}%
                  </span>
                  {stats.trend !== 0 && attempts.length > 1 && (
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{
                        color: stats.trend > 0 ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)",
                      }}
                    >
                      {stats.trend > 0 ? "+" : ""}
                      {stats.trend}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted mt-1 tracking-wide">
                  Лучший {stats.best}%
                  {attempts.length > 1 && (stats.trend > 0 ? " · тренд растёт" : stats.trend < 0 ? " · тренд снижается" : " · без изменений")}
                </p>
              </div>
            </div>

            {/* Sparkline */}
            {chronological.length > 1 && (
              <>
                <div className="flex items-end justify-between gap-1.5 h-16 mb-1.5">
                  {chronological.map((a, i) => {
                    const h = Math.max(8, (a.percentage / 100) * 60);
                    return (
                      <div key={a.timestamp} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            height: h,
                            background: "linear-gradient(180deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
                            opacity: 0.4 + (i / chronological.length) * 0.6,
                          }}
                        />
                        <span className="text-[8px] tabular-nums text-muted">
                          {a.percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[8px] uppercase tracking-wider text-muted">
                  {chronological.map((a) => (
                    <span key={a.timestamp} className="flex-1 text-center">
                      {formatDateShort(a.timestamp)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Attempts list */}
          <p className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium mb-2.5">
            Попытки · новые сверху
          </p>
          <div className="flex flex-col gap-2 mb-6">
            {attempts.map((a, i) => {
              const prev = attempts[i + 1];
              const trend = prev
                ? a.percentage > prev.percentage ? "up"
                  : a.percentage < prev.percentage ? "down"
                    : null
                : null;
              return (
                <div
                  key={a.timestamp}
                  className="rounded-2xl aurora-hairline px-4 py-3.5 flex items-center gap-3"
                  style={{ background: "var(--color-card)" }}
                >
                  <GradientRing value={a.percentage} size={46} thickness={3} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-extralight tabular-nums text-foreground">
                        {a.percentage}%
                      </span>
                      <span
                        className="text-[8px] uppercase tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          color: a.passed ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)",
                          background: a.passed ? "var(--aurora-indigo-soft)" : "var(--aurora-pink-soft)",
                        }}
                      >
                        {a.passed ? "сдан" : "не сдан"}
                      </span>
                      {trend === "up" && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--color-aurora-indigo)" }}>
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      )}
                      {trend === "down" && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--color-aurora-pink)" }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      )}
                    </div>
                    <p className="text-[10px] text-muted tracking-wide">
                      {a.correct}/{a.total} · {formatDuration(a.duration)} · {formatDate(a.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => router.push("/modes/exam")}
            className="w-full py-3 rounded-xl btn-premium-dark text-sm font-medium"
          >
            Пройти ещё раз
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
