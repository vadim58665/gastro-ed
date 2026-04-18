"use client";

import { useState, useMemo } from "react";
import type { VisualQuizCard } from "@/types/card";
import AnswerOption from "@/components/ui/AnswerOption";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

interface Props {
  card: VisualQuizCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function VisualQuiz({ card, onAnswer }: Props) {
  const shuffledIndices = useMemo(() => {
    const indices = card.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [card.id]);

  const [selected, setSelected] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);
  const answered = selected !== null;

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    onAnswer(card.options[index].isCorrect);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="aurora-card-type">Что на снимке?</div>

      <div className="aurora-hairline rounded-2xl overflow-hidden bg-surface">
        {imgError || card.imageUrl.includes("placeholder") ? (
          <div className="w-full h-48 flex items-center justify-center bg-surface border border-border/50 rounded-2xl">
            <div className="text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-muted mb-2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="text-xs text-muted">Описание ниже</p>
            </div>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={card.imageUrl}
            alt="Медицинский снимок"
            className="w-full h-48 object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      <div className="text-sm font-semibold text-foreground">{card.question}</div>

      <div className="grid grid-cols-2 gap-3">
        {shuffledIndices.map((i) => {
          const opt = card.options[i];
          let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
          if (answered) {
            if (opt.isCorrect) state = "correct";
            else if (i === selected) state = "wrong";
            else state = "dim";
          }
          return (
            <AnswerOption
              key={i}
              state={state}
              onClick={() => handleSelect(i)}
              className="py-5 px-4 rounded-full text-sm text-center"
            >
              {opt.text}
            </AnswerOption>
          );
        })}
      </div>

      {answered && (
        <ExplanationPanel correct={card.options[selected].isCorrect}>
          {card.explanation}
        </ExplanationPanel>
      )}
    </div>
  );
}
