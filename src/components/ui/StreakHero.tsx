"use client";

export interface WeekDay {
  label: string;
  /** 0 (нет активности) до 1 (максимум). null если день сегодня и ещё не закрыт. */
  activity: number;
  isToday: boolean;
}

interface StreakHeroProps {
  currentStreak: number;
  bestStreak: number;
  weekPattern: WeekDay[];
}

function pluralDay(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

export default function StreakHero({
  currentStreak,
  bestStreak,
  weekPattern,
}: StreakHeroProps) {
  return (
    <div
      className="aurora-hairline relative rounded-3xl bg-card px-4 pt-4 pb-3.5 overflow-hidden"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(17,24,39,0.04), 0 20px 40px -20px color-mix(in srgb, var(--color-aurora-indigo) 32%, transparent)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "70%",
          background:
            "radial-gradient(400px 180px at 70% 0%, color-mix(in srgb, var(--color-aurora-indigo) 14%, transparent), transparent 70%)",
        }}
      />

      <div
        className="relative text-[9px] tracking-[0.22em] uppercase font-medium"
        style={{ color: "var(--color-aurora-indigo)" }}
      >
        Твой streak
      </div>

      <div
        className="relative font-extralight leading-none mt-2 aurora-text"
        style={{
          fontSize: 54,
          letterSpacing: "-0.04em",
        }}
      >
        {currentStreak}
      </div>

      <div className="relative text-[10px] text-foreground/60 mt-1">
        {pluralDay(currentStreak)} подряд · не упусти
      </div>

      <div
        className="relative flex gap-0.5 mt-3 pt-2.5"
        style={{ borderTop: "1px solid var(--aurora-indigo-border)" }}
      >
        {weekPattern.map((d, i) => {
          const heightPx = Math.max(6, Math.round(d.activity * 22));
          const isDim = d.activity === 0 && !d.isToday;
          return (
            <div key={i} className="flex-1 text-center">
              <div
                className="w-full rounded-sm"
                style={{
                  height: d.isToday ? 22 : heightPx,
                  background: d.isToday
                    ? "transparent"
                    : isDim
                    ? "var(--aurora-indigo-soft)"
                    : "linear-gradient(180deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
                  boxShadow: d.isToday
                    ? "none"
                    : isDim
                    ? "none"
                    : "0 0 6px color-mix(in srgb, var(--color-aurora-indigo) 40%, transparent)",
                  border: d.isToday
                    ? "1.5px dashed color-mix(in srgb, var(--color-aurora-indigo) 60%, transparent)"
                    : "none",
                  marginTop: d.isToday ? 0 : 22 - heightPx,
                }}
              />
              <div
                className={`text-[7px] tracking-wide mt-1 font-medium ${
                  d.isToday ? "font-semibold" : ""
                }`}
                style={{
                  color: d.isToday
                    ? "var(--color-aurora-indigo)"
                    : "var(--color-muted)",
                }}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative mt-2.5 flex justify-between items-baseline text-[9px] tracking-wide text-muted">
        <span>Лучший</span>
        <span
          className="font-semibold tracking-[0.12em]"
          style={{ color: "var(--color-aurora-violet)" }}
        >
          {bestStreak} {pluralDay(bestStreak).toUpperCase()}
        </span>
      </div>
    </div>
  );
}
