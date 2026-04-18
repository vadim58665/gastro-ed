"use client";

import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const sampleTopics = [
  { name: "Гастроэнтерология", count: 0 },
  { name: "Кардиология", count: 0 },
  { name: "Пульмонология", count: 0 },
  { name: "Эндокринология", count: 0 },
  { name: "Нефрология", count: 0 },
  { name: "Гематология", count: 0 },
  { name: "Инфекционные болезни", count: 0 },
  { name: "Ревматология", count: 0 },
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
        <div className="px-6 pt-4 pb-4 text-center">
          <p className="text-xs uppercase tracking-[0.25em] font-medium mb-3" style={{ color: "var(--color-aurora-violet)" }}>
            Ситуационные
          </p>
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Задачи
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-surface rounded-xl p-0.5">
            <button
              onClick={() => setTab("topics")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                tab === "topics"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              По темам
            </button>
            <button
              onClick={() => setTab("favorites")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                tab === "favorites"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Избранное
            </button>
          </div>
        </div>

        {tab === "topics" ? (
          <div className="px-6">
            <div className="text-center mb-6">
              <p className="text-xs text-muted">
                Изучено 0 из 0 задач
              </p>
              <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-2 max-w-xs mx-auto">
                <div className="h-full bg-primary rounded-full" style={{ width: "0%" }} />
              </div>
            </div>

            <div className="space-y-2">
              {sampleTopics.map((topic, i) => (
                <div
                  key={topic.name}
                  className="bg-card rounded-2xl border border-border px-5 py-4 flex items-center justify-between opacity-50"
                >
                  <div>
                    <span className="text-base font-light text-foreground">
                      {topic.name}
                    </span>
                    <p className="text-[10px] text-muted mt-0.5">
                      Всего задач {topic.count}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center">
                    <span className="text-sm font-light text-muted">
                      {topic.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 text-center pt-12">
            <div className="text-5xl font-extralight text-foreground tracking-tight leading-none mb-3">
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
