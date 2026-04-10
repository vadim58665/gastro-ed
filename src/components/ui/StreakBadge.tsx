"use client";

import { useGamification } from "@/hooks/useGamification";
import { getLevelForXp } from "@/data/levels";
import { useReview } from "@/hooks/useReview";
import { useMode } from "@/contexts/ModeContext";

export default function StreakBadge() {
  const { progress } = useGamification();
  const level = getLevelForXp(progress.xp || 0);
  const { getDueCount } = useReview();
  const { mode } = useMode();
  const dueCount = getDueCount(mode === "feed" ? "feed" : "prep");

  return (
    <div className="flex items-center justify-between bg-surface rounded-2xl px-2 py-1.5">
      {/* Streak */}
      <div className="flex items-center gap-1.5 px-1">
        <svg width="15" height="15" viewBox="0 0 24 24" className="text-warning shrink-0">
          <path d="M12 2C9.5 6 7 9 7 13a5 5 0 0 0 10 0c0-4-2.5-7-5-11z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 9c-1 2-2 3.5-2 5a2 2 0 0 0 4 0c0-1.5-1-3-2-5z" fill="currentColor" />
        </svg>
        <span className="text-[11px] font-bold tabular-nums text-foreground">{progress.streakCurrent}</span>
        <span className="text-[11px] text-muted">дней</span>
      </div>

      <div className="w-px h-4 bg-border/30" />

      {/* Level */}
      <div className="flex items-center gap-1.5 px-1">
        <svg width="15" height="15" viewBox="0 0 24 24" className="text-primary shrink-0">
          <path d="M12 2l2.9 6.3H22l-5.7 4.4 2.2 6.8L12 15.3l-6.5 4.2 2.2-6.8L2 8.3h7.1z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <span className="text-[11px] font-bold tabular-nums text-foreground">{level.level}</span>
        <span className="text-[11px] text-muted">уровень</span>
      </div>

      <div className="w-px h-4 bg-border/30" />

      {/* Today */}
      <div className="flex items-center gap-1.5 px-1">
        <svg width="15" height="15" viewBox="0 0 24 24" className="text-success shrink-0">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 12.5l3 3 5-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span className="text-[11px] font-bold tabular-nums text-foreground">{progress.todayCardsSeen}</span>
        <span className="text-[11px] text-muted">сегодня</span>
      </div>

      <div className="w-px h-4 bg-border/30" />

      {/* Due for review */}
      <div className="flex items-center gap-1.5 px-1">
        <svg width="15" height="15" viewBox="0 0 24 24" className="text-danger shrink-0">
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.5" />
          <polyline points="12 7 12 12 15.5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span className="text-[11px] font-bold tabular-nums text-foreground">{dueCount}</span>
        <span className="text-[11px] text-muted">повтор</span>
      </div>
    </div>
  );
}
