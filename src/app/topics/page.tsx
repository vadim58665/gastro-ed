"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import SoftListRow from "@/components/ui/SoftListRow";
import { demoCards } from "@/data/cards";
import { allSpecialties, getCardCount, isSpecialtyAvailable } from "@/data/specialties";
import { useReview } from "@/hooks/useReview";
import { useProgress } from "@/hooks/useProgress";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { getWeakTopics } from "@/lib/weakTopics";

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export default function TopicsPage() {
  const { reviewCards } = useReview();
  const { progress } = useProgress();
  const { setActiveSpecialty, clearSpecialty } = useSpecialty();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const answeredIds = useMemo(
    () => new Set(reviewCards.map((rc) => rc.cardId)),
    [reviewCards]
  );

  const totalCards = demoCards.length;

  const modeCounts = useMemo(() => {
    let myth = 0;
    let redFlags = 0;
    let dose = 0;
    for (const c of demoCards) {
      if (c.type === "myth_or_fact") myth++;
      else if (c.type === "red_flags") redFlags++;
      else if (c.type === "dose_calc") dose++;
    }
    return { myth, redFlags, dose };
  }, []);

  const weakTopicsCount = useMemo(
    () => getWeakTopics(progress, demoCards).length,
    [progress]
  );

  // Pre-compute topics per specialty
  const topicsBySpecialty = useMemo(() => {
    const map = new Map<string, { name: string; total: number; answered: number }[]>();

    for (const spec of allSpecialties) {
      const cards = demoCards.filter((c) => c.specialty === spec.name);
      if (cards.length === 0) continue;

      const totalMap = new Map<string, number>();
      const answeredMap = new Map<string, number>();

      for (const card of cards) {
        totalMap.set(card.topic, (totalMap.get(card.topic) || 0) + 1);
        if (answeredIds.has(card.id)) {
          answeredMap.set(card.topic, (answeredMap.get(card.topic) || 0) + 1);
        }
      }

      map.set(
        spec.id,
        Array.from(totalMap.entries())
          .map(([name, count]) => ({
            name,
            total: count,
            answered: answeredMap.get(name) || 0,
          }))
          .sort((a, b) => b.total - a.total)
      );
    }
    return map;
  }, [answeredIds]);

  const handleAllClick = () => {
    clearSpecialty();
    router.push("/feed?mode=all");
  };

  const handleModeClick = (mode: "myth" | "red_flags" | "dose" | "weak") => {
    clearSpecialty();
    router.push(`/feed?mode=${mode}`);
  };

  const handleSpecialtyClick = (specId: string) => {
    setActiveSpecialty(specId);
    router.push("/feed");
  };

  const handleTopicClick = (specId: string, topicName: string) => {
    setActiveSpecialty(specId);
    router.push(`/feed?topic=${encodeURIComponent(topicName)}`);
  };

  const toggleAccordion = (specId: string) => {
    setExpandedId(expandedId === specId ? null : specId);
  };

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-3">
            Разделы
          </p>
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Темы
          </h1>
        </div>

        {/* Morning Blitz */}
        <div className="px-6 mb-3">
          <SoftListRow
            onClick={() => router.push("/morning-blitz")}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 L4 14 h7 l-1 8 9-12 h-7 z" />
              </svg>
            }
            title="Утренний блиц"
            subtitle="5 случайных вопросов"
            trailing={
              <span className="text-2xl font-extralight text-foreground tracking-tight">5</span>
            }
          />
        </div>

        {/* Правда или миф */}
        {modeCounts.myth > 0 && (
          <div className="px-6 mb-3">
            <SoftListRow
              onClick={() => handleModeClick("myth")}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.5 9.5 a2.5 2.5 0 1 1 3.5 2.3 c-0.9 0.4-1 1-1 1.7" />
                  <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
                </svg>
              }
              title="Правда или миф"
              subtitle="Короткие утверждения: верите или нет"
              trailing={
                <span className="text-2xl font-extralight text-foreground tracking-tight">
                  {modeCounts.myth}
                </span>
              }
            />
          </div>
        )}

        {/* Красные флаги */}
        {modeCounts.redFlags > 0 && (
          <div className="px-6 mb-3">
            <SoftListRow
              onClick={() => handleModeClick("red_flags")}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 21 V4" />
                  <path d="M5 4 h11 l-2 3.5 L16 11 H5" />
                </svg>
              }
              title="Красные флаги"
              subtitle="Распознайте опасные симптомы"
              trailing={
                <span className="text-2xl font-extralight text-foreground tracking-tight">
                  {modeCounts.redFlags}
                </span>
              }
            />
          </div>
        )}

        {/* Дозировки */}
        {modeCounts.dose > 0 && (
          <div className="px-6 mb-3">
            <SoftListRow
              onClick={() => handleModeClick("dose")}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="9" width="18" height="6" rx="3" />
                  <path d="M12 9 v6" />
                </svg>
              }
              title="Дозировки"
              subtitle="Расчёты препаратов в уме"
              trailing={
                <span className="text-2xl font-extralight text-foreground tracking-tight">
                  {modeCounts.dose}
                </span>
              }
            />
          </div>
        )}

        {/* Слабые места */}
        {weakTopicsCount > 0 && (
          <div className="px-6 mb-3">
            <SoftListRow
              onClick={() => handleModeClick("weak")}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 7 9 13 13 9 21 17" />
                  <polyline points="15 17 21 17 21 11" />
                </svg>
              }
              title="Слабые места"
              subtitle="Темы, где вы чаще ошибаетесь"
              trailing={
                <span className="text-2xl font-extralight text-foreground tracking-tight">
                  {weakTopicsCount}
                </span>
              }
            />
          </div>
        )}

        {/* "Общее"  - all cards */}
        <div className="px-6 mb-6">
          <SoftListRow
            onClick={handleAllClick}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="14" height="16" rx="2" />
                <path d="M7 4v16" />
                <path d="M20 7v13a1 1 0 0 1-1 1h-2" />
              </svg>
            }
            title="Общее"
            subtitle="Все карточки вперемешку"
            trailing={
              <span className="text-2xl font-extralight text-foreground tracking-tight">
                {totalCards}
              </span>
            }
          />
        </div>

        <div className="w-12 h-px bg-border mx-auto mb-6" />

        {/* Specialties */}
        <div className="px-6 pb-8">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4">
            Специальности
          </h2>
          <div className="space-y-2">
            {allSpecialties.map((spec) => {
              const count = getCardCount(spec.name);
              const available = isSpecialtyAvailable(spec.name);
              const isExpanded = expandedId === spec.id;
              const topics = topicsBySpecialty.get(spec.id);
              const hasTopics = available && topics && topics.length > 0;
              const initial = spec.name.trim()[0]?.toUpperCase() ?? "";

              if (!available) return null;

              return (
                <div key={spec.id}>
                  <SoftListRow
                    onClick={() => {
                      if (hasTopics) toggleAccordion(spec.id);
                      else handleSpecialtyClick(spec.id);
                    }}
                    icon={
                      <span className="text-base font-semibold tracking-tight">
                        {initial}
                      </span>
                    }
                    title={spec.name}
                    subtitle={`${count} ${pluralize(count, "карточка", "карточки", "карточек")}`}
                    trailing={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`text-muted transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    }
                  />

                  {/* Expanded topics */}
                  {isExpanded && topics && (
                    <div className="ml-16 mt-1 mb-2 space-y-0.5">
                      {topics.map((topic) => (
                        <button
                          key={topic.name}
                          onClick={() => handleTopicClick(spec.id, topic.name)}
                          className="w-full text-left px-4 py-3 rounded-xl hover:bg-surface transition-colors group"
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-light text-foreground group-hover:text-primary transition-colors">
                              {topic.name}
                            </span>
                            <span className="text-lg font-extralight text-foreground tracking-tight">
                              {topic.total}
                            </span>
                          </div>
                          <div className="w-full h-0.5 bg-border rounded-full overflow-hidden mt-1.5">
                            <div
                              className="h-full bg-foreground/30 rounded-full transition-all duration-500"
                              style={{ width: `${(topic.answered / topic.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted mt-0.5">
                            {topic.answered} / {topic.total}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
