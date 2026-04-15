"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { getQuestionsForSpecialty, getBlockCount } from "@/data/accreditation/index";

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export default function MistakesHubPage() {
  const { activeSpecialty } = useSpecialty();
  const router = useRouter();
  const specialtyId = activeSpecialty?.id || "";
  const { progress } = useAccreditation(specialtyId);

  useEffect(() => {
    if (!activeSpecialty) router.push("/topics");
  }, [activeSpecialty, router]);

  const blockCount = useMemo(
    () => getBlockCount(specialtyId),
    [specialtyId]
  );

  // Счётчики ошибок по блокам для текущей специальности.
  const mistakesByBlock = useMemo(() => {
    const mistakeSet = new Set(progress.mistakes);
    const questions = getQuestionsForSpecialty(specialtyId);
    const counts = new Map<number, number>();
    for (const q of questions) {
      if (mistakeSet.has(q.id)) {
        counts.set(q.blockNumber, (counts.get(q.blockNumber) ?? 0) + 1);
      }
    }
    return counts;
  }, [progress.mistakes, specialtyId]);

  const totalMistakes = progress.mistakes.length;

  if (!activeSpecialty) return null;

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        <div className="px-6 pt-4 pb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-3">
            Работа над ошибками
          </p>
          <div className="text-6xl font-extralight text-foreground tracking-tight leading-none">
            {totalMistakes}
          </div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted mt-2 font-medium">
            {pluralize(totalMistakes, "вопрос", "вопроса", "вопросов")}
          </p>
        </div>

        {totalMistakes === 0 ? (
          <div className="px-6 text-center">
            <div className="w-12 h-px bg-border mx-auto mb-6" />
            <p className="text-sm text-muted leading-relaxed max-w-[280px] mx-auto">
              Нет ошибок по специальности «{activeSpecialty.name}». Решайте
              пробный экзамен — вопросы, на которые ответите неверно, появятся здесь.
            </p>
            <Link
              href="/modes"
              className="inline-block mt-6 text-xs uppercase tracking-[0.15em] font-semibold text-primary"
            >
              К режимам
            </Link>
          </div>
        ) : (
          <div className="px-6">
            <div className="w-12 h-px bg-border mx-auto mb-6" />

            {/* Все ошибки */}
            <Link
              href="/modes/exam?type=mistakes"
              className="btn-press block w-full text-left bg-card rounded-2xl border border-border px-5 py-4 hover:bg-surface transition-colors mb-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base font-light text-foreground">
                    Все ошибки
                  </span>
                  <p className="text-xs text-muted mt-1">
                    Проработать все ошибки специальности подряд
                  </p>
                </div>
                <span className="text-sm font-semibold text-danger">
                  {totalMistakes}
                </span>
              </div>
            </Link>

            {/* По блокам */}
            {blockCount > 0 && (
              <>
                <h2 className="text-sm font-medium text-foreground mt-6 mb-3">
                  По блокам
                </h2>
                <div className="space-y-2">
                  {Array.from({ length: blockCount }, (_, i) => i + 1).map((block) => {
                    const count = mistakesByBlock.get(block) ?? 0;
                    const disabled = count === 0;
                    if (disabled) {
                      return (
                        <div
                          key={block}
                          className="w-full text-left bg-card rounded-2xl border border-border px-5 py-4 opacity-40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base font-light text-foreground">
                              Блок {block}
                            </span>
                            <span className="text-xs text-muted">0</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={block}
                        href={`/modes/exam?type=mistakes&block=${block}`}
                        className="btn-press block w-full text-left bg-card rounded-2xl border border-border px-5 py-4 hover:bg-surface transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-light text-foreground">
                            Блок {block}
                          </span>
                          <span className="text-sm font-semibold text-danger">
                            {count}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
