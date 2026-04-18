"use client";

import { useProgress } from "@/hooks/useProgress";

function pluralDay(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

/**
 * Aurora-chip с mini conic-кольцом streak-а + "N дней" / "Streak" в две строки.
 * Используется в TopBar.
 */
export default function StreakBadge() {
  const { progress } = useProgress();
  const streak = progress.streakCurrent ?? 0;
  const best = progress.streakBest ?? 0;
  const percent = best > 0 ? Math.min(100, (streak / Math.max(best, 7)) * 100) : 0;

  return (
    <div
      className="inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white"
      style={{
        border: "1px solid var(--aurora-indigo-border)",
        boxShadow:
          "0 1px 2px rgba(17,24,39,0.04), 0 6px 18px -8px color-mix(in srgb, var(--color-aurora-indigo) 30%, transparent)",
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: 20,
          height: 20,
          padding: 2,
          background: `conic-gradient(
            from -90deg,
            var(--color-aurora-indigo),
            var(--color-aurora-violet),
            var(--color-aurora-pink) ${percent}%,
            var(--aurora-indigo-soft) ${percent}%
          )`,
        }}
      >
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
          <span className="text-[9px] font-semibold text-foreground">
            {streak}
          </span>
        </div>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium text-foreground">
          {streak} {pluralDay(streak)}
        </span>
        <span
          className="text-[8px] tracking-[0.15em] uppercase"
          style={{ color: "var(--color-aurora-violet)" }}
        >
          Streak
        </span>
      </div>
    </div>
  );
}
