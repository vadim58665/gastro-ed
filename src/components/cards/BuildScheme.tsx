"use client";

import { useState, useMemo } from "react";
import type { BuildSchemeCard } from "@/types/card";

interface Props {
  card: BuildSchemeCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function BuildScheme({ card, onAnswer }: Props) {
  const isOrdering = !!card.correctOrder;

  const shuffledIndices = useMemo(() => {
    const indices = card.components.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [card.id]);

  // Multi-select mode state
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Ordering mode state
  const [orderedSelection, setOrderedSelection] = useState<number[]>([]);

  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  const toggleComponent = (index: number) => {
    if (submitted) return;

    if (isOrdering) {
      setOrderedSelection((prev) => {
        const pos = prev.indexOf(index);
        if (pos >= 0) {
          return prev.filter((i) => i !== index);
        }
        return [...prev, index];
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    }
  };

  const handleSubmit = () => {
    if (isOrdering) {
      const isCorrect =
        orderedSelection.length === card.correctOrder!.length &&
        orderedSelection.every((idx, pos) => idx === card.correctOrder![pos]);
      setSubmitted(true);
      setWasCorrect(isCorrect);
      onAnswer(isCorrect);
    } else {
      const correctIndices = new Set(
        card.components.map((c, i) => (c.isCorrect ? i : -1)).filter((i) => i >= 0)
      );
      const isCorrect =
        selected.size === correctIndices.size &&
        [...selected].every((i) => correctIndices.has(i));
      setSubmitted(true);
      setWasCorrect(isCorrect);
      onAnswer(isCorrect);
    }
  };

  const correctCount = isOrdering
    ? card.correctOrder!.length
    : card.components.filter((c) => c.isCorrect).length;

  const currentCount = isOrdering ? orderedSelection.length : selected.size;
  const canSubmit = currentCount > 0;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="text-xs font-bold text-muted uppercase tracking-widest">
        {isOrdering ? "Расставь по порядку" : "Собери схему"}
      </div>
      <div className="text-base font-bold text-foreground">{card.title}</div>
      <div className="text-sm text-foreground/60">
        {isOrdering
          ? "Нажимайте на шаги в правильном порядке"
          : card.instruction}
      </div>

      <div className={isOrdering ? "flex flex-col gap-2.5" : "flex flex-wrap gap-2.5"}>
        {shuffledIndices.map((i) => {
          const comp = card.components[i];
          const isSelected = isOrdering
            ? orderedSelection.includes(i)
            : selected.has(i);
          const orderPos = isOrdering ? orderedSelection.indexOf(i) : -1;
          const correctPos = isOrdering && submitted
            ? card.correctOrder!.indexOf(i)
            : -1;

          let style = isSelected
            ? "border-primary bg-primary-light text-primary"
            : "border-border bg-card text-foreground/70";

          if (submitted) {
            if (isOrdering) {
              if (correctPos >= 0 && orderPos >= 0 && orderPos === correctPos)
                style = "border-success bg-success-light text-emerald-700";
              else if (correctPos >= 0 && orderPos >= 0 && orderPos !== correctPos)
                style = "border-warning bg-warning-light text-amber-700";
              else if (correctPos >= 0 && orderPos < 0)
                style = "border-success/50 bg-success-light/50 text-emerald-600";
              else if (correctPos < 0 && orderPos >= 0)
                style = "border-danger bg-danger-light text-rose-700";
              else
                style = "border-border bg-card opacity-30";
            } else {
              if (comp.isCorrect && isSelected)
                style = "border-success bg-success-light text-emerald-700";
              else if (comp.isCorrect && !isSelected)
                style = "border-success/50 bg-success-light/50 text-emerald-600";
              else if (!comp.isCorrect && isSelected)
                style = "border-danger bg-danger-light text-rose-700";
              else style = "border-border bg-card opacity-30";
            }
          }

          return (
            <button
              key={i}
              onClick={() => toggleComponent(i)}
              className={`btn-press ${
                isOrdering
                  ? "flex items-center gap-3 text-left px-5 py-4 rounded-2xl"
                  : "px-5 py-3 rounded-full"
              } border-2 text-sm font-semibold transition-all ${style}`}
            >
              {isOrdering && (
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    submitted && correctPos >= 0
                      ? "bg-current/10 border-2 border-current"
                      : isSelected
                        ? "bg-primary text-white"
                        : "border-2 border-border text-foreground/30"
                  }`}
                >
                  {submitted && correctPos >= 0
                    ? correctPos + 1
                    : isSelected
                      ? orderPos + 1
                      : ""}
                </span>
              )}
              {comp.text}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-press mt-2 py-4 rounded-full bg-primary text-white font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-primary/20"
        >
          {isOrdering
            ? `Проверить (${currentCount}/${correctCount} шагов)`
            : `Проверить (${currentCount}/${correctCount})`}
        </button>
      ) : (
        <div className={`animate-result mt-1 p-5 rounded-2xl text-sm font-medium ${
          wasCorrect
            ? "bg-success-light border border-success/30 text-emerald-800"
            : "bg-danger-light border border-danger/30 text-rose-800"
        }`}>
          {wasCorrect ? card.successMessage : `Неверно. ${card.successMessage}`}
        </div>
      )}
    </div>
  );
}
