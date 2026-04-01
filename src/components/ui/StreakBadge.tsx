"use client";

import { useProgress } from "@/hooks/useProgress";

export default function StreakBadge() {
  const { progress } = useProgress();

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full">
        <svg className="w-4 h-4 text-orange-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 16c3.314 0 6-2.686 6-6 0-3.5-2.5-6.5-4-8-.667 1-2 2-2.5 2C7 4 8 2 8 0 5 2 2 5.5 2 10c0 3.314 2.686 6 6 6zm0-2c-1.657 0-3-1.343-3-3 0-1.4 1-2.8 1.8-3.6.3.5.8 1.1 1.2 1.1.5 0 .7-.5.7-.5.5 1 1.3 2 1.3 3 0 1.657-1.343 3-3 3z" />
        </svg>
        <span className="text-sm font-bold text-orange-500">
          {progress.streakCurrent} д.
        </span>
      </div>
      <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full">
        <svg className="w-4 h-4 text-amber-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 .5l2.066 4.562L15 5.78l-3.5 3.72L12.34 15 8 12.46 3.66 15l.84-5.5L1 5.78l4.934-.718z" />
        </svg>
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
