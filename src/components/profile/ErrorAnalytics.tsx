"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAccreditation } from "@/hooks/useAccreditation";
import { getQuestionsForSpecialty } from "@/data/accreditation/index";
import {
  computeErrorSummary,
  computeErrorsByBlock,
  computeFrequentErrors,
  computeRepeatErrors,
  computeErrorCategories,
} from "@/lib/accreditationErrors";
import MagicCard from "@/components/ui/MagicCard";

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export default function ErrorAnalytics({ specialtyId }: { specialtyId: string }) {
  const { progress } = useAccreditation(specialtyId);
  const router = useRouter();

  const questions = useMemo(
    () => getQuestionsForSpecialty(specialtyId),
    [specialtyId]
  );

  const summary = useMemo(
    () => computeErrorSummary(progress, questions),
    [progress, questions]
  );

  const blockErrors = useMemo(
    () => computeErrorsByBlock(progress, questions),
    [progress, questions]
  );

  const frequentErrors = useMemo(
    () => computeFrequentErrors(progress, questions, 5),
    [progress, questions]
  );

  const allFrequentErrors = useMemo(
    () => computeFrequentErrors(progress, questions, 0),
    [progress, questions]
  );

  const repeatErrors = useMemo(
    () => computeRepeatErrors(progress, questions),
    [progress, questions]
  );

  const categories = useMemo(
    () => computeErrorCategories(progress),
    [progress]
  );

  const hasData = summary.totalErrors > 0 || progress.mistakes.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-muted">
          Начните отвечать на тестовые вопросы - аналитика ошибок появится здесь
        </p>
      </div>
    );
  }

  const blocksWithErrors = blockErrors.filter((b) => b.errorCount > 0);
  const maxBlockErrors = Math.max(...blockErrors.map((b) => b.errorCount), 1);

  return (
    <div className="space-y-6">
      {/* A. General error summary */}
      <MagicCard
        className="rounded-3xl"
        gradientFrom="#f43f5e"
        gradientTo="#ef4444"
        spotlightColor="rgba(244, 63, 94, 0.12)"
      >
        <div className="px-6 py-8 text-center">
          <div className="text-6xl md:text-7xl font-extralight tracking-tight leading-none text-danger tabular-nums">
            {summary.totalErrors}
          </div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted mt-3 font-medium">
            {pluralize(summary.totalErrors, "ошибка", "ошибки", "ошибок")}
            {summary.totalAnswered > 0 && ` из ${summary.totalAnswered} ответов`}
          </p>
          {summary.totalAnswered > 0 && (
            <div className="w-full h-1.5 mt-6 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-danger"
                style={{ width: `${Math.round(summary.errorRate * 100)}%` }}
              />
            </div>
          )}
          {summary.uniqueErrorQuestions > 0 && (
            <p className="text-[10px] text-muted/70 mt-3">
              {summary.uniqueErrorQuestions} {pluralize(summary.uniqueErrorQuestions, "уникальный вопрос", "уникальных вопроса", "уникальных вопросов")} с ошибками
            </p>
          )}
        </div>
      </MagicCard>

      {/* B. Errors by block */}
      {blocksWithErrors.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium mb-3">
            Ошибки по блокам
          </p>
          <div className="space-y-1.5">
            {blocksWithErrors.map((b) => (
              <button
                key={b.blockNumber}
                onClick={() =>
                  router.push(
                    `/modes/exam?type=mistakes&block=${b.blockNumber}`
                  )
                }
                className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg bg-surface hover:bg-surface/70 transition-colors text-left btn-press"
              >
                <span className="text-xs font-semibold text-foreground w-16 shrink-0">
                  Блок {b.blockNumber}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-danger"
                    style={{
                      width: `${Math.round((b.errorCount / maxBlockErrors) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-danger font-semibold tabular-nums w-8 text-right">
                  {b.errorCount}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted shrink-0"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* C. Frequent errors */}
      {frequentErrors.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-danger font-medium mb-3">
            Частые ошибки
          </p>
          <div className="space-y-1.5">
            {frequentErrors.map((e) => (
              <div
                key={e.questionId}
                className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-surface"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                    {e.question}
                  </p>
                  <p className="text-[10px] text-muted mt-1">
                    Блок {e.blockNumber} · {e.wrongCount}/{e.totalAttempts} неверно
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <span className="text-sm font-extralight text-danger tabular-nums">
                    {e.wrongCount}
                  </span>
                  {e.isRepeat && (
                    <span className="text-[8px] uppercase tracking-wider text-warning font-bold px-1.5 py-0.5 rounded bg-warning/10 border border-warning/20">
                      повтор
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {allFrequentErrors.length > 5 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] text-primary font-medium py-2 text-center">
                Показать все {allFrequentErrors.length}
              </summary>
              <div className="mt-2 space-y-1.5">
                {allFrequentErrors.slice(5).map((e) => (
                  <div
                    key={e.questionId}
                    className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-surface"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                        {e.question}
                      </p>
                      <p className="text-[10px] text-muted mt-1">
                        Блок {e.blockNumber} · {e.wrongCount}/{e.totalAttempts} неверно
                      </p>
                    </div>
                    <span className="text-sm font-extralight text-danger tabular-nums shrink-0 mt-0.5">
                      {e.wrongCount}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* D. Repeat errors */}
      {repeatErrors.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-warning font-medium mb-3">
            Повторные ошибки
          </p>
          <p className="text-[10px] text-muted mb-3 leading-relaxed">
            Вопросы, на которые вы уже отвечали правильно, но потом снова ошиблись - знание нестабильно
          </p>
          <div className="space-y-1.5">
            {repeatErrors.slice(0, 5).map((e) => (
              <div
                key={e.questionId}
                className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-warning/5 border border-warning/15"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                    {e.question}
                  </p>
                  <p className="text-[10px] text-muted mt-1">
                    Блок {e.blockNumber} · {e.wrongCount} {pluralize(e.wrongCount, "ошибка", "ошибки", "ошибок")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error distribution */}
      {categories.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium mb-3">
            Распределение ошибок
          </p>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((c) => (
              <div key={c.label} className="text-center py-3 rounded-lg bg-surface">
                <div className="text-lg font-extralight tracking-tight leading-none text-foreground">
                  {c.count}
                </div>
                <p className="text-[9px] uppercase tracking-[0.12em] text-muted mt-1.5 font-medium">
                  {c.label}
                </p>
                <p className="text-[9px] text-muted/60 mt-0.5">{c.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
