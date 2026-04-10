"use client";

import { useMemo } from "react";
import { useProgress } from "@/hooks/useProgress";
import { useMedMindAnalytics } from "@/hooks/useMedMindAnalytics";
import { getMasteryLevel } from "@/lib/mastery";

export default function WeeklyDigest() {
  const { progress } = useProgress();
  const { topics, weakTopics, strongTopics } = useMedMindAnalytics();

  const accuracy =
    progress.cardsSeen > 0
      ? Math.round((progress.cardsCorrect / progress.cardsSeen) * 100)
      : 0;

  const topMastery = useMemo(() => {
    if (topics.length === 0) return null;
    const best = topics.reduce((a, b) =>
      a.masteryScore > b.masteryScore ? a : b
    );
    return { topic: best.topic, mastery: getMasteryLevel(best) };
  }, [topics]);

  const worstMastery = useMemo(() => {
    if (weakTopics.length === 0) return null;
    const worst = weakTopics[0];
    return { topic: worst.topic, mastery: getMasteryLevel(worst) };
  }, [weakTopics]);

  if (progress.cardsSeen === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <DigestCard
          value={String(topics.length)}
          label="тем изучено"
        />
        <DigestCard
          value={String(strongTopics.length)}
          label="сильных тем"
          accent="text-success"
        />
        <DigestCard
          value={String(weakTopics.length)}
          label="слабых тем"
          accent={weakTopics.length > 0 ? "text-danger" : "text-muted"}
        />
        <DigestCard
          value={`${accuracy}%`}
          label="общая точность"
        />
      </div>

      {(topMastery || worstMastery) && (
        <div className="space-y-2">
          {topMastery && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface">
              <span className="text-xs text-muted">Лучшая тема</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground">{topMastery.topic}</span>
                <span className={`text-[10px] uppercase tracking-widest font-medium ${topMastery.mastery.color}`}>
                  {topMastery.mastery.label}
                </span>
              </div>
            </div>
          )}
          {worstMastery && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface">
              <span className="text-xs text-muted">Нужна работа</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground">{worstMastery.topic}</span>
                <span className={`text-[10px] uppercase tracking-widest font-medium ${worstMastery.mastery.color}`}>
                  {worstMastery.mastery.label}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DigestCard({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="text-center py-3 rounded-lg bg-surface">
      <div className={`text-2xl font-extralight tracking-tight leading-none ${accent || "text-foreground"}`}>
        {value}
      </div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted mt-1.5 font-medium">
        {label}
      </p>
    </div>
  );
}
