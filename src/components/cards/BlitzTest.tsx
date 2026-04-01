"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { BlitzTestCard } from "@/types/card";

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
        <div className="text-xs font-bold text-cyan-500 uppercase tracking-widest">
          Блиц-тест
        </div>
        <div
          className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${
            timeLeft <= 10 && started
              ? "text-rose-600 bg-rose-50"
              : "text-foreground/50 bg-surface"
          }`}
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
                  ? "bg-success"
                  : answers[i] !== null
                  ? "bg-danger"
                  : "bg-border"
                : i === currentQ
                ? "bg-cyan-500"
                : answers[i] !== null
                ? "bg-foreground/30"
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
            className="btn-press px-10 py-4 rounded-full bg-cyan-500 text-white font-bold text-lg hover:bg-cyan-600 transition-all"
          >
            Начать
          </button>
        </div>
      ) : !finished ? (
        <>
          <div className="bg-surface rounded-2xl p-5 text-center">
            <div className="text-base font-semibold text-foreground">
              {currentQ + 1}/{total}: {q.question}
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleAnswer(true)}
              className="btn-press flex-1 py-5 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 font-bold text-lg hover:bg-emerald-100 transition-all"
            >
              ДА
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="btn-press flex-1 py-5 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-600 font-bold text-lg hover:bg-rose-100 transition-all"
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
          <div className="flex flex-col gap-2">
            {card.questions.map((question, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-xs ${
                  answers[i] === question.correctAnswer
                    ? "bg-success-light text-emerald-800"
                    : "bg-danger-light text-rose-800"
                }`}
              >
                <span className="font-semibold">{question.question}</span>
                <span className="text-foreground/50">
                  {" "}
                  -- {question.explanation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
