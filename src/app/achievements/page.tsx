"use client";

import { useGamification } from "@/hooks/useGamification";
import AchievementCard from "@/components/ui/AchievementCard";
import LevelBadge from "@/components/ui/LevelBadge";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";

const categoryLabels: Record<string, string> = {
  streak: "Регулярность",
  volume: "Объём",
  accuracy: "Точность",
  mastery: "Мастерство",
  speed: "Скорость",
  exploration: "Исследование",
};

export default function AchievementsPage() {
  const { progress, achievements, currentLevel } = useGamification();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const grouped = achievements.reduce(
    (acc, a) => {
      const cat = a.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    },
    {} as Record<string, typeof achievements>
  );

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-3xl font-extralight text-foreground">
              {unlockedCount}
              <span className="text-muted">/{achievements.length}</span>
            </p>
            <p className="text-xs uppercase tracking-widest text-muted mt-1">
              Достижений
            </p>
          </div>
          <LevelBadge xp={progress.xp || 0} />
        </div>

        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-xs uppercase tracking-widest text-muted mb-3">
                {categoryLabels[category] || category}
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {items.map((a) => (
                  <AchievementCard
                    key={a.id}
                    achievement={a}
                    unlocked={a.unlocked}
                    unlockedAt={a.unlockedAt}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
