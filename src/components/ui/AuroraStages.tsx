"use client";

interface AuroraStagesProps {
  stages: string[];
  currentIndex: number;
  className?: string;
}

/**
 * Визуальная прогрессия этапов для /daily-case. Точки + линии
 * + подписи. Aurora-gradient заливки для пройденных/активного,
 * outlined для будущих.
 */
export default function AuroraStages({ stages, currentIndex, className = "" }: AuroraStagesProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center">
        {stages.map((label, i) => {
          const state: "past" | "active" | "future" =
            i < currentIndex ? "past" : i === currentIndex ? "active" : "future";
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none min-w-0">
              <div className="flex flex-col items-center min-w-0 max-w-full">
                <div className={`aurora-stage-dot aurora-stage-dot--${state}`} />
                <div
                  className={`aurora-stage-label aurora-stage-label--${state} max-w-full truncate`}
                  title={label}
                >
                  {label.toUpperCase()}
                </div>
              </div>
              {i < stages.length - 1 && (
                <div
                  className={`aurora-stage-line aurora-stage-line--${i < currentIndex ? "past" : "future"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
