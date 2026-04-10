"use client";

import { useMemo, useCallback, useState } from "react";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import CardRenderer from "@/components/feed/CardRenderer";
import { useReview } from "@/hooks/useReview";
import { useGamification } from "@/hooks/useGamification";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { demoCards } from "@/data/cards";
import { Rating } from "ts-fsrs";
import type { Grade } from "ts-fsrs";
import { hapticCorrect, hapticWrong } from "@/lib/feedback";

export default function ReviewPage() {
  const { getDueCards, reviewCard, dueCount } = useReview();
  const { recordAnswerWithGamification } = useGamification();
  const { activeSpecialty } = useSpecialty();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);

  const dueCardIds = useMemo(() => getDueCards(), [getDueCards]);
  const dueCards = useMemo(
    () =>
      dueCardIds
        .map((id) => demoCards.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => c != null)
        .filter((c) => !activeSpecialty || c.specialty === activeSpecialty.name),
    [dueCardIds, activeSpecialty]
  );

  const currentCard = dueCards[currentIndex];

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      setAnswered(true);
      setLastCorrect(isCorrect);
      if (currentCard) {
        recordAnswerWithGamification(isCorrect, currentCard.id, currentCard.type, currentCard.topic);
      }
    },
    [recordAnswerWithGamification, currentCard]
  );

  const handleGrade = useCallback(
    (grade: Grade) => {
      if (!currentCard) return;
      (grade === Rating.Again || grade === Rating.Hard) ? hapticWrong() : hapticCorrect();
      reviewCard(currentCard.id, grade);
      setAnswered(false);
      setCurrentIndex((i) => i + 1);
    },
    [currentCard, reviewCard]
  );

  // Empty state
  if (dueCards.length === 0 || !currentCard) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 pt-16 pb-20 flex flex-col items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl font-extralight text-foreground tracking-tight leading-none mb-3">
              0
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-8">
              карточек на повторение
            </p>
            <div className="w-12 h-px bg-border mx-auto mb-8" />
            <p className="text-sm text-muted leading-relaxed max-w-[260px] mx-auto">
              Отвечайте на карточки в ленте  - они автоматически попадут сюда для
              интервального повторения
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const remaining = dueCards.length - currentIndex;

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-16 pb-20 overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-1">
            Повторение
          </p>
          <div className="text-3xl font-extralight text-foreground tracking-tight leading-none">
            {remaining}
          </div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted mt-1 font-medium">
            {remaining === 1 ? "карточка" : "карточек"} осталось
          </p>
        </div>

        {/* Card */}
        <div className="px-3">
          <div className="w-full max-w-lg mx-auto rounded-3xl surface-raised">
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <span className="text-xs text-muted font-semibold uppercase tracking-wider">
                {currentCard.topic}
              </span>
            </div>
            <CardRenderer card={currentCard} onAnswer={handleAnswer} />
          </div>
        </div>

        {/* Grade buttons  - appear after answering */}
        {answered && (
          <div className="px-6 mt-4 max-w-lg mx-auto">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted font-medium text-center mb-3">
              Насколько легко было?
            </p>
            <div className="grid grid-cols-4 gap-2">
              <GradeButton
                label="Снова"
                sub="< 1 мин"
                onClick={() => handleGrade(Rating.Again)}
                color="text-danger"
              />
              <GradeButton
                label="Трудно"
                sub="< 10 мин"
                onClick={() => handleGrade(Rating.Hard)}
                color="text-warning"
              />
              <GradeButton
                label="Хорошо"
                sub="1 день"
                onClick={() => handleGrade(Rating.Good)}
                color="text-primary"
              />
              <GradeButton
                label="Легко"
                sub="4 дня"
                onClick={() => handleGrade(Rating.Easy)}
                color="text-success"
              />
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function GradeButton({
  label,
  sub,
  onClick,
  color,
}: {
  label: string;
  sub: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center py-3 px-1 rounded-2xl btn-raised-light btn-press"
    >
      <span className={`text-xs font-semibold ${color}`}>{label}</span>
      <span className="text-[10px] text-muted mt-0.5">{sub}</span>
    </button>
  );
}
