/**
 * Client-supplied snapshot of accreditation progress (from localStorage
 * on the client) mapped to the server's UserLearningProfile shape.
 *
 * Accreditation progress is not yet persisted to Supabase — it lives in
 * `useAccreditation` localStorage. For the AI assistant to know weak blocks
 * when the user is on /tests/* or /modes/exam, the client sends this
 * snapshot in the chat request body.
 */

import type { UserLearningProfile } from "./prompts/user-context";
import type { SubscriptionTier } from "@/types/medmind";

export interface AccreditationSnapshot {
  specialty: string;
  specialtyId: string;
  /** IDs of questions the user answered wrong at least once (progress.mistakes) */
  weakQuestionIds: string[];
  totalAttempts: number;
  totalCorrect: number;
  /** { blockNumber: { attempted, correct } } aggregated from questionStats */
  blockStats: Record<number, { attempted: number; correct: number; errorRate: number }>;
  /** last 3 ExamResult entries */
  recentExamResults: { total: number; correct: number; percentage: number; timestamp: number }[];
  blocksCompleted: number;
  blocksTotal: number;
  /** Topics of recent wrong questions, if resolvable client-side */
  recentWrongTopics?: string[];
}

export function snapshotToProfile(
  snapshot: AccreditationSnapshot,
  tier: SubscriptionTier
): UserLearningProfile {
  const totalAttempts = snapshot.totalAttempts;
  const overallAccuracy = totalAttempts > 0 ? snapshot.totalCorrect / totalAttempts : 0;

  const weakBlocks = Object.entries(snapshot.blockStats)
    .map(([n, s]) => ({ blockNumber: Number(n), errorRate: s.errorRate }))
    .filter((b) => b.errorRate > 0.3)
    .sort((a, b) => b.errorRate - a.errorRate);

  const avgScore =
    snapshot.recentExamResults.length > 0
      ? snapshot.recentExamResults.reduce((s, r) => s + r.percentage, 0) /
        snapshot.recentExamResults.length
      : overallAccuracy * 100;

  // We don't have per-topic data from the client snapshot (it's per-question),
  // so we approximate weakTopics from recentWrongTopics and leave strongTopics empty.
  const topicCounts = new Map<string, number>();
  for (const t of snapshot.recentWrongTopics ?? []) {
    topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  }
  const weakTopics = [...topicCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic, count]) => ({
      topic,
      errorRate: Math.min(1, count / Math.max(1, snapshot.weakQuestionIds.length)),
      specialty: snapshot.specialty,
    }));

  return {
    specialty: snapshot.specialty,
    mode: "accreditation",
    weakTopics,
    strongTopics: [],
    recentErrors: (snapshot.recentWrongTopics ?? []).slice(0, 5).map((t) => ({
      topic: t,
      cardType: "accreditation_question",
      question: "",
    })),
    totalAttempts,
    overallAccuracy,
    currentStreak: 0,
    tier,
    accreditationProgress: {
      specialtyId: snapshot.specialtyId,
      blocksCompleted: snapshot.blocksCompleted,
      blocksTotal: snapshot.blocksTotal,
      averageScore: avgScore,
      weakBlocks,
    },
  };
}
