"use client";

import { useState, useMemo } from "react";
import type { PriorityRankCard } from "@/types/card";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

interface Props {
  card: PriorityRankCard;
  onAnswer: (isCorrect: boolean) => void;
}

function shuffle<T>(arr: T[], indices: number[]): number[] {
  const copy = [...indices];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function PriorityRank({ card, onAnswer }: Props) {
  const initialOrder = useMemo(
    () => shuffle(card.items, card.items.map((_, i) => i)),
    [card]
  );

  const [order, setOrder] = useState<number[]>(initialOrder);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleTap(position: number) {
    if (submitted) return;
    if (swapFrom === null) {
      setSwapFrom(position);
    } else {
      if (swapFrom === position) {
        setSwapFrom(null);
        return;
      }
      const next = [...order];
      [next[swapFrom], next[position]] = [next[position], next[swapFrom]];
      setOrder(next);
      setSwapFrom(null);
    }
  }

  function handleSubmit() {
    setSubmitted(true);
    const isCorrect = order.every((idx, pos) => idx === card.correctOrder[pos]);
    onAnswer(isCorrect);
  }

  const correctCount = submitted
    ? order.filter((idx, pos) => idx === card.correctOrder[pos]).length
    : 0;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="aurora-card-type">Шкала приоритетов</div>

      <div className="aurora-scenario">{card.context}</div>

      <p className="text-sm font-medium text-foreground">{card.question}</p>

      <p className="text-[10px] text-muted uppercase tracking-widest">
        Нажмите на два элемента, чтобы поменять их местами
      </p>

      <div className="space-y-2">
        {order.map((itemIdx, position) => {
          const item = card.items[itemIdx];
          const isSwapSource = swapFrom === position;
          const isCorrectPos = submitted && card.correctOrder.indexOf(itemIdx) === position;
          const isWrongPos = submitted && card.correctOrder.indexOf(itemIdx) !== position;

          let styleOverride: React.CSSProperties = {};
          let extraClass = "bg-surface border-border";

          if (submitted) {
            if (isCorrectPos) {
              extraClass = "";
              styleOverride = {
                background: "rgba(99,102,241,0.1)",
                borderColor: "rgba(99,102,241,0.35)",
              };
            } else if (isWrongPos) {
              extraClass = "";
              styleOverride = {
                background: "rgba(236,72,153,0.08)",
                borderColor: "rgba(236,72,153,0.3)",
              };
            }
          } else if (isSwapSource) {
            extraClass = "bg-surface border-foreground/40";
          }

          return (
            <button
              key={itemIdx}
              onClick={() => handleTap(position)}
              disabled={submitted}
              style={styleOverride}
              className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-colors ${extraClass}`}
            >
              <span
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border"
                style={
                  submitted && isCorrectPos
                    ? { background: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.4)", color: "#6366F1" }
                    : submitted && isWrongPos
                    ? { background: "rgba(236,72,153,0.1)", borderColor: "rgba(236,72,153,0.35)", color: "#EC4899" }
                    : {}
                }
              >
                {position + 1}
              </span>
              <span className="text-sm text-foreground leading-snug">
                {item.text}
              </span>
              {submitted && (
                <span className="ml-auto shrink-0 text-[10px] text-muted">
                  {card.correctOrder.indexOf(itemIdx) === position
                    ? ""
                    : `#${card.correctOrder.indexOf(itemIdx) + 1}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          className="btn-press w-full py-4 rounded-full bg-foreground text-background font-bold shadow-lg shadow-foreground/20"
        >
          Проверить
        </button>
      )}

      {submitted && (
        <ExplanationPanel
          correct={correctCount === card.items.length}
          title={
            correctCount === card.items.length
              ? "Идеальный порядок!"
              : `${correctCount} из ${card.items.length} на своём месте`
          }
        >
          <div className="space-y-1.5 mt-1">
            {card.correctOrder.map((itemIdx, pos) => (
              <p key={pos} className="text-xs">
                <span className="font-medium">{pos + 1}. {card.items[itemIdx].text}</span>{" "}
                - {card.items[itemIdx].explanation}
              </p>
            ))}
          </div>
        </ExplanationPanel>
      )}
    </div>
  );
}
