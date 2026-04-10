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

function FeedContent() {
  const searchParams = useSearchParams();
  const topicFilter = searchParams.get("topic");
  const modeParam = searchParams.get("mode");
  const { activeSpecialty } = useSpecialty();
  const router = useRouter();
  const [diffLevel, setDiffLevel] = useState<DifficultyLevel>(3);
  const [showDiffPicker, setShowDiffPicker] = useState(false);

  useEffect(() => {
    setDiffLevel(getStoredDifficulty());
  }, []);

  useEffect(() => {
    if (modeParam !== "all" && !activeSpecialty) {
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
    } else if (!activeSpecialty) {
      return [];
    } else {
      base = demoCards.filter((c) => c.specialty === activeSpecialty.name);
      if (topicFilter) base = base.filter((c) => c.topic === topicFilter);
    }
    // Exclude cards with images (visual_quiz)
    base = base.filter((c) => c.type !== "visual_quiz");
    return filterByDifficulty(base, diffLevel);
  }, [topicFilter, modeParam, activeSpecialty, diffLevel]);

  const label = modeParam === "all"
    ? topicFilter || "Все темы"
    : topicFilter || activeSpecialty?.name || "";

  return (
    <>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {topicFilter && (
            <button
              onClick={() => router.back()}
              className="text-muted hover:text-foreground transition-colors -ml-1"
              aria-label="Назад"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {label && (
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium">
              {label} · {cards.length}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiffPicker(!showDiffPicker)}
            className="text-[10px] uppercase tracking-widest text-primary/70 hover:text-primary transition-colors px-2 py-1"
          >
            {["", "Студент", "Ординатор", "Врач", "Профессор", "Академик"][diffLevel]}
          </button>
          <QuestionSearch cards={demoCards} />
        </div>
      </div>
      {showDiffPicker && (
        <div className="px-4 pb-2">
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
      <main className="flex-1 pt-20 pb-16 overflow-hidden">
        <Suspense>
          <FeedContent />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
