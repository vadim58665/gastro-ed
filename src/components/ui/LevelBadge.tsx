"use client";

import React from "react";
import { getLevelForXp, getXpToNextLevel, getRankForAccuracy } from "@/data/levels";

interface Props {
  xp: number;
  recentAnswers: boolean[];
  compact?: boolean;
}

const colorMap: Record<string, { className: string; style?: React.CSSProperties }> = {
  muted: { className: "text-muted" },
  primary: { className: "text-primary" },
  success: { className: "", style: { color: "var(--color-aurora-indigo)" } },
  warning: { className: "", style: { color: "var(--color-aurora-violet)" } },
  danger: { className: "", style: { color: "var(--color-aurora-pink)" } },
  purple: { className: "text-purple-500" },
};

export default function LevelBadge({ xp, recentAnswers, compact }: Props) {
  const level = getLevelForXp(xp);
  const next = getXpToNextLevel(xp);
  const rank = getRankForAccuracy(recentAnswers);
  const levelColorEntry = colorMap[level.color] || { className: "text-foreground" };
  const rankColorEntry = colorMap[rank.color] || { className: "text-foreground" };

  if (compact) {
    return (
      <span className={`text-xs font-medium ${rankColorEntry.className}`} style={rankColorEntry.style}>
        {rank.title}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-3xl font-extralight ${levelColorEntry.className}`} style={levelColorEntry.style}>
        {level.level}
      </span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        уровень
      </span>
      <span className={`text-sm font-medium ${rankColorEntry.className} mt-1`} style={rankColorEntry.style}>
        {rank.title}
      </span>
      {next && (
        <div className="w-24 h-1 bg-border rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-primary/40 rounded-full transition-all duration-500"
            style={{ width: `${(next.current / next.needed) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
