/**
 * Serializes user learning profile into a compact prompt block.
 */

import type { SubscriptionTier } from "@/types/medmind";
import type { DifficultyLevel } from "@/types/card";

export interface UserLearningProfile {
  specialty: string;
  accreditationCategory?: string;
  weakTopics: { topic: string; errorRate: number; specialty: string }[];
  strongTopics: { topic: string; masteryScore: number }[];
  recentErrors: { topic: string; cardType: string; question: string }[];
  totalAttempts: number;
  overallAccuracy: number;
  currentStreak: number;
  tier: SubscriptionTier;
  preferredDifficulty?: DifficultyLevel;
  accreditationProgress?: {
    specialtyId: string;
    blocksCompleted: number;
    blocksTotal: number;
    averageScore: number;
  };
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Студент",
  2: "Ординатор",
  3: "Врач",
  4: "Профессор",
  5: "Академик",
};

export function serializeUserContext(profile: UserLearningProfile): string {
  const lines: string[] = ["<user_profile>"];

  lines.push(`Специальность: ${profile.specialty}`);

  if (profile.preferredDifficulty) {
    lines.push(`Уровень: ${DIFFICULTY_LABELS[profile.preferredDifficulty] ?? profile.preferredDifficulty}`);
  }

  const pct = Math.round(profile.overallAccuracy * 100);
  lines.push(`Точность: ${pct}% (${profile.totalAttempts} ответов)`);

  if (profile.weakTopics.length > 0) {
    const weak = profile.weakTopics
      .slice(0, 5)
      .map((t) => `${t.topic} (${Math.round(t.errorRate * 100)}% ошибок)`)
      .join(", ");
    lines.push(`Слабые темы: ${weak}`);
  }

  if (profile.strongTopics.length > 0) {
    const strong = profile.strongTopics
      .slice(0, 3)
      .map((t) => `${t.topic} (${Math.round(t.masteryScore * 100)}%)`)
      .join(", ");
    lines.push(`Сильные темы: ${strong}`);
  }

  if (profile.recentErrors.length > 0) {
    const errors = profile.recentErrors
      .slice(0, 5)
      .map((e) => `${e.topic} (${e.cardType})`)
      .join(", ");
    lines.push(`Последние ошибки: ${errors}`);
  }

  if (profile.currentStreak > 0) {
    lines.push(`Серия: ${profile.currentStreak} дней`);
  }

  if (profile.accreditationProgress) {
    const ap = profile.accreditationProgress;
    lines.push(
      `Аккредитация: ${ap.blocksCompleted}/${ap.blocksTotal} блоков, средний балл ${Math.round(ap.averageScore)}%`
    );
  }

  lines.push("</user_profile>");
  return lines.join("\n");
}
