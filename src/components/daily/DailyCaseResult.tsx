"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyCase, StepResult, DailyCaseStep } from "@/types/dailyCase";
import NumberTicker from "@/components/ui/NumberTicker";
import DailyLeaderboard from "./DailyLeaderboard";

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

// Step 1: StepRing - aurora-gradient on dark, thickness 1.8, CSS classes
function StepRing({ isCorrect, points, label }: { isCorrect: boolean; points: number; label: string }) {
  const size = 52;
  const thickness = 1.8;
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
            strokeWidth={thickness}
            className="aurora-step-ring-track"
          />
          {/* Fill */}
          {isCorrect ? (
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              className="aurora-step-ring-fill"
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0.9,0.3,1)" }}
            />
          ) : (
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              strokeWidth={thickness}
              strokeDasharray="2 4"
              className="aurora-step-ring-fill--empty"
            />
          )}
        </svg>
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isCorrect ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-aurora-violet)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-[8px] font-medium uppercase tracking-[0.08em] text-white/45 leading-none">
        {label}
      </span>
      <span className="text-[10px] font-medium tabular-nums text-white/70">
        {points}
      </span>
    </div>
  );
}

// Step 7: BreakdownAccordion — все этапы, с разбором. Ошибочные — розовый
// крестик, верные — индиго-галочка и +points. Пользователь может открыть
// любой этап и перечитать правильный ответ и объяснение.
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

  return (
    <div className="flex flex-col divide-y divide-white/10 border border-white/15 rounded-2xl overflow-hidden bg-white/[0.04]">
      {dailyCase.steps.map((s, i) => {
        const r = stepResults[i];
        const selectedOpt = r.selectedIndex >= 0 ? s.options[r.selectedIndex] : null;
        const correctOpt = s.options.find((o) => o.isCorrect)!;
        const isOpen = openIndex === i;
        return (
          <button
            key={i}
            className="w-full text-left hover:bg-white/[0.02] transition-colors"
            onClick={() => setOpenIndex(isOpen ? null : i)}
          >
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                {r.isCorrect ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-aurora-violet)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                    aria-label="Верно"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-aurora-pink)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="shrink-0"
                    aria-label="Ошибка"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
                <span className="text-[13px] font-medium text-white/85">{stepLabels[s.type]}</span>
                {r.isCorrect && r.points > 0 && (
                  <span className="text-[10px] text-white/60 tabular-nums">+{r.points}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/45">{formatTime(r.timeMs)}</span>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className={`text-white/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {isOpen && (
              <div className="px-4 pb-4 flex flex-col gap-2 text-left border-t border-white/10">
                {!r.isCorrect && selectedOpt && (
                  <p className="text-[12px] text-white/40 line-through pt-3">{selectedOpt.text}</p>
                )}
                <p
                  className="text-[13px] font-medium"
                  style={{ color: "var(--color-aurora-violet)", paddingTop: r.isCorrect ? "0.75rem" : 0 }}
                >
                  {correctOpt.text}
                </p>
                {correctOpt.explanation && (
                  <p className="text-[12px] text-white/65 leading-relaxed">{correctOpt.explanation}</p>
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
  const router = useRouter();

  const totalPoints = stepResults.reduce((s, r) => s + r.points, 0);
  const maxPoints = dailyCase.steps.length * 500;
  const correctCount = stepResults.filter((r) => r.isCorrect).length;
  const totalTime = stepResults.reduce((s, r) => s + r.timeMs, 0);
  const allCorrect = correctCount === dailyCase.steps.length;
  const percentage = Math.round((totalPoints / maxPoints) * 100);

  return (
    <div className="flex flex-col animate-result">

      {/* Step 8: Shared aurora gradient defs for StepRing */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id="aurora-step-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-aurora-indigo)" />
            <stop offset="50%" stopColor="var(--color-aurora-violet)" />
            <stop offset="100%" stopColor="var(--color-aurora-pink)" />
          </linearGradient>
        </defs>
      </svg>

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

      {/* Step 2: Score block */}
      <div className="text-center pb-8">
        <p
          className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2"
          style={{ color: "var(--color-aurora-violet)" }}
        >
          Итоговый счёт
        </p>
        <div
          className="text-[96px] font-extralight leading-none tracking-tight aurora-text tabular-nums"
          style={{ filter: `drop-shadow(0 0 40px color-mix(in srgb, var(--color-aurora-violet) 35%, transparent))` }}
        >
          <NumberTicker value={totalPoints} />
        </div>
        <p className="text-[11px] text-white/55 mt-2">из {maxPoints} очков</p>

        <div className="mt-5 mx-auto w-32 h-px bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${percentage}%`,
              background: "var(--aurora-gradient-primary)",
            }}
          />
        </div>
        <p className="text-[11px] text-white/70 font-medium mt-1.5 tabular-nums">{percentage}%</p>
      </div>

      {/* Step 3: Divider */}
      <div className="aurora-divider-dark w-24 mx-auto mb-8" />

      {/* Step 4: Stats row */}
      <div className="flex justify-center gap-8 mb-8">
        <div className="text-center">
          <div className="text-2xl font-extralight text-white tabular-nums">{correctCount}/{dailyCase.steps.length}</div>
          <div
            className="text-[9px] uppercase tracking-[0.18em] font-semibold mt-1"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            верных
          </div>
        </div>
        <div className="w-px bg-white/15" />
        <div className="text-center">
          <div className="text-2xl font-extralight text-white tabular-nums">{formatTime(totalTime)}</div>
          <div
            className="text-[9px] uppercase tracking-[0.18em] font-semibold mt-1"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            время
          </div>
        </div>
        <div className="w-px bg-white/15" />
        <div className="text-center">
          <div className="text-2xl font-extralight text-white tabular-nums">{percentage}%</div>
          <div
            className="text-[9px] uppercase tracking-[0.18em] font-semibold mt-1"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            рейтинг
          </div>
        </div>
      </div>

      {/* Step 5: Outcome box */}
      <div className="aurora-hairline-dark rounded-2xl bg-white/5 p-5 mb-8">
        <div
          className="text-[10px] font-semibold mb-1.5 uppercase tracking-[0.18em]"
          style={{ color: allCorrect ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)" }}
        >
          {allCorrect ? "Пациент выздоровел" : "Состояние ухудшилось"}
        </div>
        <span className="text-sm text-white/80 leading-relaxed">
          {allCorrect ? dailyCase.outcome.correct : dailyCase.outcome.wrong}
        </span>
      </div>

      {/* Step 6: Toggle button */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn-press w-full py-3.5 rounded-2xl border text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors"
          style={{
            borderColor: "rgba(255,255,255,0.18)",
            color: showDetails ? "#ffffff" : "rgba(255,255,255,0.7)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          {showDetails ? "Скрыть разбор" : "Показать разбор"}
        </button>
      </div>

      {/* Details - only wrong steps, accordion */}
      {showDetails && (
        <BreakdownAccordion dailyCase={dailyCase} stepResults={stepResults} stepLabels={stepLabels} formatTime={formatTime} />
      )}

      {/* Leaderboard - always visible below toggle button */}
      {dateStr && <DailyLeaderboard date={dateStr} />}

      {/* Actions — «На главную» первично, «Начать заново» как второстепенное
          действие (страница /daily-case?reset=1 удаляет локальный результат
          и незавершённую сессию, см. src/app/daily-case/page.tsx:31-51). */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={() => router.push("/topics")}
          className="btn-press w-full py-3.5 rounded-2xl text-[12px] font-semibold uppercase tracking-[0.22em]"
          style={{
            background: "var(--aurora-gradient-primary)",
            color: "#fff",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px -10px color-mix(in srgb, var(--color-aurora-indigo) 55%, transparent)",
          }}
        >
          На главную
        </button>
        <button
          onClick={() => {
            // router.push не триггерит перезагрузку, а страница /daily-case
            // читает ?reset=1 и делает window.location.reload() после очистки
            // localStorage — используем прямой переход, чтобы всё
            // отработало без флага, который сохранился бы в URL.
            window.location.href = "/daily-case?reset=1";
          }}
          className="btn-press w-full py-3 rounded-2xl border text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{
            borderColor: "rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.75)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          Начать заново
        </button>
      </div>
    </div>
  );
}
