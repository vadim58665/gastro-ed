"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { DailyCase, DailyCaseStep, StepResult } from "@/types/dailyCase";
import { calculateStepPoints, STEP_TIME_LIMIT } from "@/types/dailyCase";
import { saveSession, type StoredSession } from "@/lib/dailyCaseSession";
import { useMedMind } from "@/contexts/MedMindContext";
import AuroraTimer from "@/components/ui/AuroraTimer";
import AuroraStages from "@/components/ui/AuroraStages";

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

  // Running score
  const currentPoints = stepResults.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Timer row + optional points (prevents overlap with stages labels below) */}
      <div className="flex items-center gap-4">
        {currentPoints > 0 && (
          <div className="shrink-0">
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/50 font-semibold">
              очки
            </div>
            <div className="text-2xl font-extralight aurora-text tabular-nums leading-none mt-0.5">
              {currentPoints}
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <AuroraTimer timeLeftMs={timeLeft} totalMs={STEP_TIME_LIMIT} />
        </div>
      </div>

      {/* Stages (full width, no competing right-aligned content) */}
      <AuroraStages
        stages={dailyCase.steps.map((s) => stepLabels[s.type])}
        currentIndex={currentStep}
      />

      {/* Step content */}
      <div key={currentStep} className="animate-result flex flex-col gap-4">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "var(--color-aurora-violet)" }}
        >
          {step.title}
        </div>
        <div className="aurora-surface-dark rounded-2xl p-5 text-[13px] leading-relaxed text-white/85">
          {step.description}
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {shuffledIndices.map((i, idx) => {
          const letter = String.fromCharCode(65 + idx);
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className="aurora-opt-dark"
            >
              <span className="aurora-opt-dark-idx">{letter}</span>
              {step.options[i].text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
