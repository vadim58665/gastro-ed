"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
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

        {/* "Общее" — all cards */}
        <div className="px-6 mb-6">
          <button
            onClick={handleAllClick}
            className="w-full text-left px-5 py-4 rounded-2xl border border-primary/20 bg-primary-light/30 hover:border-primary/40 transition-all btn-press"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-light text-foreground">
                  Общее
                </span>
                <p className="text-[10px] text-muted mt-0.5 uppercase tracking-wider">
                  Все карточки вперемешку
                </p>
              </div>
              <span className="text-2xl font-extralight text-foreground tracking-tight">
                {totalCards}
              </span>
            </div>
          </button>
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

                  return (
                    <div key={spec.id}>
                      {/* Specialty row */}
                      <div
                        className={`w-full text-left px-5 py-4 rounded-2xl border transition-all ${
                          available
                            ? "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                            : "bg-surface border-border/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Accordion toggle */}
                            {available && topics && topics.length > 0 ? (
                              <button
                                onClick={() => toggleAccordion(spec.id)}
                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                >
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </button>
                            ) : (
                              <div className="flex-shrink-0 w-6" />
                            )}

                            {/* Specialty name — clickable to go to feed */}
                            {available ? (
                              <button
                                onClick={() => handleSpecialtyClick(spec.id)}
                                className="text-base font-light text-foreground hover:text-primary transition-colors text-left truncate"
                              >
                                {spec.name}
                              </button>
                            ) : (
                              <span className="text-base font-light text-muted truncate">
                                {spec.name}
                                <span className="ml-2 text-[10px] uppercase tracking-wider font-medium">
                                  Скоро
                                </span>
                              </span>
                            )}
                          </div>

                          {count > 0 && (
                            <span className="text-2xl font-extralight text-foreground tracking-tight ml-3">
                              {count}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded topics */}
                      {isExpanded && topics && (
                        <div className="ml-8 mt-1 mb-2 space-y-0.5">
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
