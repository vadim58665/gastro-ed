import { describe, it, expect } from "vitest";
import type { AccreditationProgress, TestQuestion } from "@/types/accreditation";
import {
  computeErrorSummary,
  computeErrorsByBlock,
  computeFrequentErrors,
  computeRepeatErrors,
  computeErrorCategories,
} from "@/lib/accreditationErrors";

const emptyProgress: AccreditationProgress = {
  specialty: "gastroenterologiya",
  blocks: [],
  examResults: [],
  mistakes: [],
  favorites: [],
  questionStats: {},
  updatedAt: 0,
};

const questions: TestQuestion[] = [
  { id: "q1", specialty: "gastroenterologiya", blockNumber: 1, question: "Вопрос 1?", options: ["A", "B"], correctIndex: 0 },
  { id: "q2", specialty: "gastroenterologiya", blockNumber: 1, question: "Вопрос 2?", options: ["A", "B"], correctIndex: 1 },
  { id: "q3", specialty: "gastroenterologiya", blockNumber: 2, question: "Вопрос 3?", options: ["A", "B"], correctIndex: 0 },
  { id: "q4", specialty: "gastroenterologiya", blockNumber: 2, question: "Вопрос 4?", options: ["A", "B"], correctIndex: 1 },
  { id: "q5", specialty: "gastroenterologiya", blockNumber: 3, question: "Вопрос 5?", options: ["A", "B"], correctIndex: 0 },
];

describe("computeErrorSummary", () => {
  it("returns zeroes for empty progress", () => {
    const result = computeErrorSummary(emptyProgress, questions);
    expect(result.totalErrors).toBe(0);
    expect(result.totalAnswered).toBe(0);
    expect(result.errorRate).toBe(0);
  });

  it("counts errors from questionStats", () => {
    const progress: AccreditationProgress = {
      ...emptyProgress,
      questionStats: {
        q1: { attempts: 5, wrong: 2, lastSeen: 1, wasEverCorrect: true },
        q2: { attempts: 3, wrong: 0, lastSeen: 1, wasEverCorrect: true },
        q3: { attempts: 4, wrong: 3, lastSeen: 1, wasEverCorrect: false },
      },
    };
    const result = computeErrorSummary(progress, questions);
    expect(result.totalErrors).toBe(5);
    expect(result.totalAnswered).toBe(12);
    expect(result.uniqueErrorQuestions).toBe(2);
    expect(result.errorRate).toBeCloseTo(5 / 12);
  });

  it("falls back to mistakes[] when no questionStats", () => {
    const progress: AccreditationProgress = {
      ...emptyProgress,
      mistakes: ["q1", "q3"],
      questionStats: {},
    };
    const result = computeErrorSummary(progress, questions);
    expect(result.totalErrors).toBe(2);
    expect(result.uniqueErrorQuestions).toBe(2);
  });
});

describe("computeErrorsByBlock", () => {
  it("groups errors by block number", () => {
    const progress: AccreditationProgress = {
      ...emptyProgress,
      mistakes: ["q1", "q3"],
      questionStats: {
        q1: { attempts: 3, wrong: 2, lastSeen: 1, wasEverCorrect: false },
        q3: { attempts: 2, wrong: 1, lastSeen: 1, wasEverCorrect: false },
      },
    };
    const result = computeErrorsByBlock(progress, questions);
    expect(result).toHaveLength(3);

    const block1 = result.find((b) => b.blockNumber === 1)!;
    expect(block1.totalInBlock).toBe(2);
    expect(block1.errorCount).toBe(2);

    const block2 = result.find((b) => b.blockNumber === 2)!;
    expect(block2.errorCount).toBe(1);

    const block3 = result.find((b) => b.blockNumber === 3)!;
    expect(block3.errorCount).toBe(0);
  });
});

describe("computeFrequentErrors", () => {
  it("returns top N errors sorted by wrong count", () => {
    const progress: AccreditationProgress = {
      ...emptyProgress,
      mistakes: ["q1", "q2", "q3"],
      questionStats: {
        q1: { attempts: 10, wrong: 7, lastSeen: 1, wasEverCorrect: true },
        q2: { attempts: 5, wrong: 2, lastSeen: 1, wasEverCorrect: false },
        q3: { attempts: 8, wrong: 5, lastSeen: 1, wasEverCorrect: false },
      },
    };
    const result = computeFrequentErrors(progress, questions, 2);
    expect(result).toHaveLength(2);
    expect(result[0].questionId).toBe("q1");
    expect(result[0].wrongCount).toBe(7);
    expect(result[1].questionId).toBe("q3");
  });

  it("returns empty for no questionStats", () => {
    expect(computeFrequentErrors(emptyProgress, questions)).toEqual([]);
  });
});

describe("computeRepeatErrors", () => {
  it("finds questions that were correct then wrong again", () => {
    const progress: AccreditationProgress = {
      ...emptyProgress,
      mistakes: ["q1", "q3"],
      questionStats: {
        q1: { attempts: 5, wrong: 2, lastSeen: 1, wasEverCorrect: true },
        q2: { attempts: 3, wrong: 1, lastSeen: 1, wasEverCorrect: true },
        q3: { attempts: 4, wrong: 3, lastSeen: 1, wasEverCorrect: false },
      },
    };
    const result = computeRepeatErrors(progress, questions);
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe("q1");
    expect(result[0].isRepeat).toBe(true);
  });
});

describe("computeErrorCategories", () => {
  it("groups by error frequency buckets", () => {
    const progress: AccreditationProgress = {
      ...emptyProgress,
      questionStats: {
        q1: { attempts: 5, wrong: 1, lastSeen: 1, wasEverCorrect: true },
        q2: { attempts: 5, wrong: 2, lastSeen: 1, wasEverCorrect: true },
        q3: { attempts: 5, wrong: 4, lastSeen: 1, wasEverCorrect: false },
        q4: { attempts: 5, wrong: 0, lastSeen: 1, wasEverCorrect: true },
      },
    };
    const result = computeErrorCategories(progress);
    expect(result).toHaveLength(3);

    const oneErr = result.find((c) => c.label === "1 ошибка")!;
    expect(oneErr.count).toBe(1);

    const twoErr = result.find((c) => c.label === "2 ошибки")!;
    expect(twoErr.count).toBe(1);

    const threeErr = result.find((c) => c.label === "3+ ошибок")!;
    expect(threeErr.count).toBe(1);
  });

  it("returns empty for no stats", () => {
    expect(computeErrorCategories(emptyProgress)).toEqual([]);
  });
});
