"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { DailyCase, DailyCaseStep, StepResult } from "@/types/dailyCase";
import { calculateStepPoints, STEP_TIME_LIMIT } from "@/types/dailyCase";
import { saveSession, type StoredSession } from "@/lib/dailyCaseSession";
import { useMedMind } from "@/contexts/MedMindContext";

interface Props {
  dailyCase: DailyCase;
  dateStr: string;
  initialSession?: StoredSession | null;
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

function makeTimeoutResult(): StepResult {
  return {
    isCorrect: false,
    selectedIndex: -1,
    timeMs: STEP_TIME_LIMIT,
    points: 0,
    timedOut: true,
  };
}

export default function DailyCasePlayer({
  dailyCase,
  dateStr,
  initialSession,
  onComplete,
}: Props) {
  // Таймер абсолютный: отсчитывается от `stepStartTime.current`. Уход
  // на другую вкладку не замораживает время — при возврате catch-up
  // засчитывает пропущенные шаги как timeout, а если прошло больше
  // суммарного времени теста, тест автоматически завершается.
  const [currentStep, setCurrentStep] = useState<number>(
    initialSession?.currentStep ?? 0
  );
  const [stepResults, setStepResults] = useState<StepResult[]>(
    initialSession?.stepResults ?? []
  );
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!initialSession) return STEP_TIME_LIMIT;
    const elapsed = Date.now() - initialSession.stepStartTime;
    return Math.max(0, STEP_TIME_LIMIT - (elapsed % STEP_TIME_LIMIT));
  });
  const stepStartTime = useRef<number>(
    initialSession?.stepStartTime ?? Date.now()
  );
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSteps = dailyCase.steps.length;
  const stepIndex = Math.min(currentStep, totalSteps - 1);
  const step = dailyCase.steps[stepIndex];
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
        stepStartTime.current = Date.now();
        setStepResults(newResults);
        setCurrentStep((s) => s + 1);
      }
    },
    [stepResults, isLastStep, onComplete]
  );

  // Catch-up: пока пользователь был на другой вкладке, setInterval мог
  // не тикать — вручную досчитываем пропущенные шаги как timeout.
  // Если все оставшиеся шаги пропущены, завершаем тест.
  const catchUp = useCallback(() => {
    if (lockedRef.current) return;
    const elapsed = Date.now() - stepStartTime.current;
    if (elapsed < STEP_TIME_LIMIT) return;

    const remainingSteps = totalSteps - currentStep;
    if (remainingSteps <= 0) return;

    const missed = Math.min(
      Math.floor(elapsed / STEP_TIME_LIMIT),
      remainingSteps
    );
    if (missed <= 0) return;

    lockedRef.current = true;
    const timeoutResults = Array.from({ length: missed }, makeTimeoutResult);
    const newResults = [...stepResults, ...timeoutResults];

    if (currentStep + missed >= totalSteps) {
      onComplete(newResults);
      return;
    }

    // Сдвигаем старт следующего шага ровно на missed × LIMIT вперёд,
    // чтобы дробная часть реально прошедшего времени корректно отразилась
    // в таймере оставшегося шага.
    stepStartTime.current += missed * STEP_TIME_LIMIT;
    setStepResults(newResults);
    setCurrentStep((s) => s + missed);
  }, [stepResults, currentStep, totalSteps, onComplete]);

  // Таймер текущего шага.
  useEffect(() => {
    lockedRef.current = false;

    const tick = () => {
      const elapsed = Date.now() - stepStartTime.current;
      const remaining = Math.max(0, STEP_TIME_LIMIT - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) catchUp();
    };

    tick();
    timerRef.current = setInterval(tick, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, catchUp]);

  // Browser throttlит setInterval в скрытых вкладках — при возврате
  // форсируем catch-up, чтобы пропущенное время сразу засчиталось.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") catchUp();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [catchUp]);

  // Persist session on each step / result change.
  useEffect(() => {
    if (stepResults.length >= totalSteps) return; // финал — очистка в page.tsx
    saveSession({
      dateStr,
      caseId: dailyCase.id,
      currentStep,
      stepStartTime: stepStartTime.current,
      stepResults,
    });
  }, [currentStep, stepResults, dateStr, dailyCase.id, totalSteps]);

  // Передаём контекст текущего шага в MedMind, чтобы ассистент знал, что
  // пользователь на странице «Диагноз дня» и на каком именно этапе.
  const { setScreen } = useMedMind();
  useEffect(() => {
    setScreen({
      kind: "daily_case_step",
      caseId: dailyCase.id,
      caseTitle: dailyCase.title,
      stepIndex: currentStep,
      totalSteps,
      stepType: step.type,
      stepTitle: step.title,
      stepDescription: step.description,
      options: step.options.map((o) => o.text),
    });
  }, [
    setScreen,
    dailyCase.id,
    dailyCase.title,
    currentStep,
    totalSteps,
    step.type,
    step.title,
    step.description,
    step.options,
  ]);

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
        <div className="rounded-2xl bg-surface/70 border border-border/40 p-5 text-[13px] leading-relaxed text-foreground/85">
          {step.description}
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {shuffledIndices.map((i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            className="btn-press w-full text-left px-5 py-4 rounded-2xl bg-surface border border-border/40 text-[13px] font-medium text-foreground hover:border-border transition-colors"
          >
            {step.options[i].text}
          </button>
        ))}
      </div>
    </div>
  );
}
