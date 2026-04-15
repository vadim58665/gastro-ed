"use client";

import { getLevelForXp, getXpToNextLevel, getRankForAccuracy } from "@/data/levels";

interface Props {
  xp: number;
  recentAnswers: boolean[];
  compact?: boolean;
}

const colorMap: Record<string, string> = {
  muted: "text-muted",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  purple: "text-purple-500",
};

export default function LevelBadge({ xp, recentAnswers, compact }: Props) {
  const level = getLevelForXp(xp);
  const next = getXpToNextLevel(xp);
  const rank = getRankForAccuracy(recentAnswers);
  const levelColor = colorMap[level.color] || "text-foreground";
  const rankColor = colorMap[rank.color] || "text-foreground";

  if (compact) {
    return (
      <span className={`text-xs font-medium ${rankColor}`}>
        {rank.title}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-3xl font-extralight ${levelColor}`}>
        {level.level}
      </span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
        уровень
      </span>
      <span className={`text-sm font-medium ${rankColor} mt-1`}>
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
