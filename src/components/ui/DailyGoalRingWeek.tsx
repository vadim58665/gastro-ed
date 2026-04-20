"use client";

interface DailyGoalRingWeekProps {
  cardsToday: number;
  goal: number;
  streakCurrent: number;
  /** 7 значений (Пн..Вс). Активность за неделю — count ответов по дню недели. */
  weekActivity: number[];
}

const WEEK_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function DailyGoalRingWeek({
  cardsToday,
  goal,
  streakCurrent,
  weekActivity,
}: DailyGoalRingWeekProps) {
  const pct = Math.min(100, Math.round((cardsToday / Math.max(1, goal)) * 100));
  const todayIdx = (new Date().getDay() + 6) % 7;
  const maxW = Math.max(1, ...weekActivity);

  return (
    <div
      className="aurora-hairline relative rounded-3xl bg-card px-4 py-4 overflow-hidden"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(17,24,39,0.04), 0 18px 36px -18px color-mix(in srgb, var(--color-aurora-violet) 28%, transparent)",
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="relative rounded-full shrink-0"
          style={{
            width: 80,
            height: 80,
            padding: 5,
            background: `conic-gradient(from -90deg, var(--color-aurora-indigo) 0%, var(--color-aurora-violet) ${
              pct * 0.6
            }%, var(--color-aurora-pink) ${pct}%, var(--aurora-indigo-soft) ${pct}%)`,
          }}
        >
          <div className="w-full h-full rounded-full bg-card flex flex-col items-center justify-center">
            <div className="text-[22px] font-extralight leading-none tracking-tight text-foreground tabular-nums">
              {cardsToday}
            </div>
            <div className="text-[8px] tracking-[0.18em] uppercase text-muted font-medium -mt-0.5">
              из {goal}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <span
              className="text-[9px] tracking-[0.22em] uppercase font-medium"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              Сегодня
            </span>
            <span className="text-[9px] tracking-wide font-semibold text-foreground">
              {streakCurrent > 0 ? `${streakCurrent} дн. подряд` : "Начни серию"}
            </span>
          </div>
          <div className="mt-2 flex items-end gap-1 h-[34px]">
            {weekActivity.map((v, i) => {
              const h = Math.max(4, Math.round((v / maxW) * 30));
              const isToday = i === todayIdx;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${h}px`,
                      background: isToday
                        ? "linear-gradient(180deg, var(--color-aurora-indigo), var(--color-aurora-pink))"
                        : v > 0
                        ? "linear-gradient(180deg, color-mix(in srgb, var(--color-aurora-indigo) 55%, transparent), color-mix(in srgb, var(--color-aurora-violet) 28%, transparent))"
                        : "var(--aurora-indigo-soft)",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1">
            {WEEK_LABELS.map((d, i) => (
              <div
                key={d}
                className={`flex-1 text-center text-[8px] font-medium tracking-wide ${
                  i === todayIdx ? "text-foreground" : "text-muted"
                }`}
              >
                {d}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
