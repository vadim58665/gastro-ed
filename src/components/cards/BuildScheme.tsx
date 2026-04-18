"use client";

import { useState, useMemo } from "react";
import type { BuildSchemeCard } from "@/types/card";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

interface Props {
  card: BuildSchemeCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function BuildScheme({ card, onAnswer }: Props) {
  const isOrdering = !!card.correctOrder;

  const shuffledIndices = useMemo(() => {
    const indices = card.components.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [card.id]);

  // Multi-select mode state
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Ordering mode state
  const [orderedSelection, setOrderedSelection] = useState<number[]>([]);

  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  const toggleComponent = (index: number) => {
    if (submitted) return;

    if (isOrdering) {
      setOrderedSelection((prev) => {
        const pos = prev.indexOf(index);
        if (pos >= 0) {
          return prev.filter((i) => i !== index);
        }
        return [...prev, index];
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    }
  };

  const handleSubmit = () => {
    if (isOrdering) {
      const isCorrect =
        orderedSelection.length === card.correctOrder!.length &&
        orderedSelection.every((idx, pos) => idx === card.correctOrder![pos]);
      setSubmitted(true);
      setWasCorrect(isCorrect);
      onAnswer(isCorrect);
    } else {
      const correctIndices = new Set(
        card.components.map((c, i) => (c.isCorrect ? i : -1)).filter((i) => i >= 0)
      );
      const isCorrect =
        selected.size === correctIndices.size &&
        [...selected].every((i) => correctIndices.has(i));
      setSubmitted(true);
      setWasCorrect(isCorrect);
      onAnswer(isCorrect);
    }
  };

  const correctCount = isOrdering
    ? card.correctOrder!.length
    : card.components.filter((c) => c.isCorrect).length;

  const currentCount = isOrdering ? orderedSelection.length : selected.size;
  const canSubmit = currentCount > 0;

  /** Compute aurora-style className + inline style for each component button.
   *  Inline styles are used for aurora colors so CSS vars stay theme-adaptive. */
  function getButtonStyle(
    comp: { isCorrect: boolean },
    i: number,
    isSelected: boolean,
    orderPos: number,
    correctPos: number
  ): { className: string; style: React.CSSProperties } {
    const indigoFull: React.CSSProperties = {
      borderColor: "var(--color-aurora-indigo)",
      background: "color-mix(in srgb, var(--color-aurora-indigo) 10%, transparent)",
      color: "var(--color-aurora-indigo)",
    };
    const indigoDim: React.CSSProperties = {
      borderColor: "color-mix(in srgb, var(--color-aurora-indigo) 40%, transparent)",
      background: "color-mix(in srgb, var(--color-aurora-indigo) 5%, transparent)",
      color: "color-mix(in srgb, var(--color-aurora-indigo) 60%, transparent)",
    };
    const violetFull: React.CSSProperties = {
      borderColor: "var(--color-aurora-violet)",
      background: "color-mix(in srgb, var(--color-aurora-violet) 10%, transparent)",
      color: "var(--color-aurora-violet)",
    };
    const pinkFull: React.CSSProperties = {
      borderColor: "var(--color-aurora-pink)",
      background: "color-mix(in srgb, var(--color-aurora-pink) 10%, transparent)",
      color: "var(--color-aurora-pink)",
    };

    if (!submitted) {
      return isSelected
        ? { className: "", style: indigoFull }
        : { className: "border-border bg-card text-foreground/70", style: {} };
    }

    if (isOrdering) {
      if (correctPos >= 0 && orderPos >= 0 && orderPos === correctPos)
        return { className: "", style: indigoFull };
      if (correctPos >= 0 && orderPos >= 0 && orderPos !== correctPos)
        return { className: "", style: violetFull };
      if (correctPos >= 0 && orderPos < 0)
        return { className: "", style: indigoDim };
      if (correctPos < 0 && orderPos >= 0)
        return { className: "", style: pinkFull };
      return { className: "border-border bg-card opacity-30", style: {} };
    } else {
      if (comp.isCorrect && isSelected)
        return { className: "", style: indigoFull };
      if (comp.isCorrect && !isSelected)
        return { className: "", style: indigoDim };
      if (!comp.isCorrect && isSelected)
        return { className: "", style: pinkFull };
      return { className: "border-border bg-card opacity-30", style: {} };
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="aurora-card-type">
        {isOrdering ? "Расставь по порядку" : "Собери схему"}
      </div>
      <div className="text-base font-bold text-foreground">{card.title}</div>
      <div className="text-sm text-foreground/60">
        {isOrdering
          ? "Нажимайте на шаги в правильном порядке"
          : card.instruction}
      </div>

      <div className={isOrdering ? "flex flex-col gap-2.5" : "flex flex-wrap gap-2.5"}>
        {shuffledIndices.map((i) => {
          const comp = card.components[i];
          const isSelected = isOrdering
            ? orderedSelection.includes(i)
            : selected.has(i);
          const orderPos = isOrdering ? orderedSelection.indexOf(i) : -1;
          const correctPos = isOrdering && submitted
            ? card.correctOrder!.indexOf(i)
            : -1;

          const { className: styleClass, style: styleObj } = getButtonStyle(
            comp,
            i,
            isSelected,
            orderPos,
            correctPos
          );

          return (
            <button
              key={i}
              onClick={() => toggleComponent(i)}
              style={styleObj}
              className={`btn-press ${
                isOrdering
                  ? "flex items-center gap-3 text-left px-5 py-4 rounded-2xl"
                  : "px-5 py-3 rounded-full"
              } border-2 text-sm font-semibold transition-all ${styleClass}`}
            >
              {isOrdering && (
                <span
                  style={
                    !submitted || correctPos < 0
                      ? isSelected
                        ? { background: "var(--color-aurora-indigo)", color: "#ffffff" }
                        : undefined
                      : undefined
                  }
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    submitted && correctPos >= 0
                      ? "bg-current/10 border-2 border-current"
                      : isSelected
                        ? ""
                        : "border-2 border-border text-foreground/30"
                  }`}
                >
                  {submitted && correctPos >= 0
                    ? correctPos + 1
                    : isSelected
                      ? orderPos + 1
                      : ""}
                </span>
              )}
              {comp.text}
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-premium-dark mt-2 py-4 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isOrdering
            ? `Проверить (${currentCount}/${correctCount} шагов)`
            : `Проверить (${currentCount}/${correctCount})`}
        </button>
      ) : (
        <ExplanationPanel correct={wasCorrect}>
          {wasCorrect ? card.successMessage : `Неверно. ${card.successMessage}`}
        </ExplanationPanel>
      )}
    </div>
  );
}
