"use client";

import { useState, useMemo } from "react";
import type { RedFlagsCard } from "@/types/card";
import AnswerOption from "@/components/ui/AnswerOption";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

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

  function optState(i: number): "neutral" | "correct" | "wrong" | "dim" {
    const opt = card.options[i];
    if (!submitted) return "neutral";
    if (opt.isDanger && selected.has(i)) return "correct";   // true positive
    if (opt.isDanger && !selected.has(i)) return "correct";  // missed flag - still highlight as correct answer
    if (!opt.isDanger && selected.has(i)) return "wrong";    // false positive
    return "dim";                                            // not picked, not danger
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="aurora-card-type">
        Красные флаги
      </div>

      <div className="aurora-scenario">
        {card.scenario}
      </div>

      <div className="flex flex-col gap-2.5">
        {shuffledIndices.map((i) => {
          const opt = card.options[i];
          const isChecked = selected.has(i);
          const state = optState(i);

          return (
            <AnswerOption key={i} state={state} onClick={() => toggleOption(i)}>
              <span
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs flex-shrink-0 mr-3 ${
                  isChecked || (submitted && opt.isDanger)
                    ? "border-current bg-current/10"
                    : "border-border"
                }`}
              >
                {(isChecked || (submitted && opt.isDanger)) && "✓"}
              </span>
              {opt.text}
            </AnswerOption>
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
        <ExplanationPanel correct={false}>
          {card.explanation}
        </ExplanationPanel>
      )}
    </div>
  );
}
