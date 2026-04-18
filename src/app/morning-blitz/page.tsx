"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { demoCards } from "@/data/cards";
import type { Card, ClinicalCaseCard } from "@/types/card";
import { useGamification } from "@/hooks/useGamification";
import AnswerOption from "@/components/ui/AnswerOption";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

const BLITZ_COUNT = 5;
const STORAGE_KEY = "sd-blitz-date";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MorningBlitzPage() {
  const router = useRouter();
  const { recordAnswerWithGamification } = useGamification();
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === getLocalDate()) {
      setAlreadyDone(true);
    }
  }, []);

  const questions = useMemo(() => {
    const clinical = demoCards.filter(
      (c): c is ClinicalCaseCard => c.type === "clinical_case"
    );
    return shuffle(clinical).slice(0, BLITZ_COUNT);
  }, []);

  const q = questions[current];

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = q.options[idx].isCorrect;
    recordAnswerWithGamification(isCorrect, q.id, q.type, q.topic);
    setResults((prev) => [...prev, isCorrect]);
  }

  function handleNext() {
    if (current + 1 >= BLITZ_COUNT) {
      setDone(true);
      localStorage.setItem(STORAGE_KEY, getLocalDate());
    } else {
      setCurrent((prev) => prev + 1);
      setSelected(null);
    }
  }

  if (alreadyDone) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 flex items-center justify-center px-6">
          <div className="text-center">
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4 mx-auto"
              style={{ color: "var(--color-aurora-violet)" }}
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-sm text-foreground mb-2">Блиц пройден сегодня</p>
            <p className="text-xs text-muted mb-6">Приходите завтра утром</p>
            <button
              onClick={() => router.push("/topics")}
              className="btn-premium-dark px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              К учёбе
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (done) {
    const correct = results.filter(Boolean).length;
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="text-5xl font-extralight tracking-tight leading-none mb-2 aurora-text tabular-nums">
              {correct}/{BLITZ_COUNT}
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted mt-2 font-medium mb-8">
              правильных ответов
            </p>

            <div className="flex justify-center gap-2 mb-8">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`aurora-blitz-dot ${r ? "aurora-blitz-dot--correct" : "aurora-blitz-dot--wrong"}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push("/topics")}
              className="btn-premium-dark px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              К учёбе
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 overflow-y-auto">
        <div className="px-6 pt-8">
          {/* Progress */}
          <div className="flex items-center justify-between mb-6">
            <p
              className="text-xs uppercase tracking-[0.2em] font-medium"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              Утренний блиц
            </p>
            <p className="text-xs text-muted">
              {current + 1} / {BLITZ_COUNT}
            </p>
          </div>

          <div className="flex gap-1 mb-8">
            {Array.from({ length: BLITZ_COUNT }).map((_, i) => (
              <div
                key={i}
                className={`aurora-blitz-seg ${
                  i < current
                    ? results[i] ? "aurora-blitz-seg--correct" : "aurora-blitz-seg--wrong"
                    : i === current ? "aurora-blitz-seg--current" : "aurora-blitz-seg--future"
                }`}
              />
            ))}
          </div>

          {/* Question */}
          {q && (
            <div>
              {q.scenario && (
                <div className="aurora-scenario mb-4">{q.scenario}</div>
              )}
              <p className="text-sm text-foreground font-medium mb-6 leading-relaxed">
                {q.question}
              </p>

              <div className="space-y-2 mb-6">
                {q.options.map((opt, idx) => {
                  const isSelected = selected === idx;
                  const showResult = selected !== null;
                  let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
                  if (showResult) {
                    if (opt.isCorrect) state = "correct";
                    else if (isSelected) state = "wrong";
                    else state = "dim";
                  }
                  return (
                    <AnswerOption key={idx} state={state} onClick={() => handleSelect(idx)}>
                      {opt.text}
                    </AnswerOption>
                  );
                })}
              </div>

              {/* Explanation after answer */}
              {selected !== null && (
                <div className="mb-6">
                  <ExplanationPanel correct={q.options[selected].isCorrect}>
                    {q.options.find((o) => o.isCorrect)?.explanation}
                  </ExplanationPanel>
                  <button
                    onClick={handleNext}
                    className="btn-premium-dark w-full py-2.5 rounded-xl text-sm font-medium mt-4"
                  >
                    {current + 1 < BLITZ_COUNT ? "Дальше" : "Результаты"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
