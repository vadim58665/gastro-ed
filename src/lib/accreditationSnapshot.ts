/**
 * Build a compact AccreditationSnapshot on the client from localStorage-backed
 * useAccreditation progress, for sending to /api/medmind/chat. The API maps
 * it to a UserLearningProfile with mode: "accreditation" so the assistant
 * talks about the right channel's weak blocks / exam results.
 */

import type {
  AccreditationProgress,
  TestQuestion,
} from "@/types/accreditation";

export interface AccreditationSnapshot {
  specialty: string;
  specialtyId: string;
  weakQuestionIds: string[];
  totalAttempts: number;
  totalCorrect: number;
  blockStats: Record<number, { attempted: number; correct: number; errorRate: number }>;
  recentExamResults: { total: number; correct: number; percentage: number; timestamp: number }[];
  blocksCompleted: number;
  blocksTotal: number;
  recentWrongTopics?: string[];
}

export function buildAccreditationSnapshot(
  specialtyId: string,
  specialtyName: string,
  progress: AccreditationProgress,
  allQuestions: TestQuestion[],
  blocksTotal: number
): AccreditationSnapshot {
  const questionById = new Map(allQuestions.map((q) => [q.id, q]));

  let totalAttempts = 0;
  let totalCorrect = 0;
  const blockStats: Record<
    number,
    { attempted: number; correct: number; errorRate: number }
  > = {};

  for (const [qid, stats] of Object.entries(progress.questionStats ?? {})) {
    const q = questionById.get(qid);
    if (!q) continue;
    totalAttempts += stats.attempts;
    totalCorrect += stats.attempts - stats.wrong;
    const b = blockStats[q.blockNumber] ?? { attempted: 0, correct: 0, errorRate: 0 };
    b.attempted += stats.attempts;
    b.correct += stats.attempts - stats.wrong;
    blockStats[q.blockNumber] = b;
  }
  for (const b of Object.values(blockStats)) {
    b.errorRate = b.attempted > 0 ? 1 - b.correct / b.attempted : 0;
  }

  const recentExamResults = [...progress.examResults]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3)
    .map((r) => ({
      total: r.total,
      correct: r.correct,
      percentage: r.percentage,
      timestamp: r.timestamp,
    }));

  const blocksCompleted = progress.blocks.filter((b) => b.learned >= b.total).length;

  // Topics aren't stored on TestQuestion directly — use specialty + block label.
  // If the app adds topic to questions later, plug it in here.
  const recentWrongTopics = Array.from(
    new Set(
      progress.mistakes
        .map((id) => questionById.get(id))
        .filter((q): q is TestQuestion => !!q)
        .map((q) => `Блок ${q.blockNumber}`)
    )
  ).slice(0, 5);

  return {
    specialty: specialtyName,
    specialtyId,
    weakQuestionIds: [...progress.mistakes],
    totalAttempts,
    totalCorrect,
    blockStats,
    recentExamResults,
    blocksCompleted,
    blocksTotal,
    recentWrongTopics,
  };
}
