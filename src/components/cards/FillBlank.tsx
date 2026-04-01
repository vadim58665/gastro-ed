"use client";

import { useState } from "react";
import type { FillBlankCard } from "@/types/card";

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
      <div className="text-xs font-bold text-teal-500 uppercase tracking-widest">
        Заверши фразу
      </div>

      <div className="bg-surface rounded-2xl p-6 text-center">
        <span className="text-base leading-relaxed text-foreground">
          {card.textBefore}{" "}
          <span className="inline-block min-w-[60px] border-b-2 border-dashed border-teal-400 mx-1 text-teal-600 font-bold">
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
            className="flex-1 px-5 py-4 rounded-full bg-white border-2 border-border text-foreground placeholder-muted focus:border-primary focus:outline-none transition-colors text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="btn-press px-8 py-4 rounded-full bg-teal-500 text-white font-bold disabled:opacity-30 transition-opacity shadow-lg shadow-teal-500/20"
          >
            OK
          </button>
        </div>
      ) : (
        <div
          className={`animate-result p-5 rounded-2xl text-sm leading-relaxed ${
            isCorrect
              ? "bg-success-light border border-success/30 text-emerald-800"
              : "bg-danger-light border border-danger/30 text-rose-800"
          }`}
        >
          <div className="font-bold mb-1">
            {isCorrect ? "Верно!" : `Ответ: ${card.correctAnswer}`}
          </div>
          {card.explanation}
        </div>
      )}
    </div>
  );
}
