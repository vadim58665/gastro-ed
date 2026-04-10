"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { DailyCase, DailyCaseStep, StepResult } from "@/types/dailyCase";
import { calculateStepPoints, STEP_TIME_LIMIT } from "@/types/dailyCase";
import MagicCard from "@/components/ui/MagicCard";

interface Props {
  dailyCase: DailyCase;
  onComplete: (stepResults: StepResult[]) => void;
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

function shuffleIndices(length: number, seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export default function DailyCasePlayer({ dailyCase, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(STEP_TIME_LIMIT);
  const stepStartTime = useRef(Date.now());
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = dailyCase.steps[currentStep];
  const totalSteps = dailyCase.steps.length;
  const isLastStep = currentStep === totalSteps - 1;

  const shuffledIndices = useMemo(
    () => shuffleIndices(step.options.length, `${dailyCase.id}-step-${currentStep}`),
    [dailyCase.id, currentStep, step.options.length]
  );

  const advanceStep = useCallback(
    (result: StepResult) => {
      const newResults = [...stepResults, result];
      if (isLastStep) {
        onComplete(newResults);
      } else {
        setStepResults(newResults);
        setCurrentStep((s) => s + 1);
      }
    },
    [stepResults, isLastStep, onComplete]
  );

  // Timer
  useEffect(() => {
    stepStartTime.current = Date.now();
    lockedRef.current = false;
    setTimeLeft(STEP_TIME_LIMIT);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - stepStartTime.current;
      const remaining = Math.max(0, STEP_TIME_LIMIT - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!lockedRef.current) {
          lockedRef.current = true;
          // Timeout  - 0 points, wrong
          const timeoutResult: StepResult = {
            isCorrect: false,
            selectedIndex: -1,
            timeMs: STEP_TIME_LIMIT,
            points: 0,
            timedOut: true,
          };
          // Small delay so UI shows 0:00
          setTimeout(() => {
            advanceStep(timeoutResult);
          }, 300);
        }
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, advanceStep]);

  const handleSelect = (optionIndex: number) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeMs = Date.now() - stepStartTime.current;
    const isCorrect = step.options[optionIndex].isCorrect;
    const points = calculateStepPoints(isCorrect, timeMs);

    advanceStep({
      isCorrect,
      selectedIndex: optionIndex,
      timeMs,
      points,
      timedOut: false,
    });
  };

  // Timer display
  const seconds = Math.ceil(timeLeft / 1000);
  const timerFraction = timeLeft / STEP_TIME_LIMIT;
  const timerColor =
    timerFraction > 0.5 ? "text-foreground" :
    timerFraction > 0.2 ? "text-warning" : "text-danger";
  const barColor =
    timerFraction > 0.5 ? "bg-foreground/80" :
    timerFraction > 0.2 ? "bg-warning" : "bg-danger";

  // Running score
  const currentPoints = stepResults.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Timer bar */}
      <div className="relative h-[3px] bg-border/60 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-100 ${barColor}`}
          style={{ width: `${timerFraction * 100}%` }}
        />
      </div>

      {/* Header: step info + timer + score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dailyCase.steps.map((s, i) => {
            let dotStyle = "bg-border";
            if (i < currentStep) dotStyle = "bg-foreground/70";
            else if (i === currentStep) dotStyle = "bg-foreground ring-[3px] ring-foreground/15";
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-2 h-2 rounded-full transition-all ${dotStyle}`} />
                <span className="text-[8px] uppercase tracking-[0.12em] text-muted font-semibold">
                  {stepLabels[s.type]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          {currentPoints > 0 && (
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted font-semibold">очки</div>
              <div className="text-lg font-extralight text-foreground tabular-nums leading-none mt-0.5">{currentPoints}</div>
            </div>
          )}
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted font-semibold">таймер</div>
            <div className={`text-3xl font-extralight tabular-nums leading-none mt-0.5 ${timerColor}`}>
              {seconds}
            </div>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div key={currentStep} className="animate-result flex flex-col gap-4">
        <div className="text-[10px] font-semibold text-muted uppercase tracking-[0.22em]">
          {step.title}
        </div>
        <MagicCard
          className="rounded-2xl"
          gradientFrom="#6366f1"
          gradientTo="#a855f7"
          gradientSize={240}
          spotlightColor="rgba(168, 85, 247, 0.1)"
        >
          <div className="p-5 text-[13px] leading-relaxed text-foreground/85">
            {step.description}
          </div>
        </MagicCard>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {shuffledIndices.map((i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            className="btn-press group block w-full"
          >
            <MagicCard
              className="rounded-2xl"
              gradientFrom="#94a3b8"
              gradientTo="#cbd5e1"
              gradientSize={200}
              spotlightColor="rgba(100, 116, 139, 0.08)"
            >
              <div className="text-left px-5 py-4 text-[13px] font-medium text-foreground">
                {step.options[i].text}
              </div>
            </MagicCard>
          </button>
        ))}
      </div>
    </div>
  );
}
