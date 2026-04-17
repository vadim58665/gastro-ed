"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import type { Card } from "@/types/card";
import { useGamification } from "@/hooks/useGamification";
import { useMedMind } from "@/contexts/MedMindContext";
import { useMedMindCompanion } from "@/hooks/useMedMindCompanion";
import CardRenderer from "./CardRenderer";
import DailyGoalCelebration from "@/components/ui/DailyGoalCelebration";
import AchievementUnlock from "@/components/ui/AchievementUnlock";
import { hapticCorrect, hapticWrong } from "@/lib/feedback";
import { isStruggling } from "@/lib/adaptive";
import KeyFactBanner from "@/components/ui/KeyFactBanner";
import type { AchievementDef } from "@/types/gamification";
import { useFatigueDetection } from "@/hooks/useFatigueDetection";
import FatigueBanner from "@/components/ui/FatigueBanner";
import PostAnswerActions, { type PostAction } from "@/components/medmind/PostAnswerActions";
import HintButton from "./HintButton";
import AutoExplain from "./AutoExplain";

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
  const { setCurrentCard } = useMedMind();
  const { onCorrectAnswer, onWrongAnswer } = useMedMindCompanion();
  const { fatigue, recordAnswer: recordFatigue, dismiss: dismissFatigue } = useFatigueDetection();
  const shuffled = useMemo(() => shuffleArray(cards), [cards]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [answeredCardId, setAnsweredCardId] = useState<string | null>(null);
  const [wrongCardId, setWrongCardId] = useState<string | null>(null);
  const [pendingAchievement, setPendingAchievement] =
    useState<AchievementDef | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Отслеживаем видимую карточку через IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cardId = entry.target.getAttribute("data-card-id");
            const card = shuffled.find((c) => c.id === cardId);
            if (card) setCurrentCard(card);
          }
        }
      },
      { threshold: 0.6 }
    );

    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [shuffled, setCurrentCard]);

  const handleAnswer = useCallback(
    (card: Card, isCorrect: boolean) => {
      // Снимаем focus с ответившей кнопки: иначе после её удаления из DOM
      // браузер переносит focus на следующий focusable внутри карточки
      // и делает scrollIntoView, что триггерит snap на следующую карточку.
      if (typeof document !== "undefined") {
        (document.activeElement as HTMLElement | null)?.blur();
      }
      isCorrect ? hapticCorrect() : hapticWrong();
      isCorrect ? onCorrectAnswer() : onWrongAnswer();
      recordFatigue(isCorrect);
      setAnsweredCardId(card.id);
      setWrongCardId(isCorrect ? null : card.id);
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
    [recordAnswerWithGamification, recordFatigue, onCorrectAnswer, onWrongAnswer]
  );

  return (
    <div className="feed-scroll h-full">
      {fatigue.isFatigued && (
        <FatigueBanner message={fatigue.message} onDismiss={dismissFatigue} />
      )}
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
            data-card-id={card.id}
            data-answered={answeredCardId === card.id}
            ref={(el) => { if (el) cardRefs.current.set(card.id, el); }}
            className="feed-card px-3 py-3"
          >
            <div
              className="w-full max-w-lg mx-auto h-full rounded-3xl card-protected surface-raised overflow-y-auto"
              onContextMenu={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                  {card.topic}
                </span>
                {struggling && (
                  <span
                    className="w-2 h-2 rounded-full bg-warning"
                    title="Сложная карточка"
                    style={{ boxShadow: "0 0 8px rgba(245, 158, 11, 0.7)" }}
                  />
                )}
              </div>
              {struggling && card.keyFact && (
                <KeyFactBanner keyFact={card.keyFact} />
              )}
              <CardRenderer card={card} onAnswer={(isCorrect) => handleAnswer(card, isCorrect)} cardHistory={history} />
              {answeredCardId !== card.id && (
                <div className="px-6 pb-2">
                  <HintButton entityId={card.id} entityType="card" />
                </div>
              )}
              {wrongCardId === card.id && (
                <div className="px-6 pb-2">
                  <AutoExplain
                    entityId={card.id}
                    entityType="card"
                    trigger={true}
                  />
                </div>
              )}
              {answeredCardId === card.id && (
                <div className="px-6 pb-4">
                  <PostAnswerActions
                    onAction={(action) => {
                      const topic = card.topic;
                      const q = encodeURIComponent(
                        "question" in card ? (card as any).question ?? "" :
                        "statement" in card ? (card as any).statement ?? "" :
                        "scenario" in card ? (card as any).scenario ?? "" : ""
                      );
                      window.location.href = `/companion?topic=${encodeURIComponent(topic)}&q=${q}&action=${action}`;
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
