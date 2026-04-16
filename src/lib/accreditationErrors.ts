import type { AccreditationProgress, TestQuestion, QuestionStats } from "@/types/accreditation";

export interface ErrorSummary {
  totalErrors: number;
  totalAnswered: number;
  errorRate: number;
  uniqueErrorQuestions: number;
}

export interface BlockErrorSummary {
  blockNumber: number;
  totalInBlock: number;
  errorCount: number;
  errorRate: number;
}

export interface FrequentError {
  questionId: string;
  question: string;
  blockNumber: number;
  wrongCount: number;
  totalAttempts: number;
  isRepeat: boolean;
}

export interface ErrorCategorySummary {
  label: string;
  count: number;
  percentage: number;
}

export function computeErrorSummary(
  progress: AccreditationProgress,
  questions: TestQuestion[]
): ErrorSummary {
  const stats = progress.questionStats ?? {};
  const hasStats = Object.keys(stats).length > 0;

  if (!hasStats) {
    const totalErrors = progress.mistakes.length;
    return {
      totalErrors,
      totalAnswered: 0,
      errorRate: 0,
      uniqueErrorQuestions: totalErrors,
    };
  }

  let totalErrors = 0;
  let totalAnswered = 0;
  let uniqueErrorQuestions = 0;

  for (const s of Object.values(stats)) {
    totalAnswered += s.attempts;
    totalErrors += s.wrong;
    if (s.wrong > 0) uniqueErrorQuestions++;
  }

  return {
    totalErrors,
    totalAnswered,
    errorRate: totalAnswered > 0 ? totalErrors / totalAnswered : 0,
    uniqueErrorQuestions,
  };
}

export function computeErrorsByBlock(
  progress: AccreditationProgress,
  questions: TestQuestion[]
): BlockErrorSummary[] {
  const mistakeSet = new Set(progress.mistakes);
  const stats = progress.questionStats ?? {};

  const byBlock = new Map<number, { total: number; errors: number }>();
  for (const q of questions) {
    const entry = byBlock.get(q.blockNumber) ?? { total: 0, errors: 0 };
    entry.total++;

    const qs = stats[q.id];
    if (qs && qs.wrong > 0) {
      entry.errors += qs.wrong;
    } else if (mistakeSet.has(q.id)) {
      entry.errors++;
    }

    byBlock.set(q.blockNumber, entry);
  }

  return Array.from(byBlock.entries())
    .map(([blockNumber, { total, errors }]) => ({
      blockNumber,
      totalInBlock: total,
      errorCount: errors,
      errorRate: total > 0 ? errors / total : 0,
    }))
    .sort((a, b) => a.blockNumber - b.blockNumber);
}

export function computeFrequentErrors(
  progress: AccreditationProgress,
  questions: TestQuestion[],
  limit = 5
): FrequentError[] {
  const stats = progress.questionStats ?? {};
  if (Object.keys(stats).length === 0) return [];

  const qMap = new Map(questions.map((q) => [q.id, q]));
  const errors: FrequentError[] = [];

  for (const [qId, s] of Object.entries(stats)) {
    if (s.wrong === 0) continue;
    const q = qMap.get(qId);
    if (!q) continue;
    errors.push({
      questionId: qId,
      question: q.question,
      blockNumber: q.blockNumber,
      wrongCount: s.wrong,
      totalAttempts: s.attempts,
      isRepeat: s.wasEverCorrect && progress.mistakes.includes(qId),
    });
  }

  errors.sort((a, b) => b.wrongCount - a.wrongCount);
  return limit > 0 ? errors.slice(0, limit) : errors;
}

export function computeRepeatErrors(
  progress: AccreditationProgress,
  questions: TestQuestion[]
): FrequentError[] {
  const stats = progress.questionStats ?? {};
  if (Object.keys(stats).length === 0) return [];

  const qMap = new Map(questions.map((q) => [q.id, q]));
  const repeats: FrequentError[] = [];

  for (const [qId, s] of Object.entries(stats)) {
    if (!s.wasEverCorrect || !progress.mistakes.includes(qId)) continue;
    const q = qMap.get(qId);
    if (!q) continue;
    repeats.push({
      questionId: qId,
      question: q.question,
      blockNumber: q.blockNumber,
      wrongCount: s.wrong,
      totalAttempts: s.attempts,
      isRepeat: true,
    });
  }

  return repeats.sort((a, b) => b.wrongCount - a.wrongCount);
}

export type BlockReadinessLevel = "not_started" | "started" | "weak" | "ready" | "strong";

export interface BlockReadiness {
  blockNumber: number;
  totalInBlock: number;
  learned: number;
  answered: number;
  correct: number;
  accuracy: number;
  coverage: number;
  errorCount: number;
  level: BlockReadinessLevel;
}

export function computeBlockReadiness(
  progress: AccreditationProgress,
  questions: TestQuestion[]
): BlockReadiness[] {
  const stats = progress.questionStats ?? {};
  const blockProgress = new Map(
    progress.blocks.map((b) => [b.blockNumber, b])
  );

  const byBlock = new Map<number, { total: number; answered: number; correct: number; errors: number }>();

  for (const q of questions) {
    const entry = byBlock.get(q.blockNumber) ?? { total: 0, answered: 0, correct: 0, errors: 0 };
    entry.total++;
    const qs = stats[q.id];
    if (qs) {
      entry.answered += qs.attempts;
      entry.correct += qs.attempts - qs.wrong;
      entry.errors += qs.wrong;
    }
    byBlock.set(q.blockNumber, entry);
  }

  return Array.from(byBlock.entries())
    .map(([blockNumber, data]) => {
      const bp = blockProgress.get(blockNumber);
      const learned = bp?.learned ?? 0;
      const accuracy = data.answered > 0 ? data.correct / data.answered : 0;
      const coverage = data.total > 0 ? learned / data.total : 0;

      let level: BlockReadinessLevel;
      if (data.answered === 0) level = "not_started";
      else if (coverage < 0.2) level = "started";
      else if (accuracy < 0.6) level = "weak";
      else if (accuracy >= 0.85 && coverage >= 0.8) level = "strong";
      else level = "ready";

      return {
        blockNumber,
        totalInBlock: data.total,
        learned,
        answered: data.answered,
        correct: data.correct,
        accuracy,
        coverage,
        errorCount: data.errors,
        level,
      };
    })
    .sort((a, b) => a.blockNumber - b.blockNumber);
}

export function computeErrorCategories(
  progress: AccreditationProgress
): ErrorCategorySummary[] {
  const stats = progress.questionStats ?? {};
  if (Object.keys(stats).length === 0) return [];

  let one = 0;
  let two = 0;
  let three = 0;

  for (const s of Object.values(stats)) {
    if (s.wrong === 0) continue;
    if (s.wrong === 1) one++;
    else if (s.wrong === 2) two++;
    else three++;
  }

  const total = one + two + three;
  if (total === 0) return [];

  const result: ErrorCategorySummary[] = [];
  if (one > 0) result.push({ label: "1 ошибка", count: one, percentage: Math.round((one / total) * 100) });
  if (two > 0) result.push({ label: "2 ошибки", count: two, percentage: Math.round((two / total) * 100) });
  if (three > 0) result.push({ label: "3+ ошибок", count: three, percentage: Math.round((three / total) * 100) });
  return result;
}
