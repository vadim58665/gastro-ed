"use client";

import { useState, useMemo } from "react";
import type { MatchPairsCard } from "@/types/card";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

interface Props {
  card: MatchPairsCard;
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

export default function MatchPairs({ card, onAnswer }: Props) {
  const leftItems = useMemo(() => shuffle(card.pairs.map((p) => p.left)), [card]);
  const rightItems = useMemo(() => shuffle(card.pairs.map((p) => p.right)), [card]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Map<string, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);

  const correctMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of card.pairs) m.set(p.left, p.right);
    return m;
  }, [card]);

  function handleLeftTap(item: string) {
    if (submitted) return;
    if (matched.has(item)) {
      const next = new Map(matched);
      next.delete(item);
      setMatched(next);
      return;
    }
    setSelectedLeft(item);
  }

  function handleRightTap(item: string) {
    if (submitted || !selectedLeft) return;
    const alreadyUsed = [...matched.values()].includes(item);
    if (alreadyUsed) return;

    const next = new Map(matched);
    next.set(selectedLeft, item);
    setMatched(next);
    setSelectedLeft(null);
  }

  function handleSubmit() {
    if (matched.size !== card.pairs.length) return;
    setSubmitted(true);
    const allCorrect = [...matched.entries()].every(
      ([l, r]) => correctMap.get(l) === r
    );
    onAnswer(allCorrect);
  }

  const correctCount = submitted
    ? [...matched.entries()].filter(([l, r]) => correctMap.get(l) === r).length
    : 0;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="aurora-card-type">Сопоставление</div>

      <p className="text-sm text-muted">{card.instruction}</p>

      <div className="grid grid-cols-2 gap-2">
        {/* Left column */}
        <div className="space-y-2">
          {leftItems.map((item) => {
            const isSelected = selectedLeft === item;
            const isMatched = matched.has(item);

            let styleOverride: React.CSSProperties = {};
            let extraClass = "bg-surface border-border";
            if (submitted) {
              const right = matched.get(item);
              if (correctMap.get(item) === right) {
                extraClass = "";
                styleOverride = {
                  background: "rgba(99,102,241,0.1)",
                  borderColor: "rgba(99,102,241,0.35)",
                  color: "#6366F1",
                };
              } else {
                extraClass = "";
                styleOverride = {
                  background: "rgba(236,72,153,0.08)",
                  borderColor: "rgba(236,72,153,0.3)",
                  color: "#EC4899",
                };
              }
            } else if (isSelected) {
              extraClass = "";
              styleOverride = {
                background: "rgba(99,102,241,0.12)",
                borderColor: "rgba(99,102,241,0.5)",
              };
            } else if (isMatched) {
              extraClass = "";
              styleOverride = {
                background: "rgba(99,102,241,0.06)",
                borderColor: "rgba(99,102,241,0.2)",
              };
            }

            return (
              <button
                key={item}
                onClick={() => handleLeftTap(item)}
                disabled={submitted}
                style={styleOverride}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs leading-snug transition-colors ${extraClass}`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          {rightItems.map((item) => {
            const pairedLeft = [...matched.entries()].find(
              ([, r]) => r === item
            )?.[0];
            const isPaired = !!pairedLeft;

            let styleOverride: React.CSSProperties = {};
            let extraClass = "bg-surface border-border";
            if (submitted && pairedLeft) {
              if (correctMap.get(pairedLeft) === item) {
                extraClass = "";
                styleOverride = {
                  background: "rgba(99,102,241,0.1)",
                  borderColor: "rgba(99,102,241,0.35)",
                  color: "#6366F1",
                };
              } else {
                extraClass = "";
                styleOverride = {
                  background: "rgba(236,72,153,0.08)",
                  borderColor: "rgba(236,72,153,0.3)",
                  color: "#EC4899",
                };
              }
            } else if (isPaired) {
              extraClass = "";
              styleOverride = {
                background: "rgba(99,102,241,0.06)",
                borderColor: "rgba(99,102,241,0.2)",
              };
            }

            return (
              <button
                key={item}
                onClick={() => handleRightTap(item)}
                disabled={submitted || isPaired}
                style={styleOverride}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs leading-snug transition-colors ${extraClass}`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {!submitted && matched.size === card.pairs.length && (
        <button
          onClick={handleSubmit}
          className="btn-press w-full py-4 rounded-full bg-foreground text-background font-bold shadow-lg shadow-foreground/20 transition-opacity"
        >
          Проверить ({matched.size}/{card.pairs.length})
        </button>
      )}

      {submitted && (
        <ExplanationPanel
          correct={correctCount === card.pairs.length}
          title={
            correctCount === card.pairs.length
              ? "Верно!"
              : `${correctCount} из ${card.pairs.length} правильно`
          }
        >
          <div className="space-y-1.5 mt-1">
            {card.pairs.map((p, i) => (
              <p key={i} className="text-xs">
                <span className="font-medium">{p.left}</span> - {p.right}: {p.explanation}
              </p>
            ))}
          </div>
        </ExplanationPanel>
      )}
    </div>
  );
}
