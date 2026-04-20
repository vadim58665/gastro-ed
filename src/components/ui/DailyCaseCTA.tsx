"use client";

interface DailyCaseCTAProps {
  caseDate: string;
  caseId: string;
  maxPoints: number;
  currentPoints: number;
  active: boolean;
  onStart: () => void;
}

const formatNumber = (n: number): string =>
  n.toLocaleString("ru-RU").replace(/,/g, " ");

export default function DailyCaseCTA({
  caseDate,
  caseId,
  maxPoints,
  currentPoints,
  active,
  onStart,
}: DailyCaseCTAProps) {
  const fillPercent =
    maxPoints > 0 ? Math.min(100, (currentPoints / maxPoints) * 100) : 0;

  return (
    <div
      className="relative rounded-3xl px-4 pt-4 pb-4 text-white overflow-hidden"
      style={{
        background: "var(--aurora-gradient-dark-bg)",
        boxShadow:
          "0 2px 6px color-mix(in srgb, var(--color-aurora-indigo) 30%, transparent), 0 18px 40px -12px color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)",
      }}
    >
      <div
        className="absolute pointer-events-none"
        style={{
          right: -50,
          top: -50,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-aurora-pink) 38%, transparent), color-mix(in srgb, var(--color-aurora-violet) 18%, transparent) 50%, transparent 70%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          left: -30,
          bottom: -30,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-aurora-indigo) 32%, transparent), transparent 70%)",
        }}
      />

      <div className="relative flex justify-between items-center mb-2">
        <div
          className="text-[9px] tracking-[0.22em] uppercase font-medium"
          style={{ color: "color-mix(in srgb, var(--color-aurora-violet) 60%, white)" }}
        >
          Диагноз дня · {caseDate}
        </div>
        {active && (
          <div
            className="flex items-center gap-1.5 text-[8px] tracking-[0.15em] uppercase font-medium"
            style={{ color: "color-mix(in srgb, var(--color-aurora-pink) 60%, white)" }}
          >
            <span
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "var(--color-aurora-pink)",
                boxShadow: "0 0 8px var(--color-aurora-pink)",
              }}
            />
            Активно
          </div>
        )}
      </div>

      <div className="relative text-base font-normal tracking-tight">
        {caseId} ждёт тебя
      </div>
      <div className="relative text-[10px] text-white/65 mt-0.5">
        Клинический случай на {formatNumber(maxPoints)} очков
      </div>

      <div className="relative flex justify-between items-center mt-3.5">
        <div className="flex-1 mr-3">
          <div
            className="h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${fillPercent}%`,
                background:
                  "linear-gradient(90deg, var(--color-aurora-violet), var(--color-aurora-pink))",
              }}
            />
          </div>
          <div className="text-[9px] text-white/55 mt-1">
            {formatNumber(currentPoints)} из {formatNumber(maxPoints)}
          </div>
        </div>
        <button
          onClick={onStart}
          aria-label="Начать диагноз дня"
          className="inline-flex items-center gap-1 bg-white text-foreground text-[9px] tracking-[0.18em] uppercase font-semibold px-3.5 py-2 rounded-full btn-press"
          style={{
            boxShadow:
              "0 4px 12px -2px color-mix(in srgb, var(--color-aurora-pink) 35%, transparent)",
          }}
        >
          Начать
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
