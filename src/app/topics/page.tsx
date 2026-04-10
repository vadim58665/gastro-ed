"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import SoftListRow from "@/components/ui/SoftListRow";
import { demoCards } from "@/data/cards";
import { accreditationCategories, getCardCount, isSpecialtyAvailable } from "@/data/specialties";
import { useReview } from "@/hooks/useReview";
import { useSpecialty } from "@/contexts/SpecialtyContext";

export default function TopicsPage() {
  const { reviewCards } = useReview();
  const { setActiveSpecialty, clearSpecialty } = useSpecialty();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const answeredIds = useMemo(
    () => new Set(reviewCards.map((rc) => rc.cardId)),
    [reviewCards]
  );

  const totalCards = demoCards.length;

  // Pre-compute topics per specialty
  const topicsBySpecialty = useMemo(() => {
    const map = new Map<string, { name: string; total: number; answered: number }[]>();

    for (const cat of accreditationCategories) {
      for (const spec of cat.specialties) {
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
    }
    return map;
  }, [answeredIds]);

  const handleAllClick = () => {
    clearSpecialty();
    router.push("/feed?mode=all");
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
      <main className="flex-1 pt-16 pb-20 overflow-y-auto">
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
            subtitle="5 случайных вопросов — бесплатно"
            trailing={
              <span className="text-2xl font-extralight text-foreground tracking-tight">5</span>
            }
          />
        </div>

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

        {/* Categories */}
        <div className="px-6 pb-8">
          {accreditationCategories.map((category, catIndex) => (
            <div key={category.id} className={catIndex > 0 ? "mt-8" : ""}>
              <h2 className="text-sm font-medium text-foreground mb-1">
                {category.name}
              </h2>
              <p className="text-xs text-muted mb-4">
                {category.description}
              </p>

              <div className="space-y-2">
                {category.specialties.map((spec) => {
                  const count = getCardCount(spec.name);
                  const available = isSpecialtyAvailable(spec.name);
                  const isExpanded = expandedId === spec.id;
                  const topics = topicsBySpecialty.get(spec.id);
                  const hasTopics = available && topics && topics.length > 0;
                  const initial = spec.name.trim()[0]?.toUpperCase() ?? "";

                  return (
                    <div key={spec.id}>
                      <SoftListRow
                        onClick={() => {
                          if (!available) return;
                          if (hasTopics) toggleAccordion(spec.id);
                          else handleSpecialtyClick(spec.id);
                        }}
                        disabled={!available}
                        icon={
                          <span className="text-base font-semibold tracking-tight">
                            {initial}
                          </span>
                        }
                        title={
                          <>
                            {spec.name}
                            {!available && (
                              <span className="ml-2 text-[9px] uppercase tracking-wider text-muted font-medium">
                                Скоро
                              </span>
                            )}
                          </>
                        }
                        subtitle={
                          available && count > 0
                            ? `${count} ${count === 1 ? "карточка" : "карточек"}`
                            : undefined
                        }
                        trailing={
                          hasTopics ? (
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
                          ) : available ? (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-muted"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          ) : (
                            <span />
                          )
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
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
