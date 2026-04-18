"use client";

import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";

const stationTypes = [
  { name: "Сбор жалоб и анамнеза", count: 0 },
  { name: "Физикальное обследование", count: 0 },
  { name: "Интерпретация результатов", count: 0 },
  { name: "Постановка диагноза", count: 0 },
  { name: "Назначение лечения", count: 0 },
  { name: "Экстренная помощь", count: 0 },
];

export default function StationsPage() {
  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-24 pb-16 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-1" style={{ color: "var(--color-aurora-violet)" }}>
            Подготовка
          </p>
          <h1 className="text-2xl font-extralight text-foreground tracking-tight mb-6">
            Станции аккредитации
          </h1>

          <div className="flex flex-col gap-3">
            {stationTypes.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {s.count > 0 ? `${s.count} сценариев` : "Скоро"}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted/60 font-semibold">
                  {s.count > 0 ? "" : "Скоро"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
