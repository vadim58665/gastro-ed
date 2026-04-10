"use client";

import { useState, useMemo } from "react";
import type { RedFlagsCard } from "@/types/card";

interface Props {
  card: RedFlagsCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function RedFlags({ card, onAnswer }: Props) {
  const shuffledIndices = useMemo(() => {
    const indices = card.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [card.id]);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggleOption = (index: number) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    setSubmitted(true);
    const dangerIndices = new Set(
      card.options.map((o, i) => (o.isDanger ? i : -1)).filter((i) => i >= 0)
    );
    const isCorrect =
      selected.size === dangerIndices.size &&
      [...selected].every((i) => dangerIndices.has(i));
    onAnswer(isCorrect);
  };

  const dangerCount = card.options.filter((o) => o.isDanger).length;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="text-xs font-bold text-muted uppercase tracking-widest">
        Красные флаги
      </div>

      <div className="text-sm text-foreground/70 font-medium">{card.scenario}</div>

      <div className="flex flex-col gap-2.5">
        {shuffledIndices.map((i) => {
          const opt = card.options[i];
          let style = selected.has(i)
            ? "border-danger bg-danger-light text-danger"
            : "border-border bg-card text-foreground/70";

          if (submitted) {
            if (opt.isDanger && selected.has(i))
              style = "border-success bg-success-light text-emerald-800";
            else if (opt.isDanger && !selected.has(i))
              style = "border-warning bg-warning-light text-amber-800";
            else if (!opt.isDanger && selected.has(i))
              style = "border-danger bg-danger-light text-rose-800";
            else style = "border-border bg-card opacity-40";
          }

          return (
            <button
              key={i}
              onClick={() => toggleOption(i)}
              className={`btn-press flex items-center gap-3 text-left px-6 py-4 rounded-full border-2 transition-all text-sm font-medium ${style}`}
            >
              <span
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs flex-shrink-0 ${
                  selected.has(i) || (submitted && opt.isDanger)
                    ? "border-current bg-current/10"
                    : "border-border"
                }`}
              >
                {(selected.has(i) || (submitted && opt.isDanger)) && "✓"}
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={selected.size === 0}
          className="btn-press mt-2 py-4 rounded-full bg-foreground text-background font-bold text-base disabled:opacity-30 transition-opacity shadow-lg shadow-foreground/20"
        >
          Проверить ({selected.size}/{dangerCount} флагов)
        </button>
      ) : (
        <div className="animate-result mt-1 p-5 rounded-2xl bg-danger-light border border-danger/20 text-rose-800 text-sm leading-relaxed">
          {card.explanation}
        </div>
      )}
    </div>
  );
}
