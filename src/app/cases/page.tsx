"use client";

import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import MagicCard from "@/components/ui/MagicCard";
import GradientRing from "@/components/ui/GradientRing";
import IconBadge from "@/components/ui/IconBadge";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const sampleTopics: Array<{ name: string; count: number; icon: JSX.Element }> = [
  {
    name: "Гастроэнтерология",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4" />
        <path d="M9 6h6" />
        <path d="M7 10c0-2 2-4 5-4s5 2 5 4v2c0 5-3 7-5 11-2-4-5-6-5-11v-2z" />
      </svg>
    ),
  },
  {
    name: "Кардиология",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.5-1.5 3-4 3-6.5A4.5 4.5 0 0 0 17.5 3c-1.7 0-3 1-5.5 3.5C9.5 4 8.2 3 6.5 3A4.5 4.5 0 0 0 2 7.5C2 10 3.5 12.5 5 14l7 7 7-7z" />
      </svg>
    ),
  },
  {
    name: "Пульмонология",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v9" />
        <path d="M5 12c0 5 3 9 7 9 4 0 7-4 7-9-3 0-7 1-7 4-0-3-4-4-7-4z" />
      </svg>
    ),
  },
  {
    name: "Эндокринология",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="6" r="3" />
        <path d="M9 9c-2 1-4 4-4 7" />
        <path d="M15 9c2 1 4 4 4 7" />
        <path d="M9 21l3-9 3 9" />
      </svg>
    ),
  },
  {
    name: "Нефрология",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4c-3 3-3 8 0 12 3 3 8 3 11 0" />
        <path d="M17 4c3 3 3 8 0 12" />
        <circle cx="12" cy="14" r="2" />
      </svg>
    ),
  },
  {
    name: "Гематология",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 C8 8 5 11 5 15 a7 7 0 0 0 14 0 c0-4-3-7-7-13z" />
      </svg>
    ),
  },
  {
    name: "Инфекционные болезни",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
      </svg>
    ),
  },
  {
    name: "Ревматология",
    count: 0,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M8 6h8M6 8v8M18 8v8M8 18h8" />
      </svg>
    ),
  },
];

export default function CasesPage() {
  const { activeSpecialty } = useSpecialty();
  const router = useRouter();
  const [tab, setTab] = useState<"topics" | "favorites">("topics");

  useEffect(() => {
    if (!activeSpecialty) router.push("/topics");
  }, [activeSpecialty, router]);

  if (!activeSpecialty) return null;

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        <div className="aurora-welcome-band" />

        <div className="px-6 pt-4 pb-2 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Ситуационные
          </p>
          <h1 className="text-3xl font-extralight aurora-text tracking-tight">
            Задачи
          </h1>
        </div>

        {/* Aurora-pill toggle */}
        <div className="flex justify-center mt-5 mb-5">
          <div
            className="inline-flex p-1 rounded-full aurora-hairline"
            style={{ background: "var(--color-card)" }}
          >
            <PillTab active={tab === "topics"} onClick={() => setTab("topics")}>
              По темам
            </PillTab>
            <PillTab active={tab === "favorites"} onClick={() => setTab("favorites")}>
              Избранное
            </PillTab>
          </div>
        </div>

        {tab === "topics" ? (
          <div className="px-6">
            {/* Aurora summary */}
            <div className="text-center mb-6">
              <span className="text-3xl font-extralight aurora-text tabular-nums">0</span>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium mt-1">
                задач изучено
              </p>
              <div className="w-full h-1.5 bg-border/70 rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
                <div
                  className="h-full rounded-full aurora-grad-bg"
                  style={{
                    width: "0%",
                    boxShadow: "0 0 10px color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)",
                  }}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {sampleTopics.map((topic) => (
                <div key={topic.name} className="opacity-65">
                  <MagicCard
                    className="rounded-2xl aurora-hairline"
                    gradientFrom="var(--color-aurora-indigo)"
                    gradientTo="var(--color-aurora-violet)"
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <IconBadge icon={topic.icon} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {topic.name}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">
                          {topic.count > 0 ? `${topic.count} задач` : "Скоро"}
                        </p>
                      </div>
                      {topic.count > 0 ? (
                        <GradientRing value={0} size={42} thickness={3} label={`${topic.count}`} />
                      ) : (
                        <span
                          className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            color: "var(--color-aurora-violet)",
                            background: "var(--aurora-violet-soft)",
                          }}
                        >
                          Скоро
                        </span>
                      )}
                    </div>
                  </MagicCard>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 text-center pt-12">
            <div className="text-5xl font-extralight aurora-text tracking-tight leading-none mb-3">
              0
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium">
              в избранном
            </p>
          </div>
        )}

        <div className="px-6 pt-8 pb-4 text-center">
          <p className="text-xs text-muted leading-relaxed max-w-[280px] mx-auto">
            Ситуационные задачи для аккредитации будут добавлены в ближайшее время
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function PillTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all"
      style={
        active
          ? {
              background: "var(--aurora-gradient-primary)",
              color: "#fff",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px -4px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent)",
            }
          : { color: "var(--color-muted)" }
      }
    >
      {children}
    </button>
  );
}
