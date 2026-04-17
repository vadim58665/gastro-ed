/**
 * Serializes user learning profile into a compact prompt block.
 */

import type { SubscriptionTier } from "@/types/medmind";
import type { DifficultyLevel } from "@/types/card";

export type ProfileMode = "feed" | "accreditation";

export interface UserLearningProfile {
  specialty: string;
  /** Which channel this profile was built from: feed cards or accreditation questions */
  mode?: ProfileMode;
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
    weakBlocks?: { blockNumber: number; errorRate: number }[];
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

  // Explicit channel header so the model doesn't mix up feed stats with accreditation stats.
  if (profile.mode === "accreditation") {
    lines.push(
      "Пользователь сейчас в режиме ПОДГОТОВКИ К АККРЕДИТАЦИИ. Слабые/сильные темы ниже относятся к вопросам аккредитации, а не к карточкам ленты."
    );
  } else if (profile.mode === "feed") {
    lines.push(
      "Пользователь сейчас в режиме ЛЕНТЫ КАРТОЧЕК. Статистика ниже — только по карточкам ленты, не по аккредитационным тестам."
    );
  }

  lines.push(`Специальность: ${profile.specialty}`);

  if (profile.preferredDifficulty) {
    lines.push(`Уровень: ${DIFFICULTY_LABELS[profile.preferredDifficulty] ?? profile.preferredDifficulty}`);
  }

  const pct = Math.round(profile.overallAccuracy * 100);
  const scope = profile.mode === "accreditation" ? "по вопросам аккредитации" : "по карточкам";
  lines.push(`Точность ${scope}: ${pct}% (${profile.totalAttempts} ответов)`);

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
    if (ap.weakBlocks && ap.weakBlocks.length > 0) {
      const wb = ap.weakBlocks
        .slice(0, 3)
        .map((b) => `блок ${b.blockNumber} (${Math.round(b.errorRate * 100)}% ошибок)`)
        .join(", ");
      lines.push(`Слабые блоки: ${wb}`);
    }
  }

  lines.push("</user_profile>");
  return lines.join("\n");
}
