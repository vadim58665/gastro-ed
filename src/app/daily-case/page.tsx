"use client";

import { useState, useEffect, useCallback } from "react";
import BottomNav from "@/components/ui/BottomNav";
import DailyCasePlayer from "@/components/daily/DailyCasePlayer";
import DailyCaseResult from "@/components/daily/DailyCaseResult";
import { getDailyCase, getTodayDateStr } from "@/data/dailyCases";
import { useProgress } from "@/hooks/useProgress";
import type { StepResult } from "@/types/dailyCase";

export default function DailyCasePage() {
  const { progress, saveProgress } = useProgress();
  const [dateStr] = useState(getTodayDateStr);
  const dailyCase = getDailyCase(dateStr);
  const existing = progress.dailyCaseHistory[dateStr];
  const [stepResults, setStepResults] = useState<StepResult[] | null>(null);

  useEffect(() => {
    if (existing) {
      setStepResults(existing.steps);
    }
  }, [existing]);

  const handleComplete = useCallback(
    (results: StepResult[]) => {
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
    },
    [progress, dateStr, saveProgress, dailyCase.steps.length]
  );

  const difficultyLabel =
    dailyCase.difficulty === "easy" ? "Легко" :
    dailyCase.difficulty === "medium" ? "Средне" : "Сложно";
  const difficultyDotColor =
    dailyCase.difficulty === "easy" ? "#10b981" :
    dailyCase.difficulty === "medium" ? "#f59e0b" : "#ef4444";

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/85 backdrop-blur-xl border-b border-border/60 z-50 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_6px_24px_-12px_rgba(17,24,39,0.12)]">
        <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              Диагноз дня
            </div>
            <div className="text-sm font-medium text-foreground truncate mt-0.5">{dailyCase.title}</div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 border border-border/70 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: difficultyDotColor,
                boxShadow: `0 0 6px ${difficultyDotColor}80`,
              }}
            />
            <span className="text-[10px] uppercase tracking-[0.15em] text-foreground font-semibold">
              {difficultyLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-4">
          {stepResults ? (
            <DailyCaseResult
              dailyCase={dailyCase}
              stepResults={stepResults}
              dateStr={dateStr}
            />
          ) : (
            <DailyCasePlayer
              dailyCase={dailyCase}
              onComplete={handleComplete}
            />
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
