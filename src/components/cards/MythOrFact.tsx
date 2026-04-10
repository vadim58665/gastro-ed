"use client";

import { useState } from "react";
import type { MythOrFactCard } from "@/types/card";

interface Props {
  card: MythOrFactCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function MythOrFact({ card, onAnswer }: Props) {
  const [answer, setAnswer] = useState<"myth" | "fact" | null>(null);
  const answered = answer !== null;
  const isCorrect = answered && (answer === "myth") === card.isMyth;

  const handleAnswer = (choice: "myth" | "fact") => {
    if (answered) return;
    setAnswer(choice);
    onAnswer((choice === "myth") === card.isMyth);
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="text-xs font-bold text-muted uppercase tracking-widest">
        Миф или Факт?
      </div>
      <div className="bg-surface rounded-2xl p-6 text-center">
        <div className="text-lg leading-relaxed font-semibold text-foreground">
          &laquo;{card.statement}&raquo;
        </div>
      </div>

      {!answered ? (
        <div className="flex gap-4">
          <button
            onClick={() => handleAnswer("myth")}
            className="btn-press flex-1 py-5 rounded-full bg-danger-light border-2 border-danger/30 text-danger font-bold text-lg hover:opacity-90 transition-all"
          >
            Миф
          </button>
          <button
            onClick={() => handleAnswer("fact")}
            className="btn-press flex-1 py-5 rounded-full bg-success-light border-2 border-success/30 text-success font-bold text-lg hover:opacity-90 transition-all"
          >
            Факт
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
          <div className="font-bold mb-1.5 text-base">
            {isCorrect ? "Верно!" : "Неверно!"} Это{" "}
            {card.isMyth ? "МИФ" : "ФАКТ"}.
          </div>
          {card.explanation}
        </div>
      )}
    </div>
  );
}
