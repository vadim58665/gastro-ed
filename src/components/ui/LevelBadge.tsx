"use client";

import { getLevelForXp, getXpToNextLevel } from "@/data/levels";

interface Props {
  xp: number;
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

export default function LevelBadge({ xp, compact }: Props) {
  const level = getLevelForXp(xp);
  const next = getXpToNextLevel(xp);
  const colorClass = colorMap[level.color] || "text-foreground";

  if (compact) {
    return (
      <span className={`text-xs font-medium ${colorClass}`}>
        Ур. {level.level}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-3xl font-extralight ${colorClass}`}>
        {level.level}
      </span>
      <span className="text-xs uppercase tracking-widest text-muted">
        {level.title}
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
