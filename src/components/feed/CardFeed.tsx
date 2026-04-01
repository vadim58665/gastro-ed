"use client";

import { useMemo, useCallback, useState } from "react";
import type { Card } from "@/types/card";
import { useProgress } from "@/hooks/useProgress";
import { useReview } from "@/hooks/useReview";
import CardRenderer from "./CardRenderer";
import DailyGoalCelebration from "@/components/ui/DailyGoalCelebration";
import { hapticCorrect, hapticWrong } from "@/lib/feedback";

interface Props {
  cards: Card[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function CardFeed({ cards }: Props) {
  const { progress, recordAnswer } = useProgress();
  const { scheduleCard } = useReview();
  const shuffled = useMemo(() => shuffleArray(cards), [cards]);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleAnswer = useCallback(
    (cardId: string, isCorrect: boolean) => {
      recordAnswer(isCorrect, cardId);
      isCorrect ? hapticCorrect() : hapticWrong();
      scheduleCard(cardId, isCorrect);

      if (progress.todayCardsSeen + 1 === progress.dailyGoal) {
        setShowCelebration(true);
      }
    },
    [recordAnswer, scheduleCard, progress.todayCardsSeen, progress.dailyGoal]
  );

  return (
    <div className="feed-scroll h-full">
      {showCelebration && (
        <DailyGoalCelebration
          dailyGoal={progress.dailyGoal}
          onClose={() => setShowCelebration(false)}
        />
      )}
      {shuffled.map((card) => (
        <div
          key={card.id}
          className="feed-card min-h-[calc(100vh-8rem)] flex items-center"
        >
          <div className="w-full max-w-lg mx-auto bg-card rounded-3xl border border-border my-4 mx-3 card-shadow">
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <span className="text-xs text-muted font-semibold uppercase tracking-wider">
                {card.topic}
              </span>
            </div>
            <CardRenderer card={card} onAnswer={(isCorrect) => handleAnswer(card.id, isCorrect)} />
          </div>
        </div>
      ))}
    </div>
  );
}
