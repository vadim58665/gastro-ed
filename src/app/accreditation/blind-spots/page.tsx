"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { getQuestionsForSpecialty } from "@/data/accreditation/index";

export default function BlindSpotsPage() {
  const router = useRouter();
  const { activeSpecialty } = useSpecialty();
  const specialtyId = activeSpecialty?.id || "";
  const { progress, totalLearned } = useAccreditation(specialtyId);

  const questions = useMemo(
    () => (specialtyId ? getQuestionsForSpecialty(specialtyId) : []),
    [specialtyId]
  );

  // Blind = question never answered correctly
  // progress.blocks[].learned = count of correctly-answered per block
  // blind per block = total_in_block - learned_in_block
  const blocksData = useMemo(() => {
    const byBlock = new Map<
      number,
      { blockNumber: number; total: number; learned: number; answered: number; correct: number }
    >();

    for (const q of questions) {
      const entry = byBlock.get(q.blockNumber) ?? {
        blockNumber: q.blockNumber,
        total: 0,
        learned: 0,
        answered: 0,
        correct: 0,
      };
      entry.total++;
      const qs = progress.questionStats[q.id];
      if (qs) {
        entry.answered += qs.attempts;
        entry.correct += qs.attempts - qs.wrong;
      }
      byBlock.set(q.blockNumber, entry);
    }

    for (const bp of progress.blocks) {
      const entry = byBlock.get(bp.blockNumber);
      if (entry) entry.learned = bp.learned;
    }

    return Array.from(byBlock.values())
      .map((b) => ({
        ...b,
        unseen: Math.max(0, b.total - b.learned),
        accuracy: b.answered > 0 ? b.correct / b.answered : 0,
        startedButNotComplete: b.answered > 0 && b.learned < b.total,
      }))
      .sort((a, b) => b.unseen - a.unseen);
  }, [questions, progress.questionStats, progress.blocks]);

  const totalQuestions = questions.length;
  const unseenTotal = totalQuestions - totalLearned;
  const coverage =
    totalQuestions > 0 ? Math.round((totalLearned / totalQuestions) * 100) : 0;

  // Pick the weakest block for the "random 10" CTA
  const weakestBlock = blocksData.length > 0 ? blocksData[0] : null;

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

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-24 overflow-y-auto">
        <div className="px-6">
          <p
            className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Слепые зоны
          </p>
          <h1 className="text-2xl font-extralight aurora-text tracking-tight mb-1">
            Чего вы ещё не видели
          </h1>
          <p className="text-xs text-muted mb-6">{activeSpecialty.name}</p>

          {/* Hero */}
          <div
            className="rounded-3xl aurora-hairline p-5 mb-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg, var(--color-card) 0%, color-mix(in srgb, var(--aurora-pink-soft) 35%, transparent) 100%)",
            }}
          >
            <div className="relative flex items-baseline gap-2 mb-1">
              <span className="text-5xl font-extralight aurora-text tabular-nums leading-none">
                {unseenTotal}
              </span>
              <span className="text-sm text-muted">из {totalQuestions}</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted font-medium mb-4">
              вопросов не освоены
            </p>
            <div
              className="h-1.5 rounded-full overflow-hidden mb-1"
              style={{ background: "color-mix(in srgb, var(--color-border) 60%, transparent)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${coverage}%`,
                  background: "linear-gradient(90deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
                }}
              />
            </div>
            <p className="text-[10px] text-muted tracking-wide mb-5">
              Освоено {coverage}%
            </p>
            {weakestBlock && weakestBlock.unseen > 0 && (
              <button
                onClick={() => router.push(`/tests/${weakestBlock.blockNumber}`)}
                className="w-full py-3 rounded-xl btn-premium-dark text-sm font-medium"
              >
                Открыть Блок {weakestBlock.blockNumber} · {weakestBlock.unseen} не освоено
              </button>
            )}
          </div>

          {/* Per-block list */}
          <p className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium mb-2.5">
            Где больше всего пробелов
          </p>
          <div className="flex flex-col gap-2 mb-6">
            {blocksData.map((b) => {
              const pct = Math.round((b.unseen / b.total) * 100);
              const accPct = Math.round(b.accuracy * 100);
              return (
                <button
                  key={b.blockNumber}
                  onClick={() => router.push(`/tests/${b.blockNumber}`)}
                  className="text-left rounded-2xl aurora-hairline px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[var(--aurora-violet-soft)]"
                  style={{ background: "var(--color-card)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[8px] uppercase tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          color: "var(--color-aurora-violet)",
                          background: "var(--aurora-violet-soft)",
                        }}
                      >
                        Блок {b.blockNumber}
                      </span>
                      {b.answered > 0 && (
                        <span
                          className="text-[9px] tabular-nums font-semibold"
                          style={{
                            color: accPct >= 70 ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)",
                          }}
                        >
                          {accPct}%
                        </span>
                      )}
                      {b.answered === 0 && (
                        <span className="text-[9px] uppercase tracking-wider text-muted">
                          не начат
                        </span>
                      )}
                    </div>
                    <div
                      className="h-1 rounded-full overflow-hidden"
                      style={{ background: "color-mix(in srgb, var(--color-border) 60%, transparent)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct > 75 ? "var(--color-aurora-pink)"
                              : pct > 40 ? "var(--color-aurora-violet)"
                                : "var(--color-aurora-indigo)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end">
                    <span className="text-lg font-extralight tabular-nums leading-none text-foreground">
                      {b.unseen}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-muted mt-1">
                      не видел
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
