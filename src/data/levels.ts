import type { LevelDef } from "@/types/gamification";

export const levels: LevelDef[] = [
  { level: 1, title: "Студент", xpRequired: 0, color: "muted" },
  { level: 2, title: "Ординатор I года", xpRequired: 200, color: "primary" },
  { level: 3, title: "Ординатор II года", xpRequired: 500, color: "primary" },
  { level: 4, title: "Врач", xpRequired: 1000, color: "success" },
  { level: 5, title: "Специалист", xpRequired: 2000, color: "success" },
  { level: 6, title: "Ст. специалист", xpRequired: 4000, color: "warning" },
  { level: 7, title: "Эксперт", xpRequired: 7000, color: "warning" },
  { level: 8, title: "Кандидат наук", xpRequired: 12000, color: "danger" },
  { level: 9, title: "Доктор наук", xpRequired: 20000, color: "danger" },
  { level: 10, title: "Академик", xpRequired: 35000, color: "purple" },
];

export function getLevelForXp(xp: number): LevelDef {
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xpRequired) return levels[i];
  }
  return levels[0];
}

export function getXpToNextLevel(xp: number): { current: number; needed: number } | null {
  const currentLevel = getLevelForXp(xp);
  const nextLevel = levels.find((l) => l.level === currentLevel.level + 1);
  if (!nextLevel) return null;
  return {
    current: xp - currentLevel.xpRequired,
    needed: nextLevel.xpRequired - currentLevel.xpRequired,
  };
}
