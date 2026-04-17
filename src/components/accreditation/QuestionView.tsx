"use client";

import { useState, useEffect, useRef } from "react";
import type { TestQuestion } from "@/types/accreditation";
import HintButton from "@/components/feed/HintButton";
import AutoExplain from "@/components/feed/AutoExplain";
import { useMedMind } from "@/contexts/MedMindContext";

interface Props {
  question: TestQuestion;
  mode: "learn" | "test" | "exam";
  specialtyId?: string;
  onAnswer?: (isCorrect: boolean, selectedIndex: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  canGoPrevious?: boolean;
  existingSelectedIndex?: number | null;
}

export default function QuestionView({
  question,
  mode,
  specialtyId,
  onAnswer,
  onNext,
  onPrevious,
  canGoPrevious,
  existingSelectedIndex = null,
}: Props) {
  const hasExisting = existingSelectedIndex !== null && existingSelectedIndex !== undefined;
  const [selected, setSelected] = useState<number | null>(hasExisting ? existingSelectedIndex! : null);
  const [showResult, setShowResult] = useState(mode === "learn" || hasExisting);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setScreen } = useMedMind();

  // Publish current screen context to MedMind so the AI assistant knows
  // which question is open, in which mode, and whether it's been answered.
  useEffect(() => {
    setScreen({
      kind: "accred_question",
      question,
      specialtyId: specialtyId ?? question.specialty,
      mode,
      isAnswered: selected !== null,
      selectedIndex: selected ?? undefined,
    });
  }, [question, mode, specialtyId, selected, setScreen]);

  const handleNext = () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setSelected(null);
    setShowResult(mode === "learn");
    onNext?.();
  };

  const handlePrevious = () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    onPrevious?.();
  };

  const handleSelect = (index: number) => {
    if (hasExisting) return; // already answered, locked in review mode
    if (selected !== null && mode !== "learn") return;
    setSelected(index);

    if (mode !== "learn") {
      setShowResult(true);
      const isCorrect = index === question.correctIndex;
      onAnswer?.(isCorrect, index);

      // Auto-advance in "test" mode (Тренировка/Зачёт с ответами)
      if (mode === "test") {
        const delay = isCorrect ? 900 : 1800;
        autoAdvanceRef.current = setTimeout(() => {
          handleNext();
        }, delay);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  const showNextButton =
    (mode !== "exam" && selected !== null) || mode === "learn" || hasExisting;

  return (
    <div className="px-6 py-5">
      <p className="text-sm text-foreground leading-relaxed mb-6">
        {question.question}
      </p>

      <div className="space-y-2">
        {question.options.map((option, index) => {
          let borderClass = "border-border";
          let bgClass = "bg-card";

          if (showResult && index === question.correctIndex) {
            borderClass = "border-emerald-300";
            bgClass = "bg-emerald-50";
          } else if (showResult && selected === index && index !== question.correctIndex) {
            borderClass = "border-rose-300";
            bgClass = "bg-rose-50";
          } else if (selected === index) {
            borderClass = "border-primary/50";
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={(selected !== null && mode !== "learn") || hasExisting}
              className={`w-full text-left px-4 py-3 rounded-xl border ${borderClass} ${bgClass} transition-all text-sm`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {mode !== "exam" && selected === null && !hasExisting && (
        <HintButton entityId={question.id} entityType="accreditation_question" />
      )}

      {showResult && question.explanation && selected !== null && (
        <div className="mt-4 px-4 py-3 bg-surface rounded-xl animate-result">
          <p className="text-xs text-muted leading-relaxed">
            {question.explanation}
          </p>
        </div>
      )}

      {/* Auto-explain for subscribers after a WRONG answer (not in exam mode). */}
      {mode !== "exam" &&
        showResult &&
        selected !== null &&
        selected !== question.correctIndex && (
          <AutoExplain
            entityId={question.id}
            entityType="accreditation_question"
            trigger={true}
          />
        )}

      <div className="flex items-center gap-2 mt-5">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className="btn-press shrink-0 w-14 h-14 rounded-2xl bg-surface border border-border text-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-default hover:bg-card transition-colors"
          aria-label="Предыдущий вопрос"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {showNextButton && (
          <button
            onClick={handleNext}
            className="btn-press flex-1 h-14 rounded-2xl bg-foreground text-white text-xs uppercase tracking-[0.2em] font-semibold shadow-lg shadow-foreground/15 hover:shadow-xl hover:shadow-foreground/20 transition-all"
          >
            Следующий вопрос
          </button>
        )}
      </div>
    </div>
  );
}
