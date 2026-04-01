"use client";

import { useState } from "react";
import type { ClinicalCaseCard } from "@/types/card";

interface Props {
  card: ClinicalCaseCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function ClinicalCase({ card, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    onAnswer(card.options[index].isCorrect);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="text-xs font-bold text-primary uppercase tracking-widest">
        Клиническая задачка
      </div>
      <div className="bg-surface rounded-2xl p-4 text-sm leading-relaxed text-foreground/80">
        {card.scenario}
      </div>
      <div className="text-base font-bold text-foreground">{card.question}</div>
      <div className="flex flex-col gap-3">
        {card.options.map((opt, i) => {
          let style =
            "border-border bg-white hover:bg-surface text-foreground";
          if (answered) {
            if (opt.isCorrect)
              style = "border-success bg-success-light text-emerald-800";
            else if (i === selected)
              style = "border-danger bg-danger-light text-rose-800";
            else style = "border-border bg-white opacity-40 text-foreground";
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`btn-press text-left px-6 py-5 rounded-full border-2 transition-all text-sm font-medium ${style}`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={`mt-1 p-4 rounded-2xl text-sm leading-relaxed ${
            card.options[selected].isCorrect
              ? "bg-success-light border border-success/30 text-emerald-800"
              : "bg-danger-light border border-danger/30 text-rose-800"
          }`}
        >
          <div className="font-bold mb-1">
            {card.options[selected].isCorrect ? "Верно!" : "Неверно"}
          </div>
          {card.options[selected].explanation}
        </div>
      )}
    </div>
  );
}
