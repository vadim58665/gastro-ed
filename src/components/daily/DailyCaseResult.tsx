"use client";

import { useState } from "react";
import type { DailyCase, StepResult, DailyCaseStep } from "@/types/dailyCase";
import NumberTicker from "@/components/ui/NumberTicker";

interface Props {
  dailyCase: DailyCase;
  stepResults: StepResult[];
  dateStr?: string;
}

const stepLabels: Record<DailyCaseStep["type"], string> = {
  complaint: "Жалобы",
  history: "Анамнез",
  labs: "Анализы",
  examination: "Осмотр",
  differential: "Дифф.",
  diagnosis: "Диагноз",
  complication: "Осложн.",
  treatment: "Лечение",
  monitoring: "Контроль",
  prognosis: "Прогноз",
};

function formatTime(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}с`;
  return `${Math.floor(sec / 60)}м ${sec % 60}с`;
}

function StepRing({ isCorrect, points, label }: { isCorrect: boolean; points: number; label: string }) {
  const size = 52;
  const thickness = 1.5;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-border/50"
          />
          {/* Fill for correct */}
          {isCorrect && (
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              className="text-foreground/80"
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0.9,0.3,1)" }}
            />
          )}
        </svg>
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isCorrect ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-border">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-[8px] font-medium uppercase tracking-[0.08em] text-muted/70 leading-none">
        {label}
      </span>
      <span className="text-[10px] font-medium tabular-nums text-muted/80">
        {points}
      </span>
    </div>
  );
}

function BreakdownAccordion({
  dailyCase,
  stepResults,
  stepLabels,
  formatTime,
}: {
  dailyCase: DailyCase;
  stepResults: StepResult[];
  stepLabels: Record<string, string>;
  formatTime: (ms: number) => string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const wrongSteps = dailyCase.steps
    .map((s, i) => ({ s, i, r: stepResults[i] }))
    .filter(({ r }) => !r.isCorrect);

  if (wrongSteps.length === 0) {
    return (
      <div className="text-center py-4 text-[12px] text-muted">
        Все этапы пройдены верно
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border/40 border border-border/40 rounded-2xl overflow-hidden">
      {wrongSteps.map(({ s, i, r }) => {
        const selectedOpt = r.selectedIndex >= 0 ? s.options[r.selectedIndex] : null;
        const correctOpt = s.options.find((o) => o.isCorrect)!;
        const isOpen = openIndex === i;
        return (
          <button
            key={i}
            className="w-full text-left"
            onClick={() => setOpenIndex(isOpen ? null : i)}
          >
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted/40 shrink-0">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span className="text-[13px] font-medium text-foreground/75">{stepLabels[s.type]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted/60">{formatTime(r.timeMs)}</span>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className={`text-muted/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {isOpen && (
              <div className="px-4 pb-4 flex flex-col gap-2 text-left border-t border-border/30">
                {selectedOpt && (
                  <p className="text-[12px] text-muted/55 line-through pt-3">{selectedOpt.text}</p>
                )}
                <p className="text-[13px] text-foreground/80 font-medium">{correctOpt.text}</p>
                {correctOpt.explanation && (
                  <p className="text-[12px] text-muted leading-relaxed">{correctOpt.explanation}</p>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function DailyCaseResult({ dailyCase, stepResults, dateStr }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  const totalPoints = stepResults.reduce((s, r) => s + r.points, 0);
  const maxPoints = dailyCase.steps.length * 500;
  const correctCount = stepResults.filter((r) => r.isCorrect).length;
  const totalTime = stepResults.reduce((s, r) => s + r.timeMs, 0);
  const allCorrect = correctCount === dailyCase.steps.length;
  const percentage = Math.round((totalPoints / maxPoints) * 100);

  return (
    <div className="flex flex-col animate-result">

      {/* Rings */}
      <div className="flex justify-center gap-5 flex-wrap pt-6 pb-8">
        {stepResults.map((r, i) => (
          <StepRing
            key={i}
            isCorrect={r.isCorrect}
            points={r.points}
            label={stepLabels[dailyCase.steps[i].type]}
          />
        ))}
      </div>

      {/* Score */}
      <div className="text-center pb-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted font-semibold mb-2">
          Итоговый счёт
        </p>
        <div className="text-7xl font-extralight text-foreground tracking-tight leading-none tabular-nums">
          <NumberTicker value={totalPoints} />
        </div>
        <p className="text-[11px] text-muted mt-2">из {maxPoints} очков</p>

        <div className="mt-5 mx-auto w-32 h-px bg-border/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground/60 rounded-full transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-[11px] text-muted font-medium mt-1.5 tabular-nums">{percentage}%</p>
      </div>

      {/* Divider */}
      <div className="w-10 h-px bg-border mx-auto mb-8" />

      {/* Stats */}
      <div className="flex justify-center gap-8 mb-8">
        <div className="text-center">
          <div className="text-2xl font-extralight text-foreground tabular-nums">{correctCount}/{dailyCase.steps.length}</div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted font-semibold mt-1">верных</div>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <div className="text-2xl font-extralight text-foreground tabular-nums">{formatTime(totalTime)}</div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted font-semibold mt-1">время</div>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <div className="text-2xl font-extralight text-foreground tabular-nums">{percentage}%</div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted font-semibold mt-1">рейтинг</div>
        </div>
      </div>

      {/* Outcome */}
      <div className="px-5 py-4 rounded-2xl border border-border/60 mb-8">
        <div className="text-[10px] font-semibold mb-1.5 uppercase tracking-[0.15em] text-muted">
          {allCorrect ? "Пациент выздоровел" : "Состояние ухудшилось"}
        </div>
        <span className="text-sm text-foreground/65 leading-relaxed">
          {allCorrect ? dailyCase.outcome.correct : dailyCase.outcome.wrong}
        </span>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn-press w-full py-3.5 rounded-2xl border border-border/60 text-[11px] font-semibold text-muted uppercase tracking-[0.2em] hover:text-foreground hover:bg-surface transition-colors"
        >
          {showDetails ? "Скрыть разбор" : "Показать разбор"}
        </button>
      </div>

      {/* Details — only wrong steps, accordion */}
      {showDetails && (
        <BreakdownAccordion dailyCase={dailyCase} stepResults={stepResults} stepLabels={stepLabels} formatTime={formatTime} />
      )}
    </div>
  );
}
