"use client";

import type { TopicAnalysis } from "@/types/medmind";

interface Props {
  topic: TopicAnalysis;
}

export default function TopicAnalysisCard({ topic }: Props) {
  const pct = Math.round(topic.masteryScore * 100);
  const color = topic.isWeak
    ? "bg-danger"
    : pct > 85
      ? "bg-success"
      : "bg-primary";

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{topic.topic}</p>
        <p className="text-[10px] text-muted">
          {topic.cardsAttempted} ответов
        </p>
      </div>
      <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm font-extralight text-foreground w-10 text-right">
        {pct}%
      </p>
    </div>
  );
}
