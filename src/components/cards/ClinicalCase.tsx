"use client";

import { useState, useMemo } from "react";
import type { ClinicalCaseCard } from "@/types/card";
import AnswerOption from "@/components/ui/AnswerOption";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

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
      <div className="aurora-card-type">
        Клиническая задачка
      </div>
      <div className="aurora-scenario">
        {card.scenario}
      </div>
      <div className="text-base font-bold text-foreground">{card.question}</div>
      <div className="flex flex-col gap-3">
        {shuffledIndices.map((i) => {
          const opt = card.options[i];
          let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
          if (answered) {
            if (opt.isCorrect) state = "correct";
            else if (i === selected) state = "wrong";
            else state = "dim";
          }
          return (
            <AnswerOption key={i} state={state} onClick={() => handleSelect(i)}>
              {opt.text}
            </AnswerOption>
          );
        })}
      </div>
      {answered && (
        <ExplanationPanel correct={card.options[selected].isCorrect}>
          {card.options[selected].explanation}
        </ExplanationPanel>
      )}
    </div>
  );
}
