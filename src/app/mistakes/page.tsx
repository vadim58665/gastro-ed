"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import CardRenderer from "@/components/feed/CardRenderer";
import { useGamification } from "@/hooks/useGamification";
import { demoCards } from "@/data/cards";
import { getFeedMistakes, groupBySpecialty, groupByTopic } from "@/lib/mistakes";
import { hapticCorrect, hapticWrong } from "@/lib/feedback";

type PageState = "idle" | "session" | "summary";
type FilterMode = "all" | "specialty" | "topic";

interface SessionResult {
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

export default function MistakesPage() {
  const { progress, recordAnswerWithGamification } = useGamification();

  const [pageState, setPageState] = useState<PageState>("idle");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [sessionCards, setSessionCards] = useState<typeof demoCards>([]);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Все «живые» ошибки пользователя на основе cardHistory.
  // Реактивно обновляется при изменении progress (после ответа).
  const allMistakes = useMemo(
    () => getFeedMistakes(progress, demoCards),
    [progress]
  );

  const specialtyGroups = useMemo(
    () => groupBySpecialty(allMistakes),
    [allMistakes]
  );

  // Темы всегда считаем в рамках выбранной специальности (если есть),
  // иначе — по всем ошибкам.
  const topicGroups = useMemo(() => {
    const scoped = specialtyFilter
      ? allMistakes.filter((c) => c.specialty === specialtyFilter)
      : allMistakes;
    return groupByTopic(scoped);
  }, [allMistakes, specialtyFilter]);

  // Отфильтрованный список карточек для текущего режима.
  const filteredMistakes = useMemo(() => {
    let list = allMistakes;
    if (filterMode === "specialty" && specialtyFilter) {
      list = list.filter((c) => c.specialty === specialtyFilter);
    }
    if (filterMode === "topic") {
      if (specialtyFilter) {
        list = list.filter((c) => c.specialty === specialtyFilter);
      }
      if (topicFilter) {
        list = list.filter((c) => c.topic === topicFilter);
      }
    }
    return list;
  }, [allMistakes, filterMode, specialtyFilter, topicFilter]);

  useEffect(() => {
    if (answered && nextRef.current) {
      nextRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [answered]);

  const handleStartSession = useCallback(() => {
    if (filteredMistakes.length === 0) return;
    setSessionCards([...filteredMistakes]);
    setCurrentIndex(0);
    setSessionResults([]);
    setAnswered(false);
    setPageState("session");
  }, [filteredMistakes]);

  const currentCard = pageState === "session" ? sessionCards[currentIndex] : null;

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      setAnswered(true);
      setLastCorrect(isCorrect);
      isCorrect ? hapticCorrect() : hapticWrong();
      if (currentCard) {
        // Важно: skipReviewSchedule=true — не добавляем карточку в FSRS-очередь
        // при неверном ответе, чтобы она не всплывала через день в /review.
        // Правильный ответ обнулит consecutiveFails, и карточка исчезнет из /mistakes.
        recordAnswerWithGamification(
          isCorrect,
          currentCard.id,
          currentCard.type,
          currentCard.topic,
          { skipReviewSchedule: true }
        );
      }
    },
    [currentCard, recordAnswerWithGamification]
  );

  const handleNext = useCallback(() => {
    if (!currentCard) return;
    const results = [
      ...sessionResults,
      { cardId: currentCard.id, isCorrect: lastCorrect },
    ];
    setSessionResults(results);
    setAnswered(false);
    if (currentIndex + 1 >= sessionCards.length) {
      setPageState("summary");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentCard, lastCorrect, sessionResults, currentIndex, sessionCards.length]);

  const handleBackToIdle = useCallback(() => {
    setPageState("idle");
    setCurrentIndex(0);
    setSessionResults([]);
    setSessionCards([]);
    setAnswered(false);
  }, []);

  // ============ EMPTY STATE ============
  if (pageState === "idle" && allMistakes.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-20 flex flex-col items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl font-extralight text-foreground tracking-tight leading-none mb-3">
              0
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-8">
              ошибок
            </p>
            <div className="w-12 h-px bg-border mx-auto mb-8" />
            <p className="text-sm text-muted leading-relaxed max-w-[280px] mx-auto">
              Отвечайте на карточки в ленте. Те, на которые вы ответите неверно,
              попадут сюда, и вы сможете проработать их по специальностям и темам.
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ============ SUMMARY STATE ============
  if (pageState === "summary") {
    const correct = sessionResults.filter((r) => r.isCorrect).length;
    const wrong = sessionResults.length - correct;
    const accuracy = sessionResults.length
      ? Math.round((correct / sessionResults.length) * 100)
      : 0;
    const isGood = accuracy >= 70;

    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-20 overflow-y-auto">
          <div className="px-6 max-w-lg mx-auto">
            <div className="text-center pt-8 pb-6">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted font-semibold mb-1">
                Результат
              </p>
              <div
                className={`text-7xl font-extralight tracking-tight leading-none ${
                  isGood ? "text-success" : "text-danger"
                }`}
              >
                {accuracy}%
              </div>
              <p className="text-[11px] text-muted mt-2">
                {correct} из {sessionResults.length} правильно
              </p>
            </div>

            <div className="w-12 h-px bg-border mx-auto mb-6" />

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-extralight text-success">{correct}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">
                  закрыто
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight text-danger">{wrong}</div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">
                  осталось
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight text-foreground">
                  {allMistakes.length}
                </div>
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted font-semibold">
                  всего ошибок
                </div>
              </div>
            </div>

            <button
              onClick={handleBackToIdle}
              className="btn-press w-full py-4 rounded-2xl bg-foreground text-background text-xs uppercase tracking-[0.2em] font-semibold"
            >
              К режимам
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ============ SESSION STATE ============
  if (pageState === "session" && currentCard) {
    const total = sessionCards.length;
    const progressFraction = currentIndex / total;

    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-20 overflow-y-auto">
          <div className="px-5 pt-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">
                Ошибки
              </span>
              <span className="text-[10px] text-muted tabular-nums">
                {currentIndex + 1} из {total}
              </span>
            </div>
            <div className="h-[3px] bg-border/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-danger to-danger/70 transition-all duration-300"
                style={{ width: `${progressFraction * 100}%` }}
              />
            </div>
          </div>

          <div className="px-3 pt-3">
            <div className="w-full max-w-lg mx-auto rounded-3xl surface-raised">
              <div className="flex items-center justify-between px-6 pt-5 pb-1">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider">
                  {currentCard.topic}
                </span>
                <span className="text-[9px] text-muted">{currentCard.specialty}</span>
              </div>
              <CardRenderer
                key={currentCard.id}
                card={currentCard}
                onAnswer={handleAnswer}
              />
            </div>
          </div>

          {answered && (
            <div className="px-6 mt-3 max-w-lg mx-auto">
              <button
                ref={nextRef}
                onClick={handleNext}
                className={`w-full py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                  lastCorrect
                    ? "bg-success/15 text-success border border-success/25"
                    : "bg-danger/15 text-danger border border-danger/25"
                }`}
              >
                {lastCorrect
                  ? "Далее — ошибка закрыта"
                  : "Далее — ошибка остаётся"}
              </button>
              <p className="text-[10px] text-muted text-center mt-2">
                {lastCorrect
                  ? "Карточка ушла из раздела ошибок"
                  : "Попробуйте ещё раз позже"}
              </p>
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  // ============ IDLE STATE ============
  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        <div className="px-6 max-w-lg mx-auto">
          <div className="text-center pt-8 pb-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted font-semibold mb-1">
              Ошибки
            </p>
            <div className="text-6xl font-extralight text-foreground tracking-tight leading-none">
              {allMistakes.length}
            </div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted mt-2 font-medium">
              {pluralize(allMistakes.length, "карточка", "карточки", "карточек")}
            </p>
          </div>

          <div className="w-12 h-px bg-border mx-auto mb-6" />

          {/* Режимы */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold mb-3">
              Режим проработки
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFilterMode("all");
                  setSpecialtyFilter(null);
                  setTopicFilter(null);
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-medium transition-colors ${
                  filterMode === "all"
                    ? "bg-foreground text-background border border-foreground"
                    : "bg-surface text-foreground border border-border hover:bg-card"
                }`}
              >
                Все
              </button>
              <button
                onClick={() => {
                  setFilterMode("specialty");
                  setTopicFilter(null);
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-medium transition-colors ${
                  filterMode === "specialty"
                    ? "bg-foreground text-background border border-foreground"
                    : "bg-surface text-foreground border border-border hover:bg-card"
                }`}
              >
                Специальность
              </button>
              <button
                onClick={() => setFilterMode("topic")}
                className={`flex-1 py-3 rounded-xl text-xs font-medium transition-colors ${
                  filterMode === "topic"
                    ? "bg-foreground text-background border border-foreground"
                    : "bg-surface text-foreground border border-border hover:bg-card"
                }`}
              >
                Тема
              </button>
            </div>
          </div>

          {/* Picker специальности */}
          {(filterMode === "specialty" || filterMode === "topic") && (
            <div className="mb-4">
              <button
                onClick={() => setShowSpecialtyPicker(!showSpecialtyPicker)}
                className="btn-press w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-surface"
              >
                <span className="text-sm font-medium text-foreground">
                  {specialtyFilter || "Все специальности"}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className={`text-muted transition-transform duration-200 ${
                    showSpecialtyPicker ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M3 5l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {showSpecialtyPicker && (
                <div className="mt-1 flex flex-col gap-0.5 bg-surface rounded-2xl overflow-hidden border border-border/40 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSpecialtyFilter(null);
                      setTopicFilter(null);
                      setShowSpecialtyPicker(false);
                    }}
                    className={`flex items-center justify-between px-4 py-3 text-left ${
                      !specialtyFilter ? "bg-primary/10" : ""
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        !specialtyFilter ? "text-primary" : "text-foreground"
                      }`}
                    >
                      Все специальности
                    </span>
                    <span className="text-xs text-muted">{allMistakes.length}</span>
                  </button>
                  {specialtyGroups.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => {
                        setSpecialtyFilter(g.key);
                        setTopicFilter(null);
                        setShowSpecialtyPicker(false);
                      }}
                      className={`flex items-center justify-between px-4 py-3 text-left ${
                        specialtyFilter === g.key ? "bg-primary/10" : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          specialtyFilter === g.key ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {g.label}
                      </span>
                      <span className="text-xs font-semibold text-muted">{g.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Picker темы */}
          {filterMode === "topic" && topicGroups.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowTopicPicker(!showTopicPicker)}
                className="btn-press w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-surface"
              >
                <span className="text-sm font-medium text-foreground">
                  {topicFilter || "Все темы"}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className={`text-muted transition-transform duration-200 ${
                    showTopicPicker ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M3 5l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {showTopicPicker && (
                <div className="mt-1 flex flex-col gap-0.5 bg-surface rounded-2xl overflow-hidden border border-border/40 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setTopicFilter(null);
                      setShowTopicPicker(false);
                    }}
                    className={`flex items-center justify-between px-4 py-3 text-left ${
                      !topicFilter ? "bg-primary/10" : ""
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        !topicFilter ? "text-primary" : "text-foreground"
                      }`}
                    >
                      Все темы
                    </span>
                    <span className="text-xs text-muted">
                      {topicGroups.reduce((s, g) => s + g.count, 0)}
                    </span>
                  </button>
                  {topicGroups.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => {
                        setTopicFilter(g.key);
                        setShowTopicPicker(false);
                      }}
                      className={`flex items-center justify-between px-4 py-3 text-left ${
                        topicFilter === g.key ? "bg-primary/10" : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${
                          topicFilter === g.key ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {g.label}
                      </span>
                      <span className="text-xs font-semibold text-muted">{g.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleStartSession}
            disabled={filteredMistakes.length === 0}
            className="btn-press w-full py-4 rounded-2xl bg-foreground text-background text-xs uppercase tracking-[0.2em] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {filteredMistakes.length > 0
              ? `Начать · ${filteredMistakes.length} ${pluralize(filteredMistakes.length, "карточка", "карточки", "карточек")}`
              : "Нет ошибок в выборке"}
          </button>

          <Link
            href="/review"
            className="block mt-6 px-4 py-3 rounded-xl bg-surface border border-border hover:bg-card transition-colors"
          >
            <div className="text-xs font-medium text-foreground">
              Интервальное повторение →
            </div>
            <p className="text-[10px] text-muted mt-0.5 leading-snug">
              Закрепление выученных карточек по расписанию, чтобы не забыть
            </p>
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
