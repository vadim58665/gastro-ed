"use client";

import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import MagicCard from "@/components/ui/MagicCard";
import IconBadge from "@/components/ui/IconBadge";

const stationTypes: Array<{
  name: string;
  count: number;
  icon: JSX.Element;
}> = [
  {
    name: "Сбор жалоб и анамнеза",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    name: "Физикальное обследование",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v6a5 5 0 0 0 10 0V4" />
        <path d="M4 4h3" />
        <path d="M11 4h3" />
        <circle cx="19" cy="14" r="2" />
        <path d="M9 15v2a4 4 0 0 0 8 0v-1" />
      </svg>
    ),
  },
  {
    name: "Интерпретация результатов",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <polyline points="7 14 11 9 14 12 21 5" />
      </svg>
    ),
  },
  {
    name: "Постановка диагноза",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Назначение лечения",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="9" width="18" height="6" rx="3" />
        <path d="M12 9v6" />
      </svg>
    ),
  },
  {
    name: "Экстренная помощь",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 L4 14 h7 l-1 8 9-12 h-7 z" />
      </svg>
    ),
  },
];

export default function StationsPage() {
  const total = stationTypes.length;
  const available = stationTypes.filter((s) => s.count > 0).length;

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        <div className="aurora-welcome-band" />

        {/* Premium hero */}
        <div className="px-6 pt-6 pb-2 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Подготовка
          </p>
          <h1 className="text-3xl font-extralight aurora-text tracking-tight">
            Станции аккредитации
          </h1>
          <div className="w-10 h-px bg-border mx-auto mt-4" />
        </div>

        {/* Stats row */}
        <div className="px-6 pt-6 pb-6 flex items-baseline justify-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-extralight aurora-text tracking-tight leading-none tabular-nums">
              {total}
            </div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted mt-1.5 font-medium">
              типов
            </p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <div
              className="text-4xl font-extralight tracking-tight leading-none tabular-nums"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              {available}
            </div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted mt-1.5 font-medium">
              готово
            </p>
          </div>
        </div>

        {/* Stations grid */}
        <div className="px-6 pb-8">
          <div className="flex flex-col gap-3 max-w-lg mx-auto">
            {stationTypes.map((s) => {
              const disabled = s.count === 0;
              return (
                <div
                  key={s.name}
                  className={`btn-press ${disabled ? "opacity-60" : ""}`}
                >
                  <MagicCard
                    className="rounded-2xl aurora-hairline"
                    gradientFrom="var(--color-aurora-indigo)"
                    gradientTo="var(--color-aurora-violet)"
                    spotlightColor="color-mix(in srgb, var(--color-aurora-violet) 12%, transparent)"
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <IconBadge icon={s.icon} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">
                          {disabled ? "В разработке" : `${s.count} сценариев`}
                        </p>
                      </div>
                      {disabled ? (
                        <span
                          className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            color: "var(--color-aurora-violet)",
                            background: "var(--aurora-violet-soft)",
                          }}
                        >
                          Скоро
                        </span>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-muted shrink-0"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      )}
                    </div>
                  </MagicCard>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hint */}
        <div className="px-6 pb-2 text-center">
          <p className="text-[11px] text-muted leading-relaxed max-w-[280px] mx-auto">
            Станции практической аккредитации появятся в следующих обновлениях.
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
