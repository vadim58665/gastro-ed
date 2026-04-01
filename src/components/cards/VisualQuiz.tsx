"use client";

import { useState } from "react";
import type { VisualQuizCard } from "@/types/card";

interface Props {
  card: VisualQuizCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function VisualQuiz({ card, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    onAnswer(card.options[index].isCorrect);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
        Что на снимке?
      </div>

      <div className="rounded-2xl overflow-hidden bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.imageUrl}
          alt="Эндоскопический снимок"
          className="w-full h-48 object-cover"
        />
      </div>

      <div className="text-sm font-semibold text-foreground">{card.question}</div>

      <div className="grid grid-cols-2 gap-3">
        {card.options.map((opt, i) => {
          let style = "border-border bg-white text-foreground/70";
          if (answered) {
            if (opt.isCorrect)
              style = "border-success bg-success-light text-emerald-800";
            else if (i === selected)
              style = "border-danger bg-danger-light text-rose-800";
            else style = "border-border bg-white opacity-40";
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`btn-press py-5 px-4 rounded-full border-2 text-sm text-center font-medium transition-all ${style}`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={`animate-result p-4 rounded-2xl text-sm leading-relaxed ${
            card.options[selected].isCorrect
              ? "bg-success-light border border-success/30 text-emerald-800"
              : "bg-danger-light border border-danger/30 text-rose-800"
          }`}
        >
          {card.explanation}
        </div>
      )}
    </div>
  );
}
