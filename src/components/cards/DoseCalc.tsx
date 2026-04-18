"use client";

import { useState } from "react";
import type { DoseCalcCard } from "@/types/card";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

interface Props {
  card: DoseCalcCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function DoseCalc({ card, onAnswer }: Props) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const numericValue = parseFloat(value.replace(",", "."));
  const isCorrect =
    submitted &&
    !isNaN(numericValue) &&
    Math.abs(numericValue - card.correctAnswer) / Math.max(card.correctAnswer, 0.001) <=
      card.tolerance;

  function handleSubmit() {
    if (!value.trim() || submitted) return;
    setSubmitted(true);
    const num = parseFloat(value.replace(",", "."));
    const correct =
      !isNaN(num) &&
      Math.abs(num - card.correctAnswer) / Math.max(card.correctAnswer, 0.001) <=
        card.tolerance;
    onAnswer(correct);
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="aurora-card-type">Рассчитай дозу</div>

      <p className="aurora-scenario">{card.scenario}</p>

      {/* Params */}
      <div className="bg-surface rounded-2xl p-4 space-y-2">
        {card.params.map((p, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-muted">{p.label}</span>
            <span className="text-sm font-medium text-foreground">{p.value}</span>
          </div>
        ))}
      </div>

      <p className="text-sm font-medium text-foreground">{card.question}</p>

      {!submitted ? (
        <div className="flex gap-3 items-center">
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="0"
            className="flex-1 px-5 py-4 rounded-full bg-card border-2 border-border text-foreground placeholder-muted focus:border-[#6366F1]/60 focus:outline-none transition-colors text-sm text-right"
          />
          <span className="text-sm text-muted shrink-0">{card.unit}</span>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="btn-premium-dark px-8 py-4 rounded-full disabled:opacity-30"
          >
            OK
          </button>
        </div>
      ) : (
        <>
          {/* Formula reveal */}
          <div className="bg-surface border border-border rounded-2xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-widest font-medium mb-2">
              Формула
            </p>
            <p className="text-sm text-foreground font-mono leading-relaxed">
              {card.formula}
            </p>
            <p className="text-lg font-medium text-foreground mt-2">
              = {card.correctAnswer} {card.unit}
            </p>
          </div>

          <ExplanationPanel
            correct={isCorrect}
            title={isCorrect ? "Верно!" : `Ваш ответ: ${value} ${card.unit}`}
          >
            {card.explanation}
          </ExplanationPanel>
        </>
      )}
    </div>
  );
}
