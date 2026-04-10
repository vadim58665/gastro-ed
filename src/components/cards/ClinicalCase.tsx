"use client";

import { useState, useMemo } from "react";
import type { ClinicalCaseCard } from "@/types/card";

interface Props {
  card: ClinicalCaseCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function ClinicalCase({ card, onAnswer }: Props) {
  const shuffledIndices = useMemo(() => {
    const indices = card.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [card.id]);

  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    onAnswer(card.options[index].isCorrect);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="text-xs font-bold text-muted uppercase tracking-widest">
        Клиническая задачка
      </div>
      <div className="bg-surface rounded-2xl p-4 text-sm leading-relaxed text-foreground/80">
        {card.scenario}
      </div>
      <div className="text-base font-bold text-foreground">{card.question}</div>
      <div className="flex flex-col gap-3">
        {shuffledIndices.map((i) => {
          const opt = card.options[i];
          let style =
            "border-border bg-card hover:bg-surface text-foreground";
          if (answered) {
            if (opt.isCorrect)
              style = "border-success bg-success/10 text-success";
            else if (i === selected)
              style = "border-danger bg-danger/10 text-danger";
            else style = "border-border bg-card opacity-40 text-foreground";
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`btn-press text-left px-6 py-5 rounded-full border-2 transition-all text-sm font-medium ${style}${answered && opt.isCorrect ? ' animate-correct' : ''}${answered && i === selected && !opt.isCorrect ? ' animate-wrong' : ''}`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={`animate-result mt-1 p-4 rounded-2xl text-sm leading-relaxed ${
            card.options[selected].isCorrect
              ? "bg-success/10 border border-success/30 text-success"
              : "bg-danger/10 border border-danger/30 text-danger"
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
