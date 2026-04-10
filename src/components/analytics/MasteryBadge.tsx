"use client";

import type { MasteryInfo } from "@/lib/mastery";

interface MasteryBadgeProps {
  mastery: MasteryInfo;
  topic?: string;
  compact?: boolean;
}

export default function MasteryBadge({ mastery, topic, compact }: MasteryBadgeProps) {
  if (compact) {
    return (
      <span className={`text-[10px] uppercase tracking-widest font-medium ${mastery.color}`}>
        {mastery.label}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      {topic && (
        <span className="text-xs text-foreground font-medium">{topic}</span>
      )}
      <span className={`text-[10px] uppercase tracking-widest font-medium ${mastery.color}`}>
        {mastery.label}
      </span>
    </div>
  );
}
