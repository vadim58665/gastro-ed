"use client";

import { Suspense, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CardFeed from "@/components/feed/CardFeed";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { demoCards } from "@/data/cards";
import QuestionSearch from "@/components/search/QuestionSearch";
import { filterByDifficulty, getAdaptiveDifficulty } from "@/lib/difficulty";
import { getRankForAccuracy } from "@/data/levels";
import { useProgress } from "@/hooks/useProgress";
import { getWeakTopics, getWeakTopicCards } from "@/lib/weakTopics";

const STANDALONE_MODES = new Set(["all", "myth", "red_flags", "dose", "weak"]);

const MODE_LABELS: Record<string, string> = {
  all: "Все темы",
  myth: "Правда или миф",
  red_flags: "Красные флаги",
  dose: "Дозировки",
  weak: "Слабые места",
};

function FeedContent() {
  const searchParams = useSearchParams();
  const topicFilter = searchParams.get("topic");
  const modeParam = searchParams.get("mode");
  const { activeSpecialty, clearSpecialty } = useSpecialty();
  const { progress } = useProgress();
  const router = useRouter();
  const recentAnswers = progress.recentAnswers || [];
  const diffLevel = useMemo(() => getAdaptiveDifficulty(recentAnswers), [recentAnswers]);
  const rank = useMemo(() => getRankForAccuracy(recentAnswers), [recentAnswers]);

  useEffect(() => {
    const isStandalone = modeParam && STANDALONE_MODES.has(modeParam);
    if (!isStandalone && !activeSpecialty) {
      router.push("/topics");
    }
  }, [activeSpecialty, modeParam, router]);

  function handleExit() {
    clearSpecialty();
    router.push("/topics");
  }

  const cards = useMemo(() => {
    let base: typeof demoCards;
    if (modeParam === "all") {
      base = topicFilter
        ? demoCards.filter((c) => c.topic === topicFilter)
        : demoCards;
    } else if (modeParam === "myth") {
      base = demoCards.filter((c) => c.type === "myth_or_fact");
    } else if (modeParam === "red_flags") {
      base = demoCards.filter((c) => c.type === "red_flags");
    } else if (modeParam === "dose") {
      base = demoCards.filter((c) => c.type === "dose_calc");
    } else if (modeParam === "weak") {
      const weakTopics = getWeakTopics(progress, demoCards);
      base = getWeakTopicCards(demoCards, weakTopics);
    } else if (!activeSpecialty) {
      return [];
    } else {
      base = demoCards.filter((c) => c.specialty === activeSpecialty.name);
      if (topicFilter) base = base.filter((c) => c.topic === topicFilter);
    }
    // Exclude cards with images (visual_quiz)
    base = base.filter((c) => c.type !== "visual_quiz");
    return filterByDifficulty(base, diffLevel);
  }, [topicFilter, modeParam, activeSpecialty, diffLevel, progress]);

  const label =
    modeParam && STANDALONE_MODES.has(modeParam)
      ? topicFilter || MODE_LABELS[modeParam]
      : topicFilter || activeSpecialty?.name || "";

  return (
    <>
      <div className="flex-none w-full max-w-lg mx-auto px-4 pt-3 pb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {(topicFilter || activeSpecialty) && (
            <button
              onClick={handleExit}
              className="text-muted hover:text-foreground transition-colors -ml-1 shrink-0"
              aria-label="Выйти из специальности"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {label && (
            <p className="text-[9px] uppercase tracking-[0.22em] text-muted font-medium truncate min-w-0">
              {label} · {cards.length}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[9px] font-medium tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: "rgba(99,102,241,0.08)", color: "#6366F1" }}
          >
            {rank.title}
          </span>
          <QuestionSearch cards={demoCards} />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <CardFeed cards={cards} />
      </div>
    </>
  );
}

export default function FeedPage() {
  return (
    <div className="h-screen flex flex-col">
      <TopBar transparent />
      <main className="flex-1 pt-24 pb-16 overflow-hidden flex flex-col">
        <Suspense>
          <FeedContent />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
