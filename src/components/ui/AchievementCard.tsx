"use client";

import type { AchievementDef } from "@/types/gamification";

interface Props {
  achievement: AchievementDef;
  unlocked: boolean;
  unlockedAt: string | null;
}

const rarityBorders: Record<string, string> = {
  common: "border-border",
  rare: "border-primary/30",
  epic: "border-warning/30",
  legendary: "border-danger/30",
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
  return (
    <div
      className={`rounded-lg border p-4 transition-opacity ${
        rarityBorders[achievement.rarity] || "border-border"
      } ${unlocked ? "opacity-100" : "opacity-40"}`}
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
        <span className="text-[10px] uppercase tracking-wider text-muted">
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
