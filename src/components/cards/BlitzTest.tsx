"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { BlitzTestCard } from "@/types/card";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

interface Props {
  card: BlitzTestCard;
  onAnswer: (isCorrect: boolean) => void;
}

export default function BlitzTest({ card, onAnswer }: Props) {
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(boolean | null)[]>(
    Array(card.questions.length).fill(null)
  );
  const [timeLeft, setTimeLeft] = useState(card.timeLimit);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishedRef = useRef(false);
  const answersRef = useRef(answers);
  const onAnswerRef = useRef(onAnswer);
  answersRef.current = answers;
  onAnswerRef.current = onAnswer;

  const total = card.questions.length;
  const correctCount = answers.filter(
    (a, i) => a === card.questions[i].correctAnswer
  ).length;

  const finishQuiz = useCallback((finalAnswers: (boolean | null)[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setFinished(true);
    const finalCorrect = finalAnswers.filter(
      (a, i) => a === card.questions[i].correctAnswer
    ).length;
    setTimeout(() => {
      onAnswerRef.current(finalCorrect >= Math.ceil(card.questions.length / 2));
    }, 0);
  }, [card.questions]);

  useEffect(() => {
    if (!started || finished) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          finishQuiz(answersRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, finished, finishQuiz]);

  const handleAnswer = (answer: boolean) => {
    if (finished) return;
    const updated = [...answers];
    updated[currentQ] = answer;
    setAnswers(updated);
    if (currentQ < total - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      finishQuiz(updated);
    }
  };

  const q = card.questions[currentQ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="aurora-card-type">Блиц-тест</div>
        <div
          className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${
            timeLeft <= 10 && started
              ? ""
              : "text-foreground/50 bg-surface"
          }`}
          style={timeLeft <= 10 && started ? {
            color: "var(--color-aurora-pink)",
            background: "var(--aurora-pink-soft)",
          } : undefined}
        >
          {timeLeft}с
        </div>
      </div>

      <div className="text-base font-bold text-foreground">{card.title}</div>

      <div className="flex gap-2 justify-center">
        {card.questions.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              finished
                ? answers[i] === card.questions[i].correctAnswer
                  ? "bg-violet-400"
                  : answers[i] !== null
                  ? "bg-pink-400"
                  : "bg-border"
                : i === currentQ
                ? "bg-indigo-500"
                : answers[i] !== null
                ? "bg-indigo-300"
                : "bg-border"
            }`}
          />
        ))}
      </div>

      {!started ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="text-sm text-muted text-center">
            {total} вопросов · {card.timeLimit} секунд
          </div>
          <button
            onClick={() => setStarted(true)}
            className="btn-press px-10 py-4 rounded-full bg-foreground text-background font-bold text-lg hover:opacity-90 transition-all"
          >
            Начать
          </button>
        </div>
      ) : !finished ? (
        <>
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / card.timeLimit) * 100}%` }}
            />
          </div>
          <div className="bg-surface rounded-2xl p-5 text-center">
            <div className="text-base font-semibold text-foreground">
              {currentQ + 1}/{total}: {q.question}
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleAnswer(true)}
              className="btn-press flex-1 py-5 rounded-full border-2 font-bold text-lg hover:opacity-90 transition-all"
              style={{ background: "color-mix(in srgb, var(--color-aurora-indigo) 10%, transparent)", borderColor: "color-mix(in srgb, var(--color-aurora-indigo) 35%, transparent)", color: "var(--color-aurora-indigo)" }}
            >
              ДА
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="btn-press flex-1 py-5 rounded-full border-2 font-bold text-lg hover:opacity-90 transition-all"
              style={{ background: "var(--aurora-pink-soft)", borderColor: "color-mix(in srgb, var(--color-aurora-pink) 30%, transparent)", color: "var(--color-aurora-pink)" }}
            >
              НЕТ
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-center text-3xl font-bold text-foreground">
            {correctCount}/{total}{" "}
            {correctCount === total ? "Отлично!" : correctCount >= 3 ? "Хорошо" : "Попробуйте ещё"}
          </div>
          <ExplanationPanel
            correct={correctCount >= Math.ceil(total / 2)}
            title={
              correctCount === total
                ? "Отлично!"
                : correctCount >= Math.ceil(total / 2)
                ? "Хорошо"
                : "Попробуйте ещё"
            }
          >
            <div className="flex flex-col gap-2 mt-2">
              {card.questions.map((question, i) => (
                <div
                  key={i}
                  className="flex gap-2 text-xs"
                >
                  <span
                    className="shrink-0 font-bold"
                    style={{
                      color:
                        answers[i] === question.correctAnswer
                          ? "var(--color-aurora-violet)"
                          : "var(--color-aurora-pink)",
                    }}
                  >
                    {answers[i] === question.correctAnswer ? "+" : "-"}
                  </span>
                  <span>
                    <span className="font-semibold">{question.question}</span>
                    <span className="opacity-70"> - {question.explanation}</span>
                  </span>
                </div>
              ))}
            </div>
          </ExplanationPanel>
        </div>
      )}
    </div>
  );
}
