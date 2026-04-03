"use client";

import { useGamification } from "@/hooks/useGamification";
import LevelBadge from "./LevelBadge";
import ProgressRing from "./ProgressRing";

export default function StreakBadge() {
  const { progress } = useGamification();

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
        <LevelBadge xp={progress.xp || 0} compact />
        <span className="text-sm font-bold text-amber-500">
          {progress.xp || 0}
        </span>
      </div>
      <div className="flex-1" />
      <ProgressRing current={progress.todayCardsSeen} total={progress.dailyGoal} size={32} />
    </div>
  );
}
