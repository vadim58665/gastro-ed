"use client";

import { ReactNode } from "react";

type AnswerState = "neutral" | "correct" | "wrong" | "dim";

interface AnswerOptionProps {
  state: AnswerState;
  onClick: () => void;
  children: ReactNode;
  /** Дополнительные классы для кастомизации. */
  className?: string;
}

const stateClass: Record<AnswerState, string> = {
  neutral: "aurora-opt",
  correct: "aurora-opt aurora-opt-correct",
  wrong: "aurora-opt aurora-opt-wrong",
  dim: "aurora-opt aurora-opt-dim",
};

/**
 * Кнопка ответа в aurora-палитре. 4 состояния: neutral (до клика),
 * correct (правильный выбор - violet-glow), wrong (неверный выбор - pink),
 * dim (не выбран, не правильный - приглушён).
 */
export default function AnswerOption({
  state,
  onClick,
  children,
  className = "",
}: AnswerOptionProps) {
  const isAnswered = state !== "neutral";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isAnswered}
      className={`${stateClass[state]} btn-press ${className}`}
    >
      {children}
      {state === "correct" && (
        <span
          aria-hidden="true"
          className="absolute right-4 top-1/2 -translate-y-1/2 font-bold"
          style={{ color: "#A855F7" }}
        >
          ✓
        </span>
      )}
      {state === "wrong" && (
        <span
          aria-hidden="true"
          className="absolute right-4 top-1/2 -translate-y-1/2 font-bold"
          style={{ color: "#EC4899" }}
        >
          ✗
        </span>
      )}
    </button>
  );
}
