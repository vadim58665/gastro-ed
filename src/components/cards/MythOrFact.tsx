"use client";

import { useState } from "react";
import type { MythOrFactCard } from "@/types/card";
import AnswerOption from "@/components/ui/AnswerOption";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

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

  const correctChoice = card.isMyth ? "myth" : "fact";

  function optState(choice: "myth" | "fact"): "neutral" | "correct" | "wrong" | "dim" {
    if (!answered) return "neutral";
    if (choice === correctChoice) return "correct";
    if (choice === answer) return "wrong";
    return "dim";
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="aurora-card-type">
        Миф или Факт?
      </div>
      <div className="bg-surface rounded-2xl p-6 text-center">
        <div className="text-lg leading-relaxed font-semibold text-foreground">
          &laquo;{card.statement}&raquo;
        </div>
      </div>

      <div className="flex gap-4">
        <AnswerOption
          state={optState("myth")}
          onClick={() => handleAnswer("myth")}
          className="flex-1 text-center"
        >
          Миф
        </AnswerOption>
        <AnswerOption
          state={optState("fact")}
          onClick={() => handleAnswer("fact")}
          className="flex-1 text-center"
        >
          Факт
        </AnswerOption>
      </div>

      {answered && (
        <ExplanationPanel
          correct={isCorrect}
          title={`${isCorrect ? "Верно!" : "Неверно!"} Это ${card.isMyth ? "МИФ" : "ФАКТ"}.`}
        >
          {card.explanation}
        </ExplanationPanel>
      )}
    </div>
  );
}
