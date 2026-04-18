"use client";

import type { TestQuestion } from "@/types/accreditation";
import type { Answer } from "@/hooks/useTestMode";

interface BlockResultsProps {
  questions: TestQuestion[];
  answers: Answer[];
  onRestart: () => void;
  onBack: () => void;
  onReviewMistakes?: () => void;
}

export default function BlockResults({
  questions,
  answers,
  onRestart,
  onBack,
  onReviewMistakes,
}: BlockResultsProps) {
  const correct = answers.filter((a) => a.isCorrect).length;
  const total = questions.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = pct >= 70;
  const mistakes = answers.filter((a) => !a.isCorrect);

  return (
    <div className="px-6 py-8 max-w-lg mx-auto">
      {/* Score */}
      <div className="text-center mb-8">
        <div
          className="text-7xl font-extralight tracking-tight leading-none mb-2"
          style={{ color: passed ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)" }}
        >
          {pct}%
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium">
          {correct} из {total} правильно
        </p>
        <div className="w-12 h-px bg-border mx-auto my-6" />
        <div
          className="inline-block px-4 py-2 rounded-xl text-sm font-medium"
          style={passed
            ? { background: "var(--aurora-indigo-soft)", color: "var(--color-aurora-indigo)" }
            : { background: "var(--aurora-pink-soft)", color: "var(--color-aurora-pink)" }}
        >
          {pct >= 90
            ? "Превосходно"
            : pct >= 70
              ? "Отлично"
              : pct >= 50
                ? "Нужно повторить"
                : "Требуется проработка"}
        </div>
      </div>

      {/* Mistake breakdown */}
      {mistakes.length > 0 && (
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4">
            Ошибки ({mistakes.length})
          </p>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {mistakes.map((answer) => {
              const q = questions.find((qq) => qq.id === answer.questionId);
              if (!q) return null;
              return (
                <div
                  key={answer.questionId}
                  className="px-4 py-3 rounded-xl border"
                  style={{ borderColor: "var(--aurora-pink-border)", background: "var(--aurora-pink-soft)" }}
                >
                  <p className="text-sm text-foreground leading-relaxed mb-2">
                    {q.question}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs" style={{ color: "var(--color-aurora-pink)" }}>
                      Ваш ответ: {q.options[answer.selectedIndex]}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-aurora-indigo)" }}>
                      Правильно: {q.options[q.correctIndex]}
                    </p>
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted mt-2 leading-relaxed">
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {mistakes.length > 0 && onReviewMistakes && (
          <button
            onClick={onReviewMistakes}
            className="block w-full py-3 text-xs uppercase tracking-[0.15em] font-semibold text-primary hover:text-primary/80 transition-colors border border-primary/20 rounded-xl"
          >
            Работа над ошибками
          </button>
        )}
        <button
          onClick={onRestart}
          className="block w-full py-3 text-xs uppercase tracking-[0.15em] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Пройти ещё раз
        </button>
        <button
          onClick={onBack}
          className="block w-full py-3 text-xs uppercase tracking-[0.15em] font-semibold text-muted hover:text-foreground transition-colors"
        >
          Назад к блокам
        </button>
      </div>
    </div>
  );
}
