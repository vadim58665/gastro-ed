"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/types/card";
import { useGamification } from "@/hooks/useGamification";
import { useMedMind } from "@/contexts/MedMindContext";
import { useMedMindCompanion } from "@/hooks/useMedMindCompanion";
import { useVirtualWindow } from "@/hooks/useVirtualWindow";
import CardRenderer from "./CardRenderer";
import DailyGoalCelebration from "@/components/ui/DailyGoalCelebration";
import AchievementUnlock from "@/components/ui/AchievementUnlock";
import { hapticCorrect, hapticWrong } from "@/lib/feedback";
import { isStruggling } from "@/lib/adaptive";
import KeyFactBanner from "@/components/ui/KeyFactBanner";
import type { AchievementDef } from "@/types/gamification";
import type { CardHistoryEntry } from "@/types/user";
import { useFatigueDetection } from "@/hooks/useFatigueDetection";
import FatigueBanner from "@/components/ui/FatigueBanner";
import PostAnswerActions, { type PostAction } from "@/components/medmind/PostAnswerActions";
import HintButton from "./HintButton";
import AutoExplain from "./AutoExplain";

interface Props {
  cards: Card[];
}

// FNV-1a 32-bit → нормализованный [0, 1) float, детерминированный по seed.
function hashToFloat(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

// Стабильный shuffle по id + session seed. Пока компонент смонтирован,
// даже если `cards` prop пересоздаётся (progress обновился после ответа),
// порядок карточек остаётся тем же — пользователь не теряет место в ленте.
function stableShuffle<T extends { id: string }>(arr: T[], seed: string): T[] {
  return arr
    .map((c) => ({ c, s: hashToFloat(c.id + seed) }))
    .sort((a, b) => a.s - b.s)
    .map((x) => x.c);
}

interface FeedCardItemProps {
  card: Card;
  struggling: boolean;
  keyFact: string | null | undefined;
  isAnswered: boolean;
  isWrong: boolean;
  history: CardHistoryEntry | undefined;
  onAnswer: (card: Card, isCorrect: boolean) => void;
  onRef: (id: string, el: HTMLDivElement | null) => void;
  onInnerRef: (id: string, el: HTMLDivElement | null) => void;
  onPostAction: (card: Card, action: PostAction) => void;
}

const FeedCardItem = memo(function FeedCardItem({
  card,
  struggling,
  keyFact,
  isAnswered,
  isWrong,
  history,
  onAnswer,
  onRef,
  onInnerRef,
  onPostAction,
}: FeedCardItemProps) {
  return (
    <div
      data-card-id={card.id}
      data-answered={isAnswered}
      ref={(el) => onRef(card.id, el)}
      className="feed-card px-3 py-3"
    >
      <div className="w-full max-w-lg mx-auto h-full rounded-3xl aurora-hairline bg-white">
      <div
        ref={(el) => onInnerRef(card.id, el)}
        className="h-full w-full rounded-3xl card-protected overflow-y-auto"
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
              className="w-2 h-2 rounded-full"
              title="Сложная карточка"
              style={{ background: "var(--color-aurora-violet)", boxShadow: "0 0 8px rgba(139, 92, 246, 0.7)" }}
            />
          )}
        </div>
        {struggling && keyFact && <KeyFactBanner keyFact={keyFact} />}
        <CardRenderer
          card={card}
          onAnswer={(isCorrect) => onAnswer(card, isCorrect)}
          cardHistory={history}
        />
        {!isAnswered && (
          <div className="px-6 pb-2">
            <HintButton
              entityId={card.id}
              entityType="card"
              topic={card.topic}
              specialty={card.specialty}
            />
          </div>
        )}
        {isWrong && (
          <div className="px-6 pb-2">
            <AutoExplain
              entityId={card.id}
              entityType="card"
              trigger={true}
              topic={card.topic}
              specialty={card.specialty}
            />
          </div>
        )}
        {isAnswered && (
          <div className="px-6 pb-4">
            <PostAnswerActions onAction={(action) => onPostAction(card, action)} />
          </div>
        )}
      </div>
      </div>
    </div>
  );
});

export default function CardFeed({ cards }: Props) {
  const { progress, recordAnswerWithGamification } = useGamification();
  const { setCurrentCard } = useMedMind();
  const { onCorrectAnswer, onWrongAnswer } = useMedMindCompanion();
  const { fatigue, recordAnswer: recordFatigue, dismiss: dismissFatigue } = useFatigueDetection();
  // Session seed фиксируется на время mount — shuffle стабилен, пока
  // пользователь остаётся в ленте.
  const sessionSeedRef = useRef<string>(Math.random().toString(36).slice(2));
  const shuffled = useMemo(
    () => stableShuffle(cards, sessionSeedRef.current),
    [cards]
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [answeredCardId, setAnsweredCardId] = useState<string | null>(null);
  const [wrongCardId, setWrongCardId] = useState<string | null>(null);
  const [snapLocked, setSnapLocked] = useState(false);
  const [pendingAchievement, setPendingAchievement] =
    useState<AchievementDef | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const innerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { startIndex, endIndex, currentIndex, topSpacerPx, bottomSpacerPx } =
    useVirtualWindow({
      itemCount: shuffled.length,
      itemHeight: null,
      containerRef: scrollRef,
      overscanBefore: 2,
      overscanAfter: 3,
    });

  // Обновляем текущую карточку в MedMindContext по скролл-индексу.
  // Раньше это делалось через IntersectionObserver по всем cardRefs —
  // при виртуализации observer наблюдал бы только за refs из Map
  // на момент mount, пропуская появляющиеся при скролле карточки.
  useEffect(() => {
    const card = shuffled[currentIndex];
    if (card) setCurrentCard(card);
  }, [currentIndex, shuffled, setCurrentCard]);

  // После ответа прокручиваем inner-контейнер карточки к низу, чтобы блок
  // «Верно/Неверно + объяснение» (animate-result) оказался в кадре. Без
  // этого на коротких экранах объяснение скрывалось за нижней границей
  // viewport. AutoExplain подгружается асинхронно и увеличивает высоту
  // позже — ResizeObserver держит scroll у низа, пока карточка активна.
  useEffect(() => {
    if (!answeredCardId) return;
    const inner = innerRefs.current.get(answeredCardId);
    if (!inner) return;

    let rafId: number | null = null;
    const scrollToBottom = (smooth: boolean) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        inner.scrollTo({
          top: inner.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
        rafId = null;
      });
    };

    scrollToBottom(true);

    const observer = new ResizeObserver(() => scrollToBottom(false));
    observer.observe(inner);
    const child = inner.firstElementChild;
    if (child) observer.observe(child as Element);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [answeredCardId]);

  // После ответа snap временно выключен (data-snap-locked="true") — это
  // нужно, чтобы появление блока с объяснением не триггерило автоматический
  // переход к следующей карточке. Первое осмысленное взаимодействие
  // (touch, pointer, колесо, клавиатура) возвращает snap — дальше TikTok
  // свайпом работает как обычно.
  useEffect(() => {
    if (!snapLocked) return;
    const el = scrollRef.current;
    if (!el) return;
    const unlock = () => setSnapLocked(false);
    el.addEventListener("touchstart", unlock, { once: true, passive: true });
    el.addEventListener("pointerdown", unlock, { once: true });
    el.addEventListener("wheel", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      el.removeEventListener("touchstart", unlock);
      el.removeEventListener("pointerdown", unlock);
      el.removeEventListener("wheel", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [snapLocked]);

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  const setInnerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) innerRefs.current.set(id, el);
    else innerRefs.current.delete(id);
  }, []);

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
      setSnapLocked(true);
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

  const handlePostAction = useCallback((card: Card, action: PostAction) => {
    const topic = card.topic;
    const q = encodeURIComponent(
      "question" in card ? (card as any).question ?? "" :
      "statement" in card ? (card as any).statement ?? "" :
      "scenario" in card ? (card as any).scenario ?? "" : ""
    );
    window.location.href = `/companion?topic=${encodeURIComponent(topic)}&q=${q}&action=${action}`;
  }, []);

  const visibleCards = shuffled.slice(startIndex, endIndex);

  return (
    <div
      ref={scrollRef}
      className="feed-scroll h-full"
      data-snap-locked={snapLocked}
    >
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
      {topSpacerPx > 0 && (
        <div aria-hidden style={{ height: `${topSpacerPx}px` }} />
      )}
      {visibleCards.map((card) => {
        const history = progress.cardHistory?.[card.id];
        return (
          <FeedCardItem
            key={card.id}
            card={card}
            struggling={isStruggling(history)}
            keyFact={card.keyFact}
            isAnswered={answeredCardId === card.id}
            isWrong={wrongCardId === card.id}
            history={history}
            onAnswer={handleAnswer}
            onRef={setCardRef}
            onInnerRef={setInnerRef}
            onPostAction={handlePostAction}
          />
        );
      })}
      {bottomSpacerPx > 0 && (
        <div aria-hidden style={{ height: `${bottomSpacerPx}px` }} />
      )}
    </div>
  );
}
