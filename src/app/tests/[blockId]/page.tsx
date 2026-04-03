"use client";

import { useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import QuestionView from "@/components/accreditation/QuestionView";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { getBlockQuestions } from "@/data/accreditation/index";

type Mode = "learn" | "test" | "exam";

export default function BlockPage() {
  const params = useParams();
  const router = useRouter();
  const { activeSpecialty } = useSpecialty();
  const specialtyId = activeSpecialty?.id || "";
  const blockNumber = Number(params.blockId);
  const { progress, markQuestionLearned, recordMistake } =
    useAccreditation(specialtyId);

  const [mode, setMode] = useState<Mode>("learn");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = useMemo(
    () => getBlockQuestions(specialtyId, blockNumber),
    [specialtyId, blockNumber]
  );

  const blockProgress = progress.blocks.find(
    (b) => b.blockNumber === blockNumber
  );

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      const q = questions[currentIndex];
      if (!q) return;
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        markQuestionLearned(blockNumber, q.id);
      } else {
        recordMistake(q.id);
      }
    },
    [currentIndex, questions, blockNumber, markQuestionLearned, recordMistake]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, questions.length]);

  const restart = () => {
    setCurrentIndex(0);
    setCorrectCount(0);
    setFinished(false);
  };

  if (!activeSpecialty || isNaN(blockNumber)) {
    router.push("/tests");
    return null;
  }

  if (questions.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 pt-20 pb-20 flex flex-col items-center justify-center">
          <p className="text-sm text-muted">Вопросы не найдены</p>
          <button
            onClick={() => router.push("/tests")}
            className="mt-4 text-xs uppercase tracking-[0.15em] font-semibold text-primary"
          >
            Назад к блокам
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 pt-20 pb-20 flex flex-col items-center justify-center px-6">
          <div className="text-center">
            <div
              className={`text-7xl font-extralight tracking-tight leading-none mb-2 ${pct >= 70 ? "text-emerald-600" : "text-rose-500"}`}
            >
              {pct}%
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-1">
              {correctCount} из {questions.length} правильно
            </p>
            <div className="w-12 h-px bg-border mx-auto my-8" />
            <div
              className={`inline-block px-4 py-2 rounded-xl text-sm font-medium mb-8 ${pct >= 70 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}
            >
              {pct >= 70 ? "Отлично" : "Нужно повторить"}
            </div>
            <div className="space-y-3">
              <button
                onClick={restart}
                className="block w-full py-3 text-xs uppercase tracking-[0.15em] font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Пройти ещё раз
              </button>
              <button
                onClick={() => router.push("/tests")}
                className="block w-full py-3 text-xs uppercase tracking-[0.15em] font-semibold text-muted hover:text-foreground transition-colors"
              >
                Назад к блокам
              </button>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const current = questions[currentIndex];
  const remaining = questions.length - currentIndex;

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        {/* Заголовок */}
        <div className="px-6 pt-4 pb-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-1">
            Блок {blockNumber}
          </p>
          <div className="text-2xl font-extralight text-foreground tracking-tight leading-none">
            {currentIndex + 1}{" "}
            <span className="text-muted">/ {questions.length}</span>
          </div>
        </div>

        {/* Режимы */}
        <div className="flex justify-center mb-4">
          <div className="flex bg-surface rounded-xl p-0.5">
            {(["learn", "test", "exam"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  restart();
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {m === "learn"
                  ? "Изучать"
                  : m === "test"
                    ? "Тренировка"
                    : "Зачёт"}
              </button>
            ))}
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="px-6 mb-4">
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Вопрос */}
        <div className="px-3">
          <div className="w-full max-w-lg mx-auto bg-card rounded-3xl border border-border card-shadow">
            <QuestionView
              key={`${current.id}-${mode}`}
              question={current}
              mode={mode}
              onAnswer={handleAnswer}
              onNext={handleNext}
            />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
