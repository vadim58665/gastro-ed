"use client";

interface XpProgressProps {
  current: number;
  target: number;
  currentLevel: string;
  nextLevel: string;
}

const formatNumber = (n: number): string =>
  n.toLocaleString("ru-RU").replace(/,/g, " ");

export default function XpProgress({
  current,
  target,
  currentLevel,
  nextLevel,
}: XpProgressProps) {
  const remaining = Math.max(0, target - current);
  const fillPercent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <div
      className="relative rounded-2xl bg-white px-4 py-3.5"
      style={{
        border: "1px solid rgba(99,102,241,0.08)",
        boxShadow:
          "0 1px 2px rgba(17,24,39,0.03), 0 10px 24px -14px rgba(99,102,241,0.2)",
      }}
    >
      <div className="flex justify-between items-baseline mb-2.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted font-medium">
            До уровня «{nextLevel}»
          </div>
          <div
            className="text-2xl font-extralight tracking-tight"
            style={{
              background: "linear-gradient(135deg, #1A1A2E, #6366F1 70%, #A855F7)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {formatNumber(current)}{" "}
            <span className="text-[11px] text-muted font-light">
              / {formatNumber(target)} XP
            </span>
          </div>
        </div>
        <div className="text-[9px] text-muted flex items-center gap-1">
          ещё
          <span className="text-xs text-primary font-medium">{remaining}</span>
        </div>
      </div>

      <div
        className="h-1 rounded-full overflow-hidden relative"
        style={{ background: "rgba(99,102,241,0.08)" }}
      >
        <div
          data-xp-bar
          className="h-full rounded-full relative"
          style={{
            width: `${fillPercent}%`,
            background: "linear-gradient(90deg, #6366F1 0%, #A855F7 60%, #EC4899 100%)",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              right: 0,
              top: "50%",
              transform: "translate(50%, -50%)",
              width: 10,
              height: 10,
              background: "#EC4899",
              boxShadow: "0 0 0 2px #fff, 0 0 12px rgba(236,72,153,0.6)",
            }}
          />
        </div>
      </div>

      <div className="flex justify-between mt-1.5 text-[8px] text-muted tracking-[0.15em] uppercase font-medium">
        <span>{currentLevel}</span>
        <span>{nextLevel}</span>
      </div>
    </div>
  );
}
