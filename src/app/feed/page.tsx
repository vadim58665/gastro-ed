"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CardFeed from "@/components/feed/CardFeed";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import Onboarding from "@/components/ui/Onboarding";
import { demoCards } from "@/data/cards";

function FeedContent() {
  const searchParams = useSearchParams();
  const topicFilter = searchParams.get("topic");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("gastro-ed-onboarding")) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("gastro-ed-onboarding", "done");
    setShowOnboarding(false);
  };

  const cards = useMemo(
    () =>
      topicFilter
        ? demoCards.filter((c) => c.topic === topicFilter)
        : demoCards,
    [topicFilter]
  );

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      {topicFilter && (
        <div className="px-6 pt-3 pb-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium">
            {topicFilter} · {cards.length} карточек
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
