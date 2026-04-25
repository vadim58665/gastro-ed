"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import QuestionView from "@/components/accreditation/QuestionView";
import BrowseFeed from "@/components/accreditation/BrowseFeed";
import TestModeSelector from "@/components/tests/TestModeSelector";
import ExamTimer from "@/components/tests/ExamTimer";
import BlockResults from "@/components/tests/BlockResults";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { useTestMode, type TestMode } from "@/hooks/useTestMode";
import { useBlockQuestions } from "@/hooks/useTestQuestions";

export default function BlockPage() {
  const params = useParams();
  const router = useRouter();
  const { activeSpecialty, hydrated } = useSpecialty();
  const specialtyId = activeSpecialty?.id || "";
  const blockNumber = Number(params.blockId);
  const { progress, markQuestionLearned, recordAnswer } =
    useAccreditation(specialtyId);

  // Async-фетч блока из Supabase с shuffle'ом внутри блока (стабильный seed
  // на время mount — пользователь не теряет место после ответов).
  const { data: allQuestions, isLoading: questionsLoading } = useBlockQuestions(
    specialtyId,
    Number.isNaN(blockNumber) ? null : blockNumber
  );

  const testMode = useTestMode();

  const handleSelectMode = useCallback(
    (mode: TestMode) => {
      testMode.startTest(allQuestions, progress.mistakes, mode);
    },
    [allQuestions, progress.mistakes, testMode]
  );

  const handleAnswer = useCallback(
    (isCorrect: boolean, selectedIndex: number) => {
      const q = testMode.questions[testMode.currentIndex];
      if (!q) return;
      testMode.submitAnswer(q.id, selectedIndex, isCorrect);
      recordAnswer(q.id, isCorrect);
      if (isCorrect) {
        markQuestionLearned(blockNumber, q.id);
      }
    },
    [testMode, blockNumber, markQuestionLearned, recordAnswer]
  );

  const handleReviewMistakes = useCallback(() => {
    testMode.startTest(allQuestions, progress.mistakes, "mistakes");
  }, [allQuestions, progress.mistakes, testMode]);

  // Wait for SpecialtyContext to restore the saved id from localStorage AND
  // for the block questions to arrive from Supabase. Без hydrated прямая
  // ссылка (/tests/1) бросает к /tests до того, как восстановится специальность.
  if (!hydrated || questionsLoading) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-20 pb-20 flex items-center justify-center">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--color-aurora-violet)", borderTopColor: "transparent" }}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!activeSpecialty || isNaN(blockNumber)) {
    router.push("/tests");
    return null;
  }

  if (allQuestions.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-20 pb-20 flex flex-col items-center justify-center">
          <p className="text-sm text-muted">Вопросы не найдены</p>
          <button
            onClick={() => router.push("/tests")}
            className="mt-4 text-xs uppercase tracking-[0.15em] font-semibold"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Назад к блокам
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Mode selection screen
  if (!testMode.mode) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-20 pb-20 overflow-y-auto">
          <div className="text-center mb-2 px-6 pt-4">
            <p
              className="text-[10px] uppercase tracking-[0.28em] font-semibold"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              Блок
            </p>
            <p className="text-5xl font-extralight text-foreground tracking-tight leading-none mt-2 tabular-nums">
              {blockNumber}
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted mt-3 font-medium">
              {allQuestions.length} вопросов
            </p>
          </div>
          <TestModeSelector
            onSelect={handleSelectMode}
            mistakeCount={progress.mistakes.length}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  // Browse mode: лента всех вопросов с подсвеченными правильными
  // ответами. Ничего не прорешивается, прогресс не меняется.
  // BrowseFeed сам управляет scroll-контейнером (нужен useVirtualWindow'у),
  // поэтому не оборачиваем в overflow-y-auto <main> — иначе scroll уйдёт
  // наверх и виртуализация не сработает.
  if (testMode.mode === "browse") {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <div className="flex-1 pt-20 pb-20 flex flex-col min-h-0">
          <BrowseFeed
            questions={testMode.questions}
            specialtyId={specialtyId}
            label={`Блок ${blockNumber}`}
          />
        </div>
        <BottomNav />
      </div>
    );
  }

  // Results screen
  if (testMode.finished) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-20 pb-20 overflow-y-auto">
          <BlockResults
            questions={testMode.questions}
            answers={testMode.answers}
            onRestart={() => handleSelectMode(testMode.mode!)}
            onBack={() => testMode.reset()}
            onReviewMistakes={
              testMode.answers.some((a) => !a.isCorrect)
                ? handleReviewMistakes
                : undefined
            }
            // Просмотр всего блока (того же набора вопросов) с уже
            // подсвеченными правильными ответами, без прорешивания.
            onBrowseAll={() => handleSelectMode("browse")}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  // Question screen
  const current = testMode.questions[testMode.currentIndex];
  const questionMode = testMode.config?.showAnswersImmediately
    ? "test"
    : "exam";
  const existingAnswer = testMode.answers.find((a) => a.questionId === current.id);

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-2 pb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium">
              Блок {blockNumber}
            </p>
            {testMode.timeRemaining !== null && (
              <ExamTimer seconds={testMode.timeRemaining} />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-extralight text-foreground tracking-tight leading-none">
              {testMode.currentIndex + 1}{" "}
              <span className="text-muted">/ {testMode.questions.length}</span>
            </div>
            <button
              onClick={testMode.finishTest}
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              Завершить
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 mb-4">
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.round(((testMode.currentIndex + 1) / testMode.questions.length) * 100)}%`,
                background: "var(--aurora-gradient-primary)",
              }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="px-3">
          <div className="w-full max-w-lg mx-auto bg-card rounded-3xl aurora-hairline">
            <QuestionView
              key={`${current.id}-${testMode.mode}-${testMode.currentIndex}`}
              question={current}
              mode={questionMode}
              specialtyId={specialtyId}
              onAnswer={handleAnswer}
              onNext={testMode.nextQuestion}
              onPrevious={testMode.previousQuestion}
              // В Экзамене возврат запрещён (жёсткая имитация аккредитации).
              // В Зачёте, Тренировке и остальных режимах — можно вернуться.
              canGoPrevious={testMode.currentIndex > 0 && testMode.mode !== "exam"}
              existingSelectedIndex={existingAnswer?.selectedIndex ?? null}
            />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
