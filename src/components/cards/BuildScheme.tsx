"use client";

import { useState } from "react";
import type { BuildSchemeCard } from "@/types/card";

interface Props {
  card: BuildSchemeCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function BuildScheme({ card, onAnswer }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  const toggleComponent = (index: number) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSubmit = () => {
    const correctIndices = new Set(
      card.components.map((c, i) => (c.isCorrect ? i : -1)).filter((i) => i >= 0)
    );
    const isCorrect =
      selected.size === correctIndices.size &&
      [...selected].every((i) => correctIndices.has(i));
    setSubmitted(true);
    setWasCorrect(isCorrect);
    onAnswer(isCorrect);
  };

  const correctCount = card.components.filter((c) => c.isCorrect).length;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">
        Собери схему
      </div>
      <div className="text-base font-bold text-foreground">{card.title}</div>
      <div className="text-sm text-foreground/60">{card.instruction}</div>

      <div className="flex flex-wrap gap-2.5">
        {card.components.map((comp, i) => {
          let style = selected.has(i)
            ? "border-primary bg-primary-light text-primary"
            : "border-border bg-white text-foreground/70";

          if (submitted) {
            if (comp.isCorrect && selected.has(i))
              style = "border-success bg-success-light text-emerald-700";
            else if (comp.isCorrect && !selected.has(i))
              style = "border-success/50 bg-success-light/50 text-emerald-600";
            else if (!comp.isCorrect && selected.has(i))
              style = "border-danger bg-danger-light text-rose-700";
            else style = "border-border bg-white opacity-30";
          }

          return (
            <button
              key={i}
              onClick={() => toggleComponent(i)}
              className={`btn-press px-5 py-3 rounded-full border-2 text-sm font-semibold transition-all ${style}`}
            >
              {comp.text}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0}
          className="btn-press mt-2 py-4 rounded-full bg-primary text-white font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-primary/20"
        >
          Проверить ({selected.size}/{correctCount})
        </button>
      ) : (
        <div className={`animate-result mt-1 p-5 rounded-2xl text-sm font-medium ${
          wasCorrect
            ? "bg-success-light border border-success/30 text-emerald-800"
            : "bg-danger-light border border-danger/30 text-rose-800"
        }`}>
          {wasCorrect ? card.successMessage : `Неверно. Правильный ответ: ${card.successMessage}`}
        </div>
      )}
    </div>
  );
}
