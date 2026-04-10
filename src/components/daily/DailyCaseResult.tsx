"use client";

import { useState } from "react";
import type { DailyCase, StepResult, DailyCaseStep } from "@/types/dailyCase";
import MagicCard from "@/components/ui/MagicCard";
import NumberTicker from "@/components/ui/NumberTicker";
import GradientRing from "@/components/ui/GradientRing";

interface Props {
  dailyCase: DailyCase;
  stepResults: StepResult[];
  dateStr: string;
}

const stepLabels: Record<DailyCaseStep["type"], string> = {
  complaint: "Жалобы",
  history: "Анамнез",
  labs: "Анализы",
  examination: "Обследование",
  differential: "Дифф.диагноз",
  diagnosis: "Диагноз",
  complication: "Осложнения",
  treatment: "Лечение",
  monitoring: "Контроль",
  prognosis: "Прогноз",
};

function formatTime(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}с`;
  return `${Math.floor(sec / 60)}м ${sec % 60}с`;
}

export default function DailyCaseResult({ dailyCase, stepResults, dateStr }: Props) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const totalPoints = stepResults.reduce((s, r) => s + r.points, 0);
  const maxPoints = dailyCase.steps.length * 500;
  const correctCount = stepResults.filter((r) => r.isCorrect).length;
  const totalTime = stepResults.reduce((s, r) => s + r.timeMs, 0);
  const allCorrect = correctCount === dailyCase.steps.length;
  const percentage = Math.round((totalPoints / maxPoints) * 100);

  const formattedDate = (() => {
    const [, m, d] = dateStr.split("-");
    return `${d}.${m}`;
  })();

  const shareText = [
    `Диагноз дня ${formattedDate}`,
    `${totalPoints}/${maxPoints} очков (${percentage}%)`,
    stepResults.map((r) => (r.isCorrect ? "\u{1F7E2}" : "\u{1F534}")).join(""),
    `${dailyCase.specialty} | ${formatTime(totalTime)}`,
    "#GastroEd",
  ].join("\n");

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-6 animate-result">
      {/* Score rings */}
      <div className="flex justify-center gap-3 flex-wrap">
        {stepResults.map((r, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="relative">
              <GradientRing value={r.isCorrect ? 100 : 0} size={56} thickness={4} />
              <div className="absolute inset-0 flex items-center justify-center">
                {r.isCorrect ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
            </div>
            <div className="text-[10px] text-muted font-semibold tabular-nums">
              {r.points}<span className="text-muted/50">/500</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total score hero */}
      <MagicCard
        className="rounded-3xl"
        gradientFrom="#6366f1"
        gradientTo="#a855f7"
        gradientSize={320}
        spotlightColor="rgba(168, 85, 247, 0.14)"
      >
        <div className="text-center py-7 px-5">
          <div className="text-[10px] uppercase tracking-[0.28em] text-muted font-semibold mb-2">
            итоговый счёт
          </div>
          <div className="text-7xl font-extralight text-foreground tracking-tight leading-none tabular-nums">
            <NumberTicker value={totalPoints} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted font-medium mt-3">
            из {maxPoints} очков
          </div>
          <div className="mt-5 mx-auto w-48 h-[3px] bg-border/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground/80 transition-all duration-1000"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted font-semibold tabular-nums">
            {percentage}%
          </div>
        </div>
      </MagicCard>

      {/* Stats row */}
      <div className="flex justify-center gap-6">
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
      <div
        className={`p-5 rounded-2xl text-sm leading-relaxed ${
          allCorrect
            ? "bg-success-light border border-success/30 text-emerald-800"
            : "bg-danger-light border border-danger/30 text-rose-800"
        }`}
      >
        <div className="font-bold mb-1 uppercase tracking-[0.1em] text-xs">
          {allCorrect ? "Пациент выздоровел" : "Состояние ухудшилось"}
        </div>
        {allCorrect ? dailyCase.outcome.correct : dailyCase.outcome.wrong}
      </div>

      {/* Разбор — toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="btn-press py-3 text-[11px] font-semibold text-muted uppercase tracking-[0.2em] hover:text-foreground transition-colors"
      >
        {showDetails ? "Скрыть разбор" : "Показать разбор"}
      </button>

      {showDetails && (
        <div className="flex flex-col gap-4">
          {dailyCase.steps.map((s, i) => {
            const r = stepResults[i];
            const selectedOpt = s.options[r.selectedIndex];
            const correctOpt = s.options.find((o) => o.isCorrect)!;
            return (
              <div key={i} className="rounded-2xl border border-border overflow-hidden">
                <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider ${
                  r.isCorrect ? "bg-success-light text-emerald-700" : "bg-danger-light text-rose-700"
                }`}>
                  <span>{stepLabels[s.type]}: {s.title}</span>
                  <span>{r.points} очков · {formatTime(r.timeMs)}</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {!r.isCorrect && (
                    <div className="text-sm">
                      <span className="text-danger font-medium">Ваш ответ: </span>
                      <span className="text-foreground/70">{selectedOpt.text}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-success font-medium">Верный ответ: </span>
                    <span className="text-foreground/70">{correctOpt.text}</span>
                  </div>
                  <div className="mt-1 text-sm text-foreground/60 leading-relaxed">
                    {correctOpt.explanation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share */}
      <button
        onClick={handleShare}
        className="btn-press w-full py-4 rounded-2xl bg-foreground text-white text-xs uppercase tracking-[0.2em] font-semibold shadow-lg shadow-foreground/15 hover:shadow-xl hover:shadow-foreground/20 transition-all"
      >
        {copied ? "Скопировано!" : "Поделиться результатом"}
      </button>
    </div>
  );
}
