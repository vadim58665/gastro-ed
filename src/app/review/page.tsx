"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import CardRenderer from "@/components/feed/CardRenderer";
import { useReview } from "@/hooks/useReview";
import { useGamification } from "@/hooks/useGamification";
import { useProgress } from "@/hooks/useProgress";
import { useMode } from "@/contexts/ModeContext";
import { demoCards } from "@/data/cards";
import { Rating } from "ts-fsrs";
import { hapticCorrect, hapticWrong } from "@/lib/feedback";

type PageState = "idle" | "session" | "summary";

const ALL_SPECIALTIES = [
  "Аллергология",
  "Гастроэнтерология",
  "Гинекология",
  "Дерматология",
  "Детская неврология",
  "Диетология",
  "Кардиология",
  "Лечебное дело",
  "Медико-профилактическое дело",
  "Неврология",
  "Оториноларингология",
  "Офтальмология",
  "Педиатрия",
  "Пульмонология",
  "Ревматология",
  "Стоматология",
  "Травматология",
  "Урология",
  "Фармация",
  "Хирургия",
  "Эндокринология",
];

interface SessionCard {
  cardId: string;
  isCorrect: boolean;
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return "сейчас";
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}д ${hours % 24}ч`;
  if (hours > 0) return `${hours}ч ${minutes % 60}м`;
  return `${minutes}м`;
}

function getDifficultyLabel(difficulty: number): { text: string; color: string } | null {
  if (difficulty > 7) return { text: "высокая", color: "var(--color-aurora-pink)" };
  if (difficulty > 4) return { text: "средняя", color: "var(--color-aurora-violet)" };
  return null;
}

export default function ReviewPage() {
  const { getDueCards, reviewCard, getNextDueDate, getCardStats, getReviewCard, reviewCards: allReviewCards } = useReview();
  const { recordAnswerWithGamification } = useGamification();
  const { progress } = useProgress();
  const { mode } = useMode();
  const source = mode === "feed" ? "feed" as const : "prep" as const;

  const [pageState, setPageState] = useState<PageState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [sessionResults, setSessionResults] = useState<SessionCard[]>([]);
  const [sessionCards, setSessionCards] = useState<typeof demoCards>([]);
  const [specialtyFilter, setSpecialtyFilter] = useState<string | null>(null);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [showList, setShowList] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (answered && nextRef.current) {
      nextRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [answered]);

  const dueCardIds = useMemo(() => getDueCards(source), [getDueCards, source]);
  const allDueCards = useMemo(
    () =>
      dueCardIds
        .map((id) => demoCards.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => c != null),
    [dueCardIds]
  );

  // Specialty chips data
  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of allDueCards) {
      counts[card.specialty] = (counts[card.specialty] || 0) + 1;
    }
    return counts;
  }, [allDueCards]);

  // Filtered cards by specialty
  const dueCards = useMemo(
    () => specialtyFilter ? allDueCards.filter((c) => c.specialty === specialtyFilter) : allDueCards,
    [allDueCards, specialtyFilter]
  );

  // During session, use the fixed snapshot; outside session, use reactive list
  const currentCard = pageState === "session" ? sessionCards[currentIndex] : null;

  const handleStartSession = useCallback(() => {
    setSessionCards([...dueCards]);
    setCurrentIndex(0);
    setAnswered(false);
    setSessionResults([]);
    setPageState("session");
  }, [dueCards]);

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      setAnswered(true);
      setLastCorrect(isCorrect);
      isCorrect ? hapticCorrect() : hapticWrong();
      if (currentCard) {
        recordAnswerWithGamification(isCorrect, currentCard.id, currentCard.type, currentCard.topic);
      }
    },
    [recordAnswerWithGamification, currentCard]
  );

  const handleNext = useCallback(() => {
    if (!currentCard) return;
    const grade = lastCorrect ? Rating.Good : Rating.Again;
    reviewCard(currentCard.id, grade);

    const newResults = [...sessionResults, { cardId: currentCard.id, isCorrect: lastCorrect }];
    setSessionResults(newResults);
    setAnswered(false);

    if (currentIndex + 1 >= sessionCards.length) {
      setPageState("summary");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentCard, lastCorrect, reviewCard, sessionResults, currentIndex, sessionCards.length]);

  // Stats
  const cardStats = useMemo(() => getCardStats(source), [getCardStats, source]);
  const nextDue = useMemo(() => getNextDueDate(source), [getNextDueDate, source]);
  const problemCount = useMemo(() => {
    const history = progress.cardHistory || {};
    return allReviewCards
      .filter((rc) => !source || (rc.source || "feed") === source)
      .filter((rc) => (history[rc.cardId]?.consecutiveFails || 0) >= 3)
      .length;
  }, [allReviewCards, source, progress.cardHistory]);

  const hasAnyCards = allReviewCards.filter((rc) => !source || (rc.source || "feed") === source).length > 0;

  // Reset to idle if session has no current card (must be before any early returns)
  useEffect(() => {
    if (pageState === "session" && !currentCard) {
      setPageState("idle");
    }
  }, [pageState, currentCard]);

  // Shared card list component
  const renderCardList = () => (
    <>
      <button
        onClick={() => setShowList(!showList)}
        className="btn-press w-full py-4 border border-border/60 rounded-2xl text-xs text-muted font-medium transition-colors hover:bg-surface"
      >
        {showList ? "Скрыть список" : `История повторений (${cardStats.total})`}
      </button>
      {showList && (
        <div className="mt-3 flex flex-col gap-1.5">
          {allReviewCards
            .filter((rc) => !source || (rc.source || "feed") === source)
            .sort((a, b) => new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime())
            .map((rc) => {
              const card = demoCards.find((c) => c.id === rc.cardId);
              if (!card) return null;
              const history = progress.cardHistory?.[rc.cardId];
              const fails = history?.consecutiveFails || 0;
              const totalAttempts = history?.attempts || 0;
              const correctCount = history?.correct || 0;
              const isDue = new Date(rc.fsrs.due) <= new Date();
              return (
                <div key={rc.cardId} className="flex items-center justify-between px-4 py-3 bg-surface/50 rounded-xl">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="text-xs text-foreground truncate">{card.topic}</div>
                    <div className="text-[10px] text-muted">
                      {isDue
                        ? "готова к повтору"
                        : `повтор через ${formatRelativeTime(new Date(rc.fsrs.due))}`}
                      {totalAttempts > 0 && ` \u00B7 ${correctCount}/${totalAttempts} верно`}
                    </div>
                  </div>
                  {fails >= 3 ? (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "var(--color-aurora-pink)", background: "var(--aurora-pink-soft)" }}>
                      {fails}x
                    </span>
                  ) : isDue ? (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full text-primary bg-primary/10">
                      готова
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full text-muted bg-surface">
                      ждет
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </>
  );

  // === SUMMARY STATE ===
  if (pageState === "summary" && sessionResults.length > 0) {
    const correct = sessionResults.filter((r) => r.isCorrect).length;
    const wrong = sessionResults.length - correct;
    const accuracy = Math.round((correct / sessionResults.length) * 100);
    const isGood = accuracy >= 70;

    const wrongCards = sessionResults
      .filter((r) => !r.isCorrect)
      .map((r) => {
        const card = demoCards.find((c) => c.id === r.cardId);
        const history = progress.cardHistory?.[r.cardId];
        return card ? { topic: card.topic, id: card.id, fails: history?.consecutiveFails || 1 } : null;
      })
      .filter((c): c is NonNullable<typeof c> => c != null);

    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-20 overflow-y-auto">
          <div className="px-6 max-w-lg mx-auto">
            <div className="text-center pt-8 pb-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted font-semibold mb-1">
                Точность
              </p>
              <div
                className="text-7xl font-extralight tracking-tight leading-none"
                style={{ color: isGood ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)" }}
              >
                {accuracy}%
              </div>
              <p className="text-[11px] text-muted mt-2">
                {correct} из {sessionResults.length} правильно
              </p>
            </div>

            <div className="w-12 h-px bg-border mx-auto mb-6" />

            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-extralight" style={{ color: "var(--color-aurora-indigo)" }}>{correct}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">верно</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight" style={{ color: "var(--color-aurora-pink)" }}>{wrong}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">ошибки</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight text-foreground">{cardStats.mastered}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">выучено</div>
              </div>
            </div>

            {wrongCards.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold mb-3">
                  Проблемные карточки
                </p>
                <div className="flex flex-col gap-1.5">
                  {wrongCards.map((c) => (
                    <div key={c.id} className="flex justify-between items-center px-4 py-3 rounded-xl" style={{ background: "var(--aurora-pink-soft)" }}>
                      <span className="text-xs text-foreground">{c.topic}</span>
                      <span className="text-[10px] font-semibold" style={{ color: "var(--color-aurora-pink)" }}>{c.fails} {pluralize(c.fails, "ошибка", "ошибки", "ошибок")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Start again or next review info */}
            {allDueCards.length > 0 ? (
              <>
                {Object.keys(specialtyCounts).length > 1 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowSpecialtyPicker(!showSpecialtyPicker)}
                      className="btn-press w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-surface"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {specialtyFilter || "Все направления"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">{dueCards.length}</span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`text-muted transition-transform duration-200 ${showSpecialtyPicker ? "rotate-180" : ""}`}>
                          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </button>
                    {showSpecialtyPicker && (
                      <div className="mt-1 flex flex-col gap-0.5 bg-surface rounded-2xl overflow-hidden border border-border/40">
                        <button
                          onClick={() => { setSpecialtyFilter(null); setShowSpecialtyPicker(false); }}
                          className={`flex items-center justify-between px-4 py-3 text-left ${!specialtyFilter ? "bg-primary/10" : ""}`}
                        >
                          <span className={`text-sm font-medium ${!specialtyFilter ? "text-primary" : "text-foreground"}`}>Все направления</span>
                          <span className="text-xs text-muted">{allDueCards.length}</span>
                        </button>
                        {ALL_SPECIALTIES.map((spec) => {
                          const count = specialtyCounts[spec] || 0;
                          const hasDue = count > 0;
                          return (
                            <button
                              key={spec}
                              disabled={!hasDue}
                              onClick={() => { setSpecialtyFilter(spec); setShowSpecialtyPicker(false); }}
                              className={`flex items-center justify-between px-4 py-3 text-left ${
                                specialtyFilter === spec ? "bg-primary/10" : ""
                              } ${!hasDue ? "opacity-35 cursor-default" : ""}`}
                            >
                              <span className={`text-sm font-medium ${specialtyFilter === spec ? "text-primary" : "text-foreground"}`}>{spec}</span>
                              <span className={`text-xs font-semibold ${hasDue ? (specialtyFilter === spec ? "text-primary" : "text-muted") : "text-muted"}`}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={handleStartSession}
                  className="btn-press w-full py-4 rounded-2xl bg-foreground text-background text-xs uppercase tracking-[0.2em] font-semibold"
                >
                  {specialtyFilter ? `Начать · ${dueCards.length} карточек` : `Начать все · ${dueCards.length}`}
                </button>
              </>
            ) : (
              <div className="text-center p-4 bg-surface rounded-2xl">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted font-semibold mb-1">
                  Следующий повтор
                </p>
                <div className="text-base font-light text-foreground">
                  {nextDue ? formatRelativeTime(nextDue) : "нет запланированных"}
                </div>
              </div>
            )}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // === IDLE STATE (due cards exist, waiting for user to start) ===
  if (pageState === "idle" && allDueCards.length > 0) {
    const resting = cardStats.total - allDueCards.length;
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-20 overflow-y-auto">
          <div className="px-6 max-w-lg mx-auto">
            <div className="text-center pt-8 pb-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted font-semibold mb-1">
                Готово сейчас
              </p>
              <div className="text-6xl font-extralight text-foreground tracking-tight leading-none">
                {allDueCards.length}
              </div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted mt-2 font-medium">
                {pluralize(allDueCards.length, "карточка", "карточки", "карточек")}
              </p>
              {resting > 0 && (
                <p className="text-[10px] text-muted mt-2 leading-relaxed max-w-[260px] mx-auto">
                  ещё {resting} {pluralize(resting, "отдыхает", "отдыхают", "отдыхают")} по расписанию — вернутся через 1-15 дней
                </p>
              )}
            </div>

            <div className="w-12 h-px bg-border mx-auto mb-6" />

            {/* Mini stats */}
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-extralight text-foreground">{cardStats.total}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">всего</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight" style={{ color: "var(--color-aurora-indigo)" }}>{cardStats.mastered}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">выучено</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight" style={{ color: "var(--color-aurora-pink)" }}>{problemCount}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">сложные</div>
              </div>
            </div>

            {/* Specialty selector */}
            {Object.keys(specialtyCounts).length > 1 && (
              <div className="mb-5">
                <button
                  onClick={() => setShowSpecialtyPicker(!showSpecialtyPicker)}
                  className="btn-press w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-surface"
                >
                  <span className="text-sm font-medium text-foreground">
                    {specialtyFilter || "Все направления"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">{dueCards.length}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`text-muted transition-transform duration-200 ${showSpecialtyPicker ? "rotate-180" : ""}`}>
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
                {showSpecialtyPicker && (
                  <div className="mt-1 flex flex-col gap-0.5 bg-surface rounded-2xl overflow-hidden border border-border/40">
                    <button
                      onClick={() => { setSpecialtyFilter(null); setShowSpecialtyPicker(false); }}
                      className={`flex items-center justify-between px-4 py-3 text-left ${!specialtyFilter ? "bg-primary/10" : ""}`}
                    >
                      <span className={`text-sm font-medium ${!specialtyFilter ? "text-primary" : "text-foreground"}`}>Все направления</span>
                      <span className="text-xs font-semibold text-primary">{allDueCards.length}</span>
                    </button>
                    {ALL_SPECIALTIES.map((spec) => {
                      const count = specialtyCounts[spec] || 0;
                      const hasDue = count > 0;
                      return (
                        <button
                          key={spec}
                          disabled={!hasDue}
                          onClick={() => { setSpecialtyFilter(spec); setShowSpecialtyPicker(false); }}
                          className={`flex items-center justify-between px-4 py-3 text-left ${
                            specialtyFilter === spec ? "bg-primary/10" : ""
                          } ${!hasDue ? "opacity-35 cursor-default" : ""}`}
                        >
                          <span className={`text-sm font-medium ${specialtyFilter === spec ? "text-primary" : "text-foreground"}`}>{spec}</span>
                          <span className={`text-xs font-semibold ${hasDue ? (specialtyFilter === spec ? "text-primary" : "text-muted") : "text-muted"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Start button */}
            <button
              onClick={handleStartSession}
              className="btn-press w-full py-4 rounded-2xl bg-foreground text-background text-xs uppercase tracking-[0.2em] font-semibold mb-4"
            >
              {specialtyFilter ? `Начать · ${dueCards.length} карточек` : `Начать все · ${dueCards.length}`}
            </button>

            {/* Card list */}
            {renderCardList()}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // === EMPTY STATE (no due cards) ===
  if (pageState !== "session" || allDueCards.length === 0) {
    if (!hasAnyCards) {
      return (
        <div className="h-screen flex flex-col">
          <TopBar showBack />
          <main className="flex-1 pt-24 pb-20 flex flex-col items-center justify-center">
            <div className="text-center px-6">
              <div className="text-6xl font-extralight text-foreground tracking-tight leading-none mb-3">
                0
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-8">
                карточек на повторение
              </p>
              <div className="w-12 h-px bg-border mx-auto mb-8" />
              <p className="text-sm text-muted leading-relaxed max-w-[260px] mx-auto">
                Отвечайте на карточки в ленте - они автоматически попадут сюда для
                интервального повторения
              </p>
            </div>
          </main>
          <BottomNav />
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-20 overflow-y-auto">
          <div className="px-6 max-w-lg mx-auto">
            <div className="text-center pt-8 pb-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted font-semibold mb-1">
                Следующий повтор
              </p>
              <div className="text-5xl font-extralight text-foreground tracking-tight leading-none">
                {nextDue ? formatRelativeTime(nextDue) : "---"}
              </div>
            </div>

            <div className="w-12 h-px bg-border mx-auto mb-6" />

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-extralight text-foreground">{cardStats.total}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">всего</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight" style={{ color: "var(--color-aurora-indigo)" }}>{cardStats.mastered}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">выучено</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight" style={{ color: "var(--color-aurora-pink)" }}>{problemCount}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">сложные</div>
              </div>
            </div>

            {renderCardList()}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // === SESSION STATE ===
  if (!currentCard) {
    return null;
  }

  const total = sessionCards.length;
  const progressFraction = currentIndex / total;
  const reviewData = getReviewCard(currentCard.id);
  const cardHistory = progress.cardHistory?.[currentCard.id];
  const consecutiveFails = cardHistory?.consecutiveFails || 0;
  const reps = reviewData?.fsrs.reps || 0;
  const difficulty = reviewData?.fsrs.difficulty || 0;
  const diffLabel = getDifficultyLabel(difficulty);

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        {/* Progress bar */}
        <div className="px-5 pt-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">
              Повторение
            </span>
            <span className="text-[10px] text-muted tabular-nums">
              {currentIndex + 1} из {total}
            </span>
          </div>
          <div className="h-[3px] bg-border/40 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
              style={{ width: `${progressFraction * 100}%` }}
            />
          </div>
        </div>

        {/* Specialty label */}
        {specialtyFilter && (
          <div className="px-5 pt-3 pb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
              {specialtyFilter}
            </span>
          </div>
        )}

        {/* Card */}
        <div className="px-3 pt-3">
          <div className="w-full max-w-lg mx-auto rounded-3xl surface-raised">
            <div className="flex items-center justify-between px-6 pt-5 pb-1">
              <span className="text-xs text-muted font-semibold uppercase tracking-wider">
                {currentCard.topic}
              </span>
              {consecutiveFails >= 3 && (
                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold" style={{ color: "var(--color-aurora-pink)", background: "var(--aurora-pink-soft)" }}>
                  {consecutiveFails} ошибок подряд
                </span>
              )}
            </div>
            <CardRenderer key={currentCard.id} card={currentCard} onAnswer={handleAnswer} />
          </div>
        </div>

        {/* Card meta */}
        <div className="flex justify-center gap-4 mt-2 mb-1">
          {reps > 0 && (
            <span className="text-[10px] text-muted">Повтор #{reps}</span>
          )}
          {diffLabel && (
            <span className="text-[10px]" style={{ color: diffLabel.color }}>Сложность: {diffLabel.text}</span>
          )}
        </div>

        {/* Next button after answering */}
        {answered && (
          <div className="px-6 mt-3 max-w-lg mx-auto">
            <button
              ref={nextRef}
              onClick={handleNext}
              className="w-full py-3.5 rounded-2xl text-sm font-medium transition-colors border"
              style={lastCorrect ? {
                background: "var(--aurora-indigo-soft)",
                color: "var(--color-aurora-indigo)",
                borderColor: "var(--aurora-indigo-border)",
              } : {
                background: "var(--aurora-pink-soft)",
                color: "var(--color-aurora-pink)",
                borderColor: "var(--aurora-pink-border)",
              }}
            >
              {lastCorrect ? "Далее" : "Повторить позже"}
            </button>
            <p className="text-[10px] text-muted text-center mt-2">
              {lastCorrect ? "Следующий повтор через 1 день" : "Вернется в очередь через пару минут"}
            </p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
