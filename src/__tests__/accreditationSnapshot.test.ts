import { describe, it, expect } from "vitest";
import type { AccreditationProgress, TestQuestion } from "@/types/accreditation";
import { buildAccreditationSnapshot } from "@/lib/accreditationSnapshot";
import { snapshotToProfile } from "@/app/api/_lib/accreditation-snapshot";

const questions: TestQuestion[] = [
  { id: "q1", specialty: "Гастроэнтерология", blockNumber: 1, question: "Q1?", options: ["A", "B"], correctIndex: 0 },
  { id: "q2", specialty: "Гастроэнтерология", blockNumber: 1, question: "Q2?", options: ["A", "B"], correctIndex: 1 },
  { id: "q3", specialty: "Гастроэнтерология", blockNumber: 2, question: "Q3?", options: ["A", "B"], correctIndex: 0 },
];

describe("buildAccreditationSnapshot", () => {
  it("aggregates attempts and blockStats from questionStats", () => {
    const progress: AccreditationProgress = {
      specialty: "gastroenterologiya",
      blocks: [
        { blockNumber: 1, learned: 2, total: 2, mistakes: [] },
        { blockNumber: 2, learned: 0, total: 1, mistakes: ["q3"] },
      ],
      examResults: [
        { total: 80, correct: 60, percentage: 75, passed: true, duration: 600, timestamp: 1 },
      ],
      mistakes: ["q3"],
      favorites: [],
      questionStats: {
        q1: { attempts: 3, wrong: 1, lastSeen: 1, wasEverCorrect: true },
        q2: { attempts: 2, wrong: 0, lastSeen: 1, wasEverCorrect: true },
        q3: { attempts: 4, wrong: 3, lastSeen: 1, wasEverCorrect: false },
      },
      updatedAt: 0,
    };

    const s = buildAccreditationSnapshot(
      "gastroenterologiya",
      "Гастроэнтерология",
      progress,
      questions,
      2
    );

    expect(s.totalAttempts).toBe(9);
    expect(s.totalCorrect).toBe(5);
    expect(s.blocksCompleted).toBe(1);
    expect(s.blocksTotal).toBe(2);
    expect(s.weakQuestionIds).toEqual(["q3"]);
    expect(s.blockStats[1].attempted).toBe(5);
    expect(s.blockStats[1].correct).toBe(4);
    expect(s.blockStats[1].errorRate).toBeCloseTo(0.2, 3);
    expect(s.blockStats[2].errorRate).toBeCloseTo(0.75, 3);
    expect(s.recentExamResults[0].percentage).toBe(75);
  });

  it("handles empty progress without crashing", () => {
    const progress: AccreditationProgress = {
      specialty: "x",
      blocks: [],
      examResults: [],
      mistakes: [],
      favorites: [],
      questionStats: {},
      updatedAt: 0,
    };
    const s = buildAccreditationSnapshot("x", "X", progress, questions, 0);
    expect(s.totalAttempts).toBe(0);
    expect(s.blocksCompleted).toBe(0);
  });
});

describe("snapshotToProfile", () => {
  it("maps snapshot into a UserLearningProfile with mode=accreditation", () => {
    const snapshot = {
      specialty: "Гастроэнтерология",
      specialtyId: "gastroenterologiya",
      weakQuestionIds: ["q3"],
      totalAttempts: 9,
      totalCorrect: 5,
      blockStats: {
        1: { attempted: 5, correct: 4, errorRate: 0.2 },
        2: { attempted: 4, correct: 1, errorRate: 0.75 },
      },
      recentExamResults: [
        { total: 80, correct: 60, percentage: 75, timestamp: 1 },
      ],
      blocksCompleted: 1,
      blocksTotal: 2,
      recentWrongTopics: ["Блок 2"],
    };

    const profile = snapshotToProfile(snapshot, "accred_basic");

    expect(profile.mode).toBe("accreditation");
    expect(profile.specialty).toBe("Гастроэнтерология");
    expect(profile.totalAttempts).toBe(9);
    expect(profile.overallAccuracy).toBeCloseTo(5 / 9, 3);
    expect(profile.accreditationProgress?.blocksCompleted).toBe(1);
    expect(profile.accreditationProgress?.averageScore).toBe(75);
    const weakBlocks = profile.accreditationProgress?.weakBlocks ?? [];
    expect(weakBlocks[0].blockNumber).toBe(2);
    expect(weakBlocks[0].errorRate).toBeCloseTo(0.75, 3);
  });
});
