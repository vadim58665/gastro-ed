"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { getQuestionsForSpecialty } from "@/data/accreditation/index";
import {
  computeBlockReadiness,
  type BlockReadiness,
  type BlockReadinessLevel,
} from "@/lib/accreditationErrors";

const STATUS_CONFIG: Record<BlockReadinessLevel, { label: string; color: string; bg: string }> = {
  strong: { label: "Уверенно", color: "var(--color-aurora-indigo)", bg: "var(--aurora-indigo-soft)" },
  ready: { label: "Готов", color: "var(--color-aurora-indigo)", bg: "var(--aurora-indigo-soft)" },
  weak: { label: "Слабый", color: "var(--color-aurora-pink)", bg: "var(--aurora-pink-soft)" },
  started: { label: "В процессе", color: "var(--color-aurora-violet)", bg: "var(--aurora-violet-soft)" },
  not_started: { label: "Не начат", color: "var(--color-muted)", bg: "color-mix(in srgb, var(--color-border) 50%, transparent)" },
};

/**
 * Рекомендация следующего шага для врача.
 * Приоритет: not_started → weak → started (дотянуть до ready) → ready (SRS-повтор).
 */
function recommendNextBlock(blocks: BlockReadiness[]): {
  block: BlockReadiness;
  reason: string;
  cta: string;
} | null {
  if (blocks.length === 0) return null;

  const notStarted = blocks.find((b) => b.level === "not_started");
  if (notStarted) {
    return {
      block: notStarted,
      reason: "Ещё не начат — логичный следующий шаг в программе",
      cta: "Начать",
    };
  }

  const weak = [...blocks]
    .filter((b) => b.level === "weak")
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weak) {
    return {
      block: weak,
      reason: `Точность ${Math.round(weak.accuracy * 100)}% — нужно подтянуть`,
      cta: "Подтянуть",
    };
  }

  const started = [...blocks]
    .filter((b) => b.level === "started")
    .sort((a, b) => b.coverage - a.coverage)[0];
  if (started) {
    return {
      block: started,
      reason: `Пройдено ${Math.round(started.coverage * 100)}% блока — заканчивайте`,
      cta: "Продолжить",
    };
  }

  const ready = [...blocks]
    .filter((b) => b.level === "ready")
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  if (ready) {
    return {
      block: ready,
      reason: "Повторение закрепит результат",
      cta: "Повторить",
    };
  }

  const strong = blocks.find((b) => b.level === "strong");
  if (strong) {
    return {
      block: strong,
      reason: "Все блоки освоены — можно пробный экзамен",
      cta: "Повторить",
    };
  }

  return null;
}

export default function AccreditationPlanPage() {
  const router = useRouter();
  const { activeSpecialty } = useSpecialty();
  const specialtyId = activeSpecialty?.id || "";
  const { progress } = useAccreditation(specialtyId);

  const questions = useMemo(
    () => (specialtyId ? getQuestionsForSpecialty(specialtyId) : []),
    [specialtyId]
  );
  const blocks = useMemo(
    () => computeBlockReadiness(progress, questions),
    [progress, questions]
  );
  const recommendation = useMemo(() => recommendNextBlock(blocks), [blocks]);

  const completed = blocks.filter((b) => b.level === "strong" || b.level === "ready").length;
  const total = blocks.length;

  if (!activeSpecialty) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-24 flex items-center justify-center px-6">
          <p className="text-sm text-muted text-center">
            Выберите специальность в профиле, чтобы увидеть план
          </p>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-24 overflow-y-auto">
        <div className="px-6">
          <p
            className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            План подготовки
          </p>
          <h1 className="text-2xl font-extralight aurora-text tracking-tight mb-1">
            {activeSpecialty.name}
          </h1>
          <p className="text-xs text-muted mb-6">
            Освоено {completed} из {total} блоков
          </p>

          {/* Recommendation hero */}
          {recommendation && (
            <div
              className="rounded-3xl aurora-hairline p-5 mb-6 relative overflow-hidden"
              style={{
                background: "linear-gradient(180deg, var(--color-card) 0%, color-mix(in srgb, var(--aurora-violet-soft) 45%, transparent) 100%)",
                boxShadow: "0 1px 2px rgba(17,24,39,0.03), 0 8px 20px -12px color-mix(in srgb, var(--color-aurora-violet) 35%, transparent)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2"
                style={{ color: "var(--color-aurora-violet)" }}
              >
                Следующий шаг
              </p>
              <h2 className="text-xl font-medium text-foreground tracking-tight mb-1">
                Блок {recommendation.block.blockNumber}
              </h2>
              <p className="text-xs text-muted leading-relaxed mb-4">
                {recommendation.reason}
              </p>
              <button
                onClick={() => router.push(`/tests/${recommendation.block.blockNumber}`)}
                className="w-full py-3 rounded-xl btn-premium-dark text-sm font-medium"
              >
                {recommendation.cta} · Блок {recommendation.block.blockNumber}
              </button>
            </div>
          )}

          {/* All blocks grid */}
          <p className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium mb-2.5">
            Все блоки
          </p>
          <div className="flex flex-col gap-2 mb-6">
            {blocks.map((b) => {
              const pct = Math.round(b.coverage * 100);
              const cfg = STATUS_CONFIG[b.level];
              const accPct = Math.round(b.accuracy * 100);
              const isRecommended = recommendation?.block.blockNumber === b.blockNumber;
              return (
                <button
                  key={b.blockNumber}
                  onClick={() => router.push(`/tests/${b.blockNumber}`)}
                  className="text-left rounded-2xl aurora-hairline px-4 py-3.5 transition-colors hover:bg-[var(--aurora-violet-soft)]"
                  style={{
                    background: "var(--color-card)",
                    boxShadow: isRecommended
                      ? "0 0 0 2px color-mix(in srgb, var(--color-aurora-violet) 40%, transparent), 0 8px 20px -12px color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)"
                      : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[8px] uppercase tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        color: "var(--color-aurora-violet)",
                        background: "var(--aurora-violet-soft)",
                      }}
                    >
                      Блок {b.blockNumber}
                    </span>
                    <span
                      className="text-[8px] uppercase tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                    {b.answered > 0 && (
                      <span
                        className="text-[9px] tabular-nums font-semibold ml-auto"
                        style={{ color: accPct >= 70 ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)" }}
                      >
                        {accPct}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "color-mix(in srgb, var(--color-border) 60%, transparent)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: cfg.color }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted shrink-0">
                      {b.learned}/{b.totalInBlock}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
