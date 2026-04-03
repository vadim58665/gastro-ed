"use client";

import { useState } from "react";
import type { TestQuestion } from "@/types/accreditation";

interface Props {
  question: TestQuestion;
  mode: "learn" | "test" | "exam";
  onAnswer?: (isCorrect: boolean) => void;
  onNext?: () => void;
}

export default function QuestionView({ question, mode, onAnswer, onNext }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(mode === "learn");

  const handleSelect = (index: number) => {
    if (selected !== null && mode !== "learn") return;
    setSelected(index);

    if (mode !== "learn") {
      setShowResult(true);
      const isCorrect = index === question.correctIndex;
      onAnswer?.(isCorrect);
    }
  };

  const handleNext = () => {
    setSelected(null);
    setShowResult(mode === "learn");
    onNext?.();
  };

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
              disabled={selected !== null && mode !== "learn"}
              className={`w-full text-left px-4 py-3 rounded-xl border ${borderClass} ${bgClass} transition-all text-sm`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showResult && question.explanation && selected !== null && (
        <div className="mt-4 px-4 py-3 bg-surface rounded-xl animate-result">
          <p className="text-xs text-muted leading-relaxed">
            {question.explanation}
          </p>
        </div>
      )}

      {((mode !== "exam" && selected !== null) || mode === "learn") && (
        <button
          onClick={handleNext}
          className="w-full mt-4 py-3 text-xs uppercase tracking-[0.15em] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Следующий вопрос
        </button>
      )}
    </div>
  );
}
