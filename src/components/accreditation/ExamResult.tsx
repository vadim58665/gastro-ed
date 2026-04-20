"use client";

import Link from "next/link";
import type { ExamResult, TestQuestion } from "@/types/accreditation";

interface ExamAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

interface Props {
  result: ExamResult;
  questions?: TestQuestion[];
  answers?: ExamAnswer[];
  onRestart?: () => void;
  /** Открыть лентy всех вопросов с правильными ответами (режим Просмотр). */
  onBrowseAll?: () => void;
}

export default function ExamResultView({ result, questions, answers, onRestart, onBrowseAll }: Props) {
  const minutes = Math.floor(result.duration / 60);
  const mistakes =
    questions && answers
      ? answers
          .filter((a) => !a.isCorrect)
          .map((a) => ({
            answer: a,
            question: questions.find((q) => q.id === a.questionId),
          }))
          .filter((x): x is { answer: ExamAnswer; question: TestQuestion } => !!x.question)
      : [];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 max-w-lg mx-auto w-full">
      {/* Итог */}
      <div className="text-center mb-6">
        <div
          className="text-7xl font-extralight tracking-tight leading-none mb-2"
          style={{ color: result.passed ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)" }}
        >
          {result.percentage}%
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-1">
          {result.correct} из {result.total} правильно
        </p>
        <p className="text-xs text-muted mb-6">
          {minutes} мин
        </p>

        <div
          className="inline-block px-4 py-2 rounded-xl text-sm font-medium"
          style={result.passed
            ? { background: "var(--aurora-indigo-soft)", color: "var(--color-aurora-indigo)" }
            : { background: "var(--aurora-pink-soft)", color: "var(--color-aurora-pink)" }}
        >
          {result.passed ? "Зачёт" : "Не сдано"}
        </div>
      </div>

      {/* Разбор ошибок */}
      {mistakes.length > 0 && (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-3">
            Ошибки ({mistakes.length})
          </p>
          <div className="space-y-2">
            {mistakes.map(({ answer, question }) => (
              <div
                key={answer.questionId}
                className="px-4 py-3 rounded-xl border"
                style={{
                  borderColor: "var(--aurora-pink-border)",
                  background: "var(--aurora-pink-soft)",
                }}
              >
                <p className="text-sm text-foreground leading-relaxed mb-2">
                  {question.question}
                </p>
                <p className="text-xs" style={{ color: "var(--color-aurora-pink)" }}>
                  Ваш ответ: {question.options[answer.selectedIndex]}
                </p>
                <p className="text-xs" style={{ color: "var(--color-aurora-indigo)" }}>
                  Правильно: {question.options[question.correctIndex]}
                </p>
                {question.explanation && (
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    {question.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        {onBrowseAll && (
          <button
            onClick={onBrowseAll}
            className="block w-full py-3 rounded-xl text-xs uppercase tracking-[0.15em] font-semibold transition-colors"
            style={{
              color: "var(--color-aurora-violet)",
              border: "1px solid var(--aurora-violet-border)",
              background: "var(--aurora-violet-soft)",
            }}
          >
            Просмотреть тест с ответами
          </button>
        )}
        {onRestart && (
          <button
            onClick={onRestart}
            className="block w-full py-3 rounded-xl btn-premium-dark text-xs uppercase tracking-[0.15em] font-semibold"
          >
            Пройти ещё раз
          </button>
        )}
        <Link
          href="/modes"
          className="block w-full py-3 text-center text-xs uppercase tracking-[0.15em] font-semibold text-muted hover:text-foreground transition-colors"
        >
          К режимам
        </Link>
      </div>
    </div>
  );
}
