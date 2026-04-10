"use client";

import { useGamification } from "@/hooks/useGamification";
import { getLevelForXp } from "@/data/levels";
import ProgressRing from "./ProgressRing";

export default function StreakBadge() {
  const { progress } = useGamification();
  const level = getLevelForXp(progress.xp || 0);

  return (
    <div className="flex items-center gap-2.5">
      {/* Streak — thin flame outline */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 border border-border/70 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted"
          aria-hidden="true"
        >
          <path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-1.5.5-2.5 1-3 0 1.5 1 2 1.5 2 .5 0 1-.5 1-1.5 0-2-.5-3-.5-5.5 0 0 1 0 1 0z" />
        </svg>
        <span className="text-[11px] font-semibold tracking-tight text-foreground tabular-nums">
          {progress.streakCurrent}
        </span>
        <span className="text-[10px] uppercase tracking-[0.1em] text-muted font-medium">
          д.
        </span>
      </div>

      {/* Level — thin chevron-up outline */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 border border-border/70 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted"
          aria-hidden="true"
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
        <span className="text-[10px] uppercase tracking-[0.1em] text-muted font-medium">
          Ур.
        </span>
        <span className="text-[11px] font-semibold tracking-tight text-foreground tabular-nums">
          {level.level}
        </span>
        <span className="text-[11px] font-semibold tracking-tight text-muted tabular-nums">
          {progress.xp || 0}
        </span>
      </div>

      <div className="flex-1" />
      <ProgressRing current={progress.todayCardsSeen} total={progress.dailyGoal} size={32} />
    </div>
  );
}
