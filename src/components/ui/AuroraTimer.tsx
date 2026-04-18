"use client";

interface AuroraTimerProps {
  timeLeftMs: number;
  totalMs: number;
  className?: string;
}

/**
 * Aurora-таймер для /daily-case: 4px bar с aurora-gradient и pulse-indicator.
 * 3 фазы: normal (>50%), warning (20-50%), danger (<20%).
 * Число справа - секунды Math.ceil.
 */
export default function AuroraTimer({ timeLeftMs, totalMs, className = "" }: AuroraTimerProps) {
  const fraction = Math.max(0, Math.min(1, timeLeftMs / totalMs));
  const seconds = Math.ceil(timeLeftMs / 1000);

  const phase =
    fraction > 0.5 ? "normal" : fraction > 0.2 ? "warning" : "danger";

  const numberColor =
    phase === "normal"
      ? "white"
      : phase === "warning"
      ? "var(--color-aurora-violet)"
      : "var(--color-aurora-pink)";

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex-1 aurora-timer-track">
        <div
          className={`aurora-timer-fill aurora-timer-fill--${phase}`}
          style={{ width: `${fraction * 100}%` }}
        >
          <div className={`aurora-timer-pulse aurora-timer-pulse--${phase}`} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[9px] uppercase tracking-[0.22em] text-white/50 font-semibold">
          таймер
        </div>
        <div
          className="text-3xl font-extralight tabular-nums leading-none mt-0.5"
          style={{ color: numberColor }}
        >
          {seconds}
        </div>
      </div>
    </div>
  );
}
