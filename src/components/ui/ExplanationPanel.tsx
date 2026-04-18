"use client";

import { ReactNode } from "react";

interface ExplanationPanelProps {
  correct: boolean;
  /** Кастомный заголовок. По умолчанию: «Верно!» или «Неверно». */
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Панель объяснения после ответа. Aurora-indigo для правильных,
 * aurora-pink для неверных. Заголовок uppercase в том же цвете.
 */
export default function ExplanationPanel({
  correct,
  title,
  children,
  className = "",
}: ExplanationPanelProps) {
  const modifier = correct ? "aurora-explanation-correct" : "aurora-explanation-wrong";
  const defaultTitle = correct ? "Верно!" : "Неверно";

  return (
    <div className={`aurora-explanation ${modifier} animate-result ${className}`}>
      <div className="aurora-explanation-head">{title ?? defaultTitle}</div>
      <div>{children}</div>
    </div>
  );
}
