import type { LevelDef, RankDef } from "@/types/gamification";

// Уровни: только XP, без привязки к должности
export const levels: LevelDef[] = [
  { level: 1, xpRequired: 0, color: "muted" },
  { level: 2, xpRequired: 200, color: "primary" },
  { level: 3, xpRequired: 500, color: "primary" },
  { level: 4, xpRequired: 1000, color: "success" },
  { level: 5, xpRequired: 2000, color: "success" },
  { level: 6, xpRequired: 4000, color: "warning" },
  { level: 7, xpRequired: 7000, color: "warning" },
  { level: 8, xpRequired: 12000, color: "danger" },
  { level: 9, xpRequired: 20000, color: "danger" },
  { level: 10, xpRequired: 35000, color: "purple" },
];

// Звания: динамические, зависят от точности ответов
// Мало ошибок = высокое звание, много ошибок = низкое
const MIN_CARDS_FOR_RANK = 10;

export const ranks: RankDef[] = [
  { id: "student",      title: "Студент",        minAccuracy: 0,  minCards: 0,  color: "muted" },
  { id: "intern",       title: "Ординатор",      minAccuracy: 40, minCards: MIN_CARDS_FOR_RANK, color: "primary" },
  { id: "doctor",       title: "Врач",           minAccuracy: 55, minCards: MIN_CARDS_FOR_RANK, color: "primary" },
  { id: "specialist",   title: "Специалист",     minAccuracy: 68, minCards: MIN_CARDS_FOR_RANK, color: "success" },
  { id: "expert",       title: "Эксперт",        minAccuracy: 78, minCards: MIN_CARDS_FOR_RANK, color: "success" },
  { id: "candidate",    title: "Кандидат наук",  minAccuracy: 85, minCards: 30, color: "warning" },
  { id: "doctor_sci",   title: "Доктор наук",    minAccuracy: 90, minCards: 50, color: "warning" },
  { id: "professor",    title: "Профессор",      minAccuracy: 94, minCards: 80, color: "danger" },
  { id: "academician",  title: "Академик",       minAccuracy: 97, minCards: 100, color: "purple" },
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

export function getRankForAccuracy(recentAnswers: boolean[]): RankDef {
  const total = recentAnswers.length;
  if (total === 0) return ranks[0];
  const correct = recentAnswers.filter(Boolean).length;
  const accuracy = (correct / total) * 100;
  let best = ranks[0];
  for (const rank of ranks) {
    if (accuracy >= rank.minAccuracy && total >= rank.minCards) {
      best = rank;
    }
  }
  return best;
}

export function getNextRank(recentAnswers: boolean[]): RankDef | null {
  const current = getRankForAccuracy(recentAnswers);
  const idx = ranks.indexOf(current);
  return idx < ranks.length - 1 ? ranks[idx + 1] : null;
}
