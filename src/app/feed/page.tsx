"use client";

import { Suspense, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CardFeed from "@/components/feed/CardFeed";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { demoCards } from "@/data/cards";

function FeedContent() {
  const searchParams = useSearchParams();
  const topicFilter = searchParams.get("topic");
  const modeParam = searchParams.get("mode");
  const { activeSpecialty } = useSpecialty();
  const router = useRouter();

  useEffect(() => {
    if (modeParam !== "all" && !activeSpecialty) {
      router.push("/topics");
    }
  }, [activeSpecialty, modeParam, router]);

  const cards = useMemo(() => {
    if (modeParam === "all") {
      return topicFilter
        ? demoCards.filter((c) => c.topic === topicFilter)
        : demoCards;
    }
    if (!activeSpecialty) return [];
    let filtered = demoCards.filter((c) => c.specialty === activeSpecialty.name);
    if (topicFilter) filtered = filtered.filter((c) => c.topic === topicFilter);
    return filtered;
  }, [topicFilter, modeParam, activeSpecialty]);

  const label = modeParam === "all"
    ? topicFilter || "Все темы"
    : topicFilter || activeSpecialty?.name || "";

  return (
    <>
      {label && (
        <div className="px-6 pt-3 pb-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium">
            {label} · {cards.length} карточек
          </p>
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
      <main className="flex-1 pt-14 pb-16 overflow-hidden">
        <Suspense>
          <FeedContent />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
