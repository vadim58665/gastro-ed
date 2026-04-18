"use client";

import type React from "react";
import type { AchievementDef } from "@/types/gamification";

interface Props {
  achievement: AchievementDef;
  unlocked: boolean;
  unlockedAt: string | null;
}

const rarityStyle: Record<string, React.CSSProperties> = {
  common: {},
  rare: { borderColor: "var(--aurora-indigo-border)" },
  epic: { borderColor: "var(--aurora-violet-border)" },
  legendary: { borderColor: "var(--aurora-pink-border)" },
};

const rarityLabelColor: Record<string, string | undefined> = {
  common: undefined,
  rare: "var(--color-aurora-indigo)",
  epic: "var(--color-aurora-violet)",
  legendary: "var(--color-aurora-pink)",
};

const rarityLabels: Record<string, string> = {
  common: "Обычное",
  rare: "Редкое",
  epic: "Эпическое",
  legendary: "Легендарное",
};

export default function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
}: Props) {
  const labelColor = rarityLabelColor[achievement.rarity];
  return (
    <div
      className={`rounded-lg border border-border p-4 transition-opacity ${
        unlocked ? "opacity-100" : "opacity-40"
      }`}
      style={rarityStyle[achievement.rarity]}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-foreground">
          {achievement.title}
        </p>
        <span className="text-xs text-muted shrink-0">
          +{achievement.xpReward} XP
        </span>
      </div>
      <p className="text-xs text-muted mb-2">{achievement.description}</p>
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={labelColor ? { color: labelColor } : { color: "var(--color-muted)" }}
        >
          {rarityLabels[achievement.rarity]}
        </span>
        {unlocked && unlockedAt && (
          <span className="text-[10px] text-muted">
            {new Date(unlockedAt).toLocaleDateString("ru-RU")}
          </span>
        )}
      </div>
    </div>
  );
}
