"use client";

import { useMemo } from "react";
import { useProgress } from "./useProgress";
import { demoCards } from "@/data/cards";
import type { TopicAnalysis } from "@/types/medmind";

// Build card-id to topic+specialty lookup once
const cardMeta = new Map<string, { topic: string; specialty: string }>();
for (const card of demoCards) {
  cardMeta.set(card.id, { topic: card.topic, specialty: card.specialty });
}

export function useMedMindAnalytics(): {
  topics: TopicAnalysis[];
  weakTopics: TopicAnalysis[];
  strongTopics: TopicAnalysis[];
} {
  const { progress } = useProgress();

  const topics = useMemo(() => {
    const topicMap = new Map<
      string,
      { specialty: string; attempted: number; correct: number }
    >();

    // Aggregate from cardHistory
    for (const [cardId, entry] of Object.entries(progress.cardHistory)) {
      const meta = cardMeta.get(cardId);
      if (!meta || entry.attempts === 0) continue;

      const existing = topicMap.get(meta.topic);
      if (existing) {
        existing.attempted += entry.attempts;
        existing.correct += entry.correct;
      } else {
        topicMap.set(meta.topic, {
          specialty: meta.specialty,
          attempted: entry.attempts,
          correct: entry.correct,
        });
      }
    }

    const result: TopicAnalysis[] = [];
    for (const [topic, data] of topicMap) {
      const errorRate =
        data.attempted > 0
          ? (data.attempted - data.correct) / data.attempted
          : 0;
      const masteryScore = data.attempted > 0 ? data.correct / data.attempted : 0;

      result.push({
        topic,
        specialty: data.specialty,
        cardsAttempted: data.attempted,
        cardsCorrect: data.correct,
        errorRate: Math.round(errorRate * 10000) / 10000,
        masteryScore: Math.round(masteryScore * 10000) / 10000,
        isWeak: errorRate > 0.4,
      });
    }

    // Sort by error rate descending (weakest first)
    result.sort((a, b) => b.errorRate - a.errorRate);
    return result;
  }, [progress.cardHistory]);

  const weakTopics = useMemo(
    () => topics.filter((t) => t.isWeak),
    [topics]
  );

  const strongTopics = useMemo(
    () => topics.filter((t) => t.masteryScore > 0.85),
    [topics]
  );

  return { topics, weakTopics, strongTopics };
}
