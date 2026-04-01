"use client";

import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { demoCards } from "@/data/cards";
import { useMemo } from "react";

export default function TopicsPage() {
  const topics = useMemo(() => {
    const map = new Map<string, number>();
    for (const card of demoCards) {
      map.set(card.topic, (map.get(card.topic) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

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

        {/* Total */}
        <div className="text-center mb-8">
          <div className="text-5xl font-extralight text-foreground tracking-tight leading-none">
            {demoCards.length}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted mt-2 font-medium">
            карточек всего
          </p>
          <div className="w-12 h-px bg-border mx-auto mt-6" />
        </div>

        {/* Topic list */}
        <div className="px-6">
          {topics.map((topic, i) => (
            <Link
              key={topic.name}
              href={`/feed?topic=${encodeURIComponent(topic.name)}`}
              className="block"
            >
              <div className="flex items-baseline justify-between py-4 group">
                <span className="text-base font-light text-foreground group-hover:text-primary transition-colors">
                  {topic.name}
                </span>
                <span className="text-2xl font-extralight text-foreground tracking-tight">
                  {topic.count}
                </span>
              </div>
              {i < topics.length - 1 && (
                <div className="w-full h-px bg-border" />
              )}
            </Link>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
