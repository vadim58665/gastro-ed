"use client";

import { Suspense, useMemo, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CardFeed from "@/components/feed/CardFeed";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { demoCards } from "@/data/cards";
import QuestionSearch from "@/components/search/QuestionSearch";
import DifficultySelector from "@/components/medmind/DifficultySelector";
import { filterByDifficulty, getStoredDifficulty, setStoredDifficulty } from "@/lib/difficulty";
import type { DifficultyLevel } from "@/types/card";
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
  const { activeSpecialty } = useSpecialty();
  const { progress } = useProgress();
  const router = useRouter();
  const [diffLevel, setDiffLevel] = useState<DifficultyLevel>(3);
  const [showDiffPicker, setShowDiffPicker] = useState(false);

  useEffect(() => {
    setDiffLevel(getStoredDifficulty());
  }, []);

  useEffect(() => {
    const isStandalone = modeParam && STANDALONE_MODES.has(modeParam);
    if (!isStandalone && !activeSpecialty) {
      router.push("/topics");
    }
  }, [activeSpecialty, modeParam, router]);

  function handleDiffChange(level: DifficultyLevel) {
    setDiffLevel(level);
    setStoredDifficulty(level);
    setShowDiffPicker(false);
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
      <div className="w-full max-w-lg mx-auto px-4 pt-3 pb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {topicFilter && (
            <button
              onClick={() => router.back()}
              className="text-muted hover:text-foreground transition-colors -ml-1 shrink-0"
              aria-label="Назад"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {label && (
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium truncate min-w-0">
              {label} · {cards.length}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDiffPicker(!showDiffPicker)}
            className="text-[10px] uppercase tracking-widest text-primary/70 hover:text-primary transition-colors px-2 py-1 whitespace-nowrap"
          >
            {["", "Студент", "Ординатор", "Врач", "Профессор", "Академик"][diffLevel]}
          </button>
          <QuestionSearch cards={demoCards} />
        </div>
      </div>
      {showDiffPicker && (
        <div className="w-full max-w-lg mx-auto px-4 pb-2">
          <DifficultySelector value={diffLevel} onChange={handleDiffChange} compact />
        </div>
      )}
      <CardFeed cards={cards} />
    </>
  );
}

export default function FeedPage() {
  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-24 pb-16 overflow-hidden">
        <Suspense>
          <FeedContent />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
