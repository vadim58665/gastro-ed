"use client";

interface AccuracyRingProps {
  percent: number;
  fraction?: string;
  trend?: {
    delta: number;
    period: string;
  };
}

export default function AccuracyRing({
  percent,
  fraction,
  trend,
}: AccuracyRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className="aurora-hairline relative rounded-3xl bg-card px-3 py-4 flex flex-col items-center overflow-hidden"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(17,24,39,0.04), 0 18px 36px -18px color-mix(in srgb, var(--color-aurora-violet) 28%, transparent)",
      }}
    >
      <div
        className="text-[9px] tracking-[0.22em] uppercase font-medium"
        style={{ color: "var(--color-aurora-violet)" }}
      >
        Точность
      </div>

      <div
        className="rounded-full mt-2"
        style={{
          width: 88,
          height: 88,
          padding: 5,
          background: `conic-gradient(
            from -90deg,
            var(--color-aurora-indigo) 0%,
            var(--color-aurora-violet) ${clamped * 0.75}%,
            var(--color-aurora-pink) ${clamped}%,
            var(--aurora-indigo-soft) ${clamped}%
          )`,
        }}
      >
        <div className="w-full h-full rounded-full bg-card flex flex-col items-center justify-center">
          <div className="text-[22px] font-extralight tracking-tight text-foreground">
            {clamped}%
          </div>
          {fraction && (
            <div className="text-[8px] tracking-[0.15em] uppercase text-muted font-medium -mt-0.5">
              {fraction}
            </div>
          )}
        </div>
      </div>

      {trend && (
        <div
          className="flex items-center gap-1 mt-2 text-[9px] font-semibold tracking-wide"
          style={{ color: "var(--color-aurora-indigo)" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {trend.delta >= 0 ? (
              <>
                <polyline points="17 6 23 6 23 12" />
                <polyline points="1 18 7 12 13 18 23 6" />
              </>
            ) : (
              <>
                <polyline points="17 18 23 18 23 12" />
                <polyline points="1 6 7 12 13 6 23 18" />
              </>
            )}
          </svg>
          {trend.delta >= 0 ? `+${trend.delta}%` : `${trend.delta}%`} {trend.period}
        </div>
      )}
    </div>
  );
}
