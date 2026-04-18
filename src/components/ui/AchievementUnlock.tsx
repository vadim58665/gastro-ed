"use client";

import React, { useEffect, useState } from "react";
import type { AchievementDef } from "@/types/gamification";

interface Props {
  achievement: AchievementDef;
  onDismiss: () => void;
}

const rarityColors: Record<string, { className?: string; style?: React.CSSProperties }> = {
  common: { className: "text-muted" },
  rare: { className: "text-primary" },
  epic: { style: { color: "var(--color-aurora-violet)" } },
  legendary: { style: { color: "var(--color-aurora-pink)" } },
};

export default function AchievementUnlock({ achievement, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onDismiss}
    >
      <p className="text-xs uppercase tracking-widest text-muted mb-4">
        Достижение разблокировано
      </p>
      <p
        className={`text-6xl font-extralight mb-2 ${
          rarityColors[achievement.rarity]?.className || "text-foreground"
        }`}
        style={rarityColors[achievement.rarity]?.style}
      >
        +{achievement.xpReward}
      </p>
      <p className="text-xs uppercase tracking-widest text-muted mb-6">XP</p>
      <p className="text-xl font-light text-foreground mb-1">
        {achievement.title}
      </p>
      <p className="text-sm text-muted">{achievement.description}</p>
    </div>
  );
}
