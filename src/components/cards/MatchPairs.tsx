"use client";

import { useState, useMemo } from "react";
import type { MatchPairsCard } from "@/types/card";

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
      <div className="text-xs font-bold text-muted uppercase tracking-widest">
        Сопоставление
      </div>

      <p className="text-sm text-muted">{card.instruction}</p>

      <div className="grid grid-cols-2 gap-2">
        {/* Left column */}
        <div className="space-y-2">
          {leftItems.map((item) => {
            const isSelected = selectedLeft === item;
            const isMatched = matched.has(item);
            let bg = "bg-surface border-border";
            if (submitted) {
              const right = matched.get(item);
              bg =
                correctMap.get(item) === right
                  ? "bg-success-light border-success/30"
                  : "bg-danger-light border-danger/30";
            } else if (isSelected) {
              bg = "bg-primary-light border-foreground/40";
            } else if (isMatched) {
              bg = "bg-primary-light/60 border-border";
            }

            return (
              <button
                key={item}
                onClick={() => handleLeftTap(item)}
                disabled={submitted}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs leading-snug transition-colors ${bg}`}
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
            let bg = "bg-surface border-border";
            if (submitted && pairedLeft) {
              bg =
                correctMap.get(pairedLeft) === item
                  ? "bg-success-light border-success/30"
                  : "bg-danger-light border-danger/30";
            } else if (isPaired) {
              bg = "bg-primary-light/60 border-border";
            }

            return (
              <button
                key={item}
                onClick={() => handleRightTap(item)}
                disabled={submitted || isPaired}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs leading-snug transition-colors ${bg}`}
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
        <div
          className={`animate-result p-5 rounded-2xl text-sm leading-relaxed ${
            correctCount === card.pairs.length
              ? "bg-success-light border border-success/30 text-emerald-800"
              : "bg-danger-light border border-danger/30 text-rose-800"
          }`}
        >
          <div className="font-bold mb-2">
            {correctCount === card.pairs.length
              ? "Верно!"
              : `${correctCount} из ${card.pairs.length} правильно`}
          </div>
          <div className="space-y-1.5">
            {card.pairs.map((p, i) => (
              <p key={i} className="text-xs">
                <span className="font-medium">{p.left}</span> - {p.right}: {p.explanation}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
