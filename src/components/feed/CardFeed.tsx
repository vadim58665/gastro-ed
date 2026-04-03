"use client";

import { useMemo, useCallback, useState } from "react";
import type { Card } from "@/types/card";
import { useGamification } from "@/hooks/useGamification";
import CardRenderer from "./CardRenderer";
import DailyGoalCelebration from "@/components/ui/DailyGoalCelebration";
import AchievementUnlock from "@/components/ui/AchievementUnlock";
import { hapticCorrect, hapticWrong } from "@/lib/feedback";
import { isStruggling } from "@/lib/adaptive";
import KeyFactBanner from "@/components/ui/KeyFactBanner";
import type { AchievementDef } from "@/types/gamification";

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
  const { progress, recordAnswerWithGamification } = useGamification();
  const shuffled = useMemo(() => shuffleArray(cards), [cards]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingAchievement, setPendingAchievement] =
    useState<AchievementDef | null>(null);

  const handleAnswer = useCallback(
    (card: Card, isCorrect: boolean) => {
      isCorrect ? hapticCorrect() : hapticWrong();
      const event = recordAnswerWithGamification(
        isCorrect,
        card.id,
        card.type,
        card.topic
      );

      if (event.newAchievements.length > 0) {
        setPendingAchievement(event.newAchievements[0]);
      }

      if (event.dailyGoalReached) {
        setShowCelebration(true);
      }
    },
    [recordAnswerWithGamification]
  );

  return (
    <div className="feed-scroll h-full">
      {pendingAchievement && (
        <AchievementUnlock
          achievement={pendingAchievement}
          onDismiss={() => setPendingAchievement(null)}
        />
      )}
      {showCelebration && (
        <DailyGoalCelebration
          dailyGoal={progress.dailyGoal}
          onClose={() => setShowCelebration(false)}
        />
      )}
      {shuffled.map((card) => {
        const history = progress.cardHistory?.[card.id];
        const struggling = isStruggling(history);
        return (
          <div
            key={card.id}
            className="feed-card min-h-[calc(100vh-8rem)] flex items-center"
          >
            <div
              className="w-full max-w-lg mx-auto bg-card rounded-3xl border border-border my-4 mx-3 card-shadow card-protected"
              onContextMenu={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-1">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider">
                  {card.topic}
                </span>
                {struggling && (
                  <span className="w-2 h-2 rounded-full bg-warning" title="Сложная карточка" />
                )}
              </div>
              {struggling && card.keyFact && (
                <KeyFactBanner keyFact={card.keyFact} />
              )}
              <CardRenderer card={card} onAnswer={(isCorrect) => handleAnswer(card, isCorrect)} cardHistory={history} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
