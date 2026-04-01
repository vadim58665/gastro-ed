"use client";

import { useProgress } from "@/hooks/useProgress";

export default function StreakBadge() {
  const { progress } = useProgress();

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full">
        <span className="text-base">🔥</span>
        <span className="text-sm font-bold text-orange-500">
          {progress.streakCurrent}
        </span>
      </div>
      <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full">
        <span className="text-base">⭐</span>
        <span className="text-sm font-bold text-amber-500">
          {progress.totalPoints}
        </span>
      </div>
      <div className="flex-1" />
      <div className="text-xs font-semibold text-muted bg-surface px-3 py-1.5 rounded-full">
        {progress.todayCardsSeen}/{progress.dailyGoal}
      </div>
    </div>
  );
}
