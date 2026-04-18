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
      className="relative rounded-2xl bg-card aurora-hairline px-4 py-3.5"
      style={{
        boxShadow:
          "0 1px 2px rgba(17,24,39,0.03), 0 10px 24px -14px color-mix(in srgb, var(--color-aurora-indigo) 22%, transparent)",
      }}
    >
      <div className="flex justify-between items-baseline mb-2.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted font-medium">
            До уровня «{nextLevel}»
          </div>
          <div
            className="text-2xl font-extralight tracking-tight aurora-text"
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
        style={{ background: "var(--aurora-indigo-soft)" }}
      >
        <div
          data-xp-bar
          className="h-full rounded-full relative aurora-grad-bg"
          style={{ width: `${fillPercent}%` }}
        >
          <div
            className="absolute rounded-full"
            style={{
              right: 0,
              top: "50%",
              transform: "translate(50%, -50%)",
              width: 10,
              height: 10,
              background: "var(--color-aurora-pink)",
              boxShadow:
                "0 0 0 2px var(--color-card), 0 0 12px color-mix(in srgb, var(--color-aurora-pink) 60%, transparent)",
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
