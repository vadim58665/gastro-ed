"use client";

import { useState } from "react";
import type { FillBlankCard } from "@/types/card";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

interface Props {
  card: FillBlankCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function FillBlank({ card, onAnswer }: Props) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isCorrect =
    submitted &&
    card.acceptableAnswers.some(
      (a) => a.toLowerCase().trim() === value.toLowerCase().trim()
    );

  const handleSubmit = () => {
    if (!value.trim() || submitted) return;
    setSubmitted(true);
    onAnswer(
      card.acceptableAnswers.some(
        (a) => a.toLowerCase().trim() === value.toLowerCase().trim()
      )
    );
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="aurora-card-type">
        Заверши фразу
      </div>

      <div className="bg-surface rounded-2xl p-6 text-center">
        <span className="text-base leading-relaxed text-foreground">
          {card.textBefore}{" "}
          <span className="inline-block min-w-[60px] border-b-2 border-dashed border-muted mx-1 text-foreground font-bold">
            {submitted ? card.correctAnswer : value || "___"}
          </span>{" "}
          {card.textAfter}
        </span>
      </div>

      {!submitted ? (
        <div className="flex gap-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={card.hint || "Ваш ответ..."}
            className="flex-1 px-5 py-4 rounded-full bg-card border-2 border-border text-foreground placeholder-muted focus:border-primary focus:outline-none transition-colors text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="btn-press px-8 py-4 rounded-full bg-foreground text-background font-bold disabled:opacity-30 transition-opacity shadow-lg shadow-foreground/20"
          >
            OK
          </button>
        </div>
      ) : (
        <ExplanationPanel
          correct={isCorrect}
          title={isCorrect ? "Верно!" : `Ответ: ${card.correctAnswer}`}
        >
          {card.explanation}
        </ExplanationPanel>
      )}
    </div>
  );
}
