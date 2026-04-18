"use client";

import { useState, useMemo } from "react";
import type { CauseChainCard } from "@/types/card";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

interface Props {
  card: CauseChainCard;
  onAnswer: (isCorrect: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function CauseChain({ card, onAnswer }: Props) {
  const blankIndices = useMemo(
    () => card.steps.map((s, i) => (s.isBlank ? i : -1)).filter((i) => i >= 0),
    [card]
  );

  const shuffledOptions = useMemo(() => shuffle(card.options), [card]);

  const [filled, setFilled] = useState<Map<number, string>>(new Map());
  const [pool, setPool] = useState<string[]>(shuffledOptions);
  const [submitted, setSubmitted] = useState(false);

  function handlePoolTap(option: string) {
    if (submitted) return;
    const firstEmpty = blankIndices.find((i) => !filled.has(i));
    if (firstEmpty === undefined) return;

    const next = new Map(filled);
    next.set(firstEmpty, option);
    setFilled(next);
    setPool(pool.filter((p) => p !== option));
  }

  function handleSlotTap(slotIdx: number) {
    if (submitted) return;
    const val = filled.get(slotIdx);
    if (!val) return;

    const next = new Map(filled);
    next.delete(slotIdx);
    setFilled(next);
    setPool([...pool, val]);
  }

  function handleSubmit() {
    setSubmitted(true);
    const allCorrect = blankIndices.every(
      (i) => filled.get(i) === card.steps[i].text
    );
    onAnswer(allCorrect);
  }

  const allFilled = blankIndices.every((i) => filled.has(i));

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="aurora-card-type">Цепочка причин</div>

      <p className="text-sm font-medium text-foreground">{card.title}</p>

      {/* Chain */}
      <div className="flex flex-col items-center gap-0">
        {card.steps.map((step, i) => {
          const isBlank = step.isBlank;
          const filledValue = filled.get(i);
          const isCorrect = submitted && filledValue === step.text;
          const isWrong = submitted && isBlank && filledValue !== step.text;

          return (
            <div key={i} className="flex flex-col items-center w-full">
              {i > 0 && (
                <svg width="12" height="20" viewBox="0 0 12 20" className="my-1" style={{ color: "rgba(99,102,241,0.4)" }}>
                  <path d="M6 0v14M2 10l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}

              {isBlank ? (
                <button
                  onClick={() => handleSlotTap(i)}
                  disabled={submitted || !filledValue}
                  style={
                    submitted
                      ? isCorrect
                        ? { background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.4)", color: "#6366F1" }
                        : { background: "rgba(236,72,153,0.08)", borderColor: "rgba(236,72,153,0.35)", color: "#EC4899" }
                      : filledValue
                      ? { background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.3)" }
                      : {}
                  }
                  className={`w-full px-4 py-3 rounded-xl border-2 text-sm text-center transition-colors ${
                    !submitted && !filledValue
                      ? "border-dashed border-foreground/25 text-muted"
                      : ""
                  }`}
                >
                  {submitted && isWrong ? (
                    <div>
                      <span className="line-through opacity-50">{filledValue}</span>
                      <span className="block text-xs font-medium mt-1">{step.text}</span>
                    </div>
                  ) : (
                    filledValue || "???"
                  )}
                </button>
              ) : (
                <div className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground text-center">
                  {step.text}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Option pool */}
      {!submitted && pool.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {pool.map((opt) => (
            <button
              key={opt}
              onClick={() => handlePoolTap(opt)}
              className="px-3 py-2 rounded-lg border border-border bg-surface text-xs text-foreground hover:border-foreground/40 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {!submitted && allFilled && (
        <button
          onClick={handleSubmit}
          className="btn-press w-full py-4 rounded-full bg-foreground text-background font-bold shadow-lg shadow-foreground/20"
        >
          Проверить
        </button>
      )}

      {submitted && (
        <ExplanationPanel
          correct={blankIndices.every((i) => filled.get(i) === card.steps[i].text)}
          title={
            blankIndices.every((i) => filled.get(i) === card.steps[i].text)
              ? "Верно!"
              : "Не совсем"
          }
        >
          {card.explanation}
        </ExplanationPanel>
      )}
    </div>
  );
}
