"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import CardRenderer from "@/components/feed/CardRenderer";
import { useGamification } from "@/hooks/useGamification";
import { demoCards } from "@/data/cards";
import {
  getFeedMistakes,
  getStuckMistakes,
  getFreshMistakes,
  getTopFails,
  groupBySpecialty,
  groupByTopic,
} from "@/lib/mistakes";
import { hapticCorrect, hapticWrong } from "@/lib/feedback";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useMedMind } from "@/contexts/MedMindContext";
import { allSpecialties } from "@/data/specialties";
import type { Card } from "@/types/card";

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

const LIGHTNING_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const FLAME_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
const TARGET_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

export default function MistakesPage() {
  const { progress, recordAnswerWithGamification } = useGamification();
  const { activeSpecialty, setActiveSpecialty } = useSpecialty();
  const { setScreen } = useMedMind();

  const [pageState, setPageState] = useState<PageState>("idle");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const specialtyFilter = activeSpecialty?.name ?? null;
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  useEffect(() => {
    if (activeSpecialty && filterMode === "all") {
      setFilterMode("specialty");
    }
  }, [activeSpecialty]);

  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [sessionCards, setSessionCards] = useState<typeof demoCards>([]);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);

  const allMistakes = useMemo(() => getFeedMistakes(progress, demoCards), [progress]);
  const stuckMistakes = useMemo(() => getStuckMistakes(progress, allMistakes, 3), [progress, allMistakes]);
  const freshMistakes = useMemo(() => getFreshMistakes(progress, allMistakes, 24), [progress, allMistakes]);
  const topFails = useMemo(() => getTopFails(progress, allMistakes, 3), [progress, allMistakes]);

  const specialtyGroups = useMemo(() => groupBySpecialty(allMistakes), [allMistakes]);

  const topicGroups = useMemo(() => {
    const scoped = specialtyFilter
      ? allMistakes.filter((c) => c.specialty === specialtyFilter)
      : allMistakes;
    return groupByTopic(scoped);
  }, [allMistakes, specialtyFilter]);

  useEffect(() => {
    if (answered && nextRef.current) {
      nextRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [answered]);

  const startSessionWithCards = useCallback((cards: Card[]) => {
    if (cards.length === 0) return;
    setSessionCards([...cards]);
    setCurrentIndex(0);
    setSessionResults([]);
    setAnswered(false);
    setPageState("session");
  }, []);

  const currentCard = pageState === "session" ? sessionCards[currentIndex] : null;

  useEffect(() => {
    if (currentCard) {
      setScreen({ kind: "feed_card", card: currentCard });
    } else {
      setScreen({ kind: "other", label: "Работа над ошибками" });
    }
  }, [currentCard, setScreen]);

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      setAnswered(true);
      setLastCorrect(isCorrect);
      isCorrect ? hapticCorrect() : hapticWrong();
      if (currentCard) {
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
    const results = [...sessionResults, { cardId: currentCard.id, isCorrect: lastCorrect }];
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
            <div className="text-6xl font-extralight tracking-tight leading-none aurora-text tabular-nums mb-3">
              0
            </div>
            <p
              className="text-xs uppercase tracking-[0.2em] font-medium mb-8"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              ошибок
            </p>
            <div className="w-12 h-px bg-border mx-auto mb-8" />
            <p className="text-sm text-muted leading-relaxed max-w-[280px] mx-auto">
              Отвечайте на карточки в ленте. Те, на которые вы ответите неверно, попадут сюда,
              и вы сможете проработать их по специальностям и темам.
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
        <TopBar showBack onBack={handleBackToIdle} />
        <main className="flex-1 pt-24 pb-20 overflow-y-auto">
          <div className="px-6 max-w-lg mx-auto">
            <div className="text-center pt-8 pb-6">
              <p
                className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1"
                style={{ color: "var(--color-aurora-violet)" }}
              >
                Результат
              </p>
              <div
                className="text-7xl font-extralight tracking-tight leading-none tabular-nums"
                style={{
                  color: isGood ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)",
                }}
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
                <div className="text-2xl font-extralight" style={{ color: "var(--color-aurora-indigo)" }}>
                  {correct}
                </div>
                <div
                  className="text-[9px] uppercase tracking-[0.15em] font-semibold"
                  style={{ color: "var(--color-aurora-violet)" }}
                >
                  закрыто
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight" style={{ color: "var(--color-aurora-pink)" }}>
                  {wrong}
                </div>
                <div
                  className="text-[9px] uppercase tracking-[0.15em] font-semibold"
                  style={{ color: "var(--color-aurora-violet)" }}
                >
                  осталось
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extralight text-foreground">{allMistakes.length}</div>
                <div
                  className="text-[9px] uppercase tracking-[0.15em] font-semibold"
                  style={{ color: "var(--color-aurora-violet)" }}
                >
                  всего ошибок
                </div>
              </div>
            </div>

            <button
              onClick={handleBackToIdle}
              className="btn-press btn-premium-dark w-full py-4 rounded-2xl text-xs uppercase tracking-[0.2em] font-semibold"
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
        <TopBar showBack onBack={handleBackToIdle} />
        <main className="flex-1 pt-24 pb-20 overflow-y-auto">
          <div className="px-5 pt-4">
            <div className="flex justify-between items-center mb-1.5">
              <span
                className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                style={{ color: "var(--color-aurora-violet)" }}
              >
                Ошибки
              </span>
              <span className="text-[10px] text-muted tabular-nums">
                {currentIndex + 1} из {total}
              </span>
            </div>
            <div className="h-[3px] bg-border/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressFraction * 100}%`,
                  background: "var(--aurora-gradient-primary)",
                }}
              />
            </div>
          </div>

          <div className="px-3 pt-3">
            <div className="w-full max-w-lg mx-auto rounded-3xl aurora-hairline bg-white">
              <div className="flex items-center justify-between px-6 pt-5 pb-1">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider">
                  {currentCard.topic}
                </span>
                <span className="text-[9px] text-muted">{currentCard.specialty}</span>
              </div>
              <CardRenderer key={currentCard.id} card={currentCard} onAnswer={handleAnswer} />
            </div>
          </div>

          {answered && (
            <div className="px-6 mt-3 max-w-lg mx-auto">
              <button
                ref={nextRef}
                onClick={handleNext}
                className="btn-press w-full py-3.5 rounded-2xl text-sm font-medium border transition-colors"
                style={
                  lastCorrect
                    ? {
                        background: "var(--aurora-indigo-soft)",
                        color: "var(--color-aurora-indigo)",
                        borderColor: "var(--aurora-indigo-border)",
                      }
                    : {
                        background: "var(--aurora-pink-soft)",
                        color: "var(--color-aurora-pink)",
                        borderColor: "var(--aurora-pink-border)",
                      }
                }
              >
                {lastCorrect ? "Далее, ошибка закрыта" : "Далее, ошибка остаётся"}
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

  // ============ IDLE STATE (mode-focused layout) ============
  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        <div className="px-6 max-w-lg mx-auto">
          {/* Hero */}
          <div className="text-center pt-4 pb-6">
            <p
              className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              Ошибки
            </p>
            <div className="text-[64px] font-extralight tracking-tight leading-none aurora-text tabular-nums">
              {allMistakes.length}
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] mt-2 font-medium text-muted">
              {pluralize(allMistakes.length, "карточка", "карточки", "карточек")}
            </p>
            <div className="w-12 h-px bg-border mx-auto mt-6" />
          </div>

          <p className="text-[9px] uppercase tracking-[0.25em] font-semibold mb-3 text-muted">
            Режимы проработки
          </p>

          <div className="flex flex-col gap-2.5">
            {/* Все ошибки */}
            <button
              onClick={() => startSessionWithCards(allMistakes)}
              disabled={allMistakes.length === 0}
              className="btn-press relative rounded-2xl px-5 py-4 text-white overflow-hidden text-left disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--aurora-gradient-dark-bg)",
                boxShadow:
                  "0 2px 6px color-mix(in srgb, var(--color-aurora-indigo) 30%, transparent), 0 18px 40px -12px color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)",
              }}
            >
              <div
                className="absolute pointer-events-none"
                style={{
                  right: -40,
                  top: -40,
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, color-mix(in srgb, var(--color-aurora-pink) 28%, transparent), transparent 70%)",
                }}
              />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium tracking-tight">Все ошибки</div>
                  <div className="text-[11px] text-white/60 mt-0.5">Подряд одной сессией</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[28px] font-extralight tabular-nums leading-none">
                    {allMistakes.length}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Застрявшие */}
            <button
              onClick={() => startSessionWithCards(stuckMistakes)}
              disabled={stuckMistakes.length === 0}
              className="btn-press relative rounded-2xl px-5 py-4 aurora-hairline bg-card overflow-hidden text-left disabled:opacity-50"
              style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, var(--color-aurora-violet), var(--color-aurora-pink))",
                      color: "#fff",
                      boxShadow:
                        "0 4px 10px -3px color-mix(in srgb, var(--color-aurora-pink) 40%, transparent)",
                    }}
                  >
                    {FLAME_SVG}
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-foreground">Застрявшие</div>
                    <div className="text-[11px] text-muted mt-0.5">3+ неверных ответа подряд</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="text-[20px] font-light tabular-nums leading-none"
                    style={{ color: "var(--color-aurora-pink)" }}
                  >
                    {stuckMistakes.length}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Свежие */}
            <button
              onClick={() => startSessionWithCards(freshMistakes)}
              disabled={freshMistakes.length === 0}
              className="btn-press relative rounded-2xl px-5 py-4 aurora-hairline bg-card overflow-hidden text-left disabled:opacity-50"
              style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
                      color: "#fff",
                      boxShadow:
                        "0 4px 10px -3px color-mix(in srgb, var(--color-aurora-indigo) 40%, transparent)",
                    }}
                  >
                    {LIGHTNING_SVG}
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-foreground">Свежие</div>
                    <div className="text-[11px] text-muted mt-0.5">За последние 24 часа</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="text-[20px] font-light tabular-nums leading-none"
                    style={{ color: "var(--color-aurora-indigo)" }}
                  >
                    {freshMistakes.length}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Боль-точки */}
            <button
              onClick={() => startSessionWithCards(topFails.map((t) => t.card))}
              disabled={topFails.length === 0}
              className="btn-press relative rounded-2xl px-5 py-4 aurora-hairline bg-card overflow-hidden text-left disabled:opacity-50"
              style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-pink))",
                      color: "#fff",
                      boxShadow:
                        "0 4px 10px -3px color-mix(in srgb, var(--color-aurora-violet) 40%, transparent)",
                    }}
                  >
                    {TARGET_SVG}
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-foreground">Боль-точки</div>
                    <div className="text-[11px] text-muted mt-0.5">Самые провальные карточки</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="text-[20px] font-light tabular-nums leading-none"
                    style={{ color: "var(--color-aurora-violet)" }}
                  >
                    {topFails.length}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* По специальности */}
            <div>
              <button
                onClick={() => setShowSpecialtyPicker(!showSpecialtyPicker)}
                disabled={specialtyGroups.length === 0}
                className="btn-press relative rounded-2xl px-5 py-4 aurora-hairline bg-card overflow-hidden text-left w-full disabled:opacity-50"
                style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-medium text-foreground">По специальности</div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {specialtyGroups.length} {pluralize(specialtyGroups.length, "раздел", "раздела", "разделов")}
                    </div>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-muted transition-transform duration-200 ${
                      showSpecialtyPicker ? "rotate-90" : ""
                    }`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
              {showSpecialtyPicker && specialtyGroups.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {specialtyGroups.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => {
                        const spec = allSpecialties.find((s) => s.name === g.key);
                        if (spec) setActiveSpecialty(spec.id);
                        setFilterMode("specialty");
                        setTopicFilter(null);
                        setShowSpecialtyPicker(false);
                        startSessionWithCards(allMistakes.filter((c) => c.specialty === g.key));
                      }}
                      className="btn-press flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface hover:bg-card transition-colors text-left"
                    >
                      <span className="text-[13px] font-medium text-foreground">{g.label}</span>
                      <span
                        className="text-[11px] font-semibold tabular-nums"
                        style={{ color: "var(--color-aurora-indigo)" }}
                      >
                        {g.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* По теме */}
            <div>
              <button
                onClick={() => setShowTopicPicker(!showTopicPicker)}
                disabled={topicGroups.length === 0}
                className="btn-press relative rounded-2xl px-5 py-4 aurora-hairline bg-card overflow-hidden text-left w-full disabled:opacity-50"
                style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[15px] font-medium text-foreground">По теме</div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {topicGroups.length} {pluralize(topicGroups.length, "тема", "темы", "тем")}
                    </div>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-muted transition-transform duration-200 ${
                      showTopicPicker ? "rotate-90" : ""
                    }`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </button>
              {showTopicPicker && topicGroups.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {topicGroups.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => {
                        setTopicFilter(g.key);
                        setFilterMode("topic");
                        setShowTopicPicker(false);
                        startSessionWithCards(
                          allMistakes.filter(
                            (c) =>
                              c.topic === g.key &&
                              (!specialtyFilter || c.specialty === specialtyFilter)
                          )
                        );
                      }}
                      className="btn-press flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface hover:bg-card transition-colors text-left"
                    >
                      <span className="text-[13px] font-medium text-foreground">{g.label}</span>
                      <span
                        className="text-[11px] font-semibold tabular-nums"
                        style={{ color: "var(--color-aurora-violet)" }}
                      >
                        {g.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Интервальное повторение */}
            <Link
              href="/review"
              className="btn-press relative rounded-2xl px-5 py-4 aurora-hairline bg-card overflow-hidden block"
              style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium text-foreground">
                    Интервальное повторение
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">FSRS · по расписанию</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
