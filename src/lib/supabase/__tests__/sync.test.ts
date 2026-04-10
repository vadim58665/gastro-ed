import { describe, it, expect, vi } from "vitest";

// sync.ts imports ./client which initialises a supabase client at import time.
// For pure merge tests we don't need the client — stub it out.
vi.mock("../client", () => ({
  getSupabase: () => ({
    from: () => ({
      upsert: async () => ({ error: null }),
      insert: async () => ({ error: null }),
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
    }),
  }),
}));

import { mergeProgress } from "../sync";
import type { UserProgress } from "@/types/user";

function makeProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    streakCurrent: 0,
    streakBest: 0,
    totalPoints: 0,
    cardsSeen: 0,
    cardsCorrect: 0,
    lastActiveDate: "",
    dailyGoal: 10,
    todayCardsSeen: 0,
    xp: 0,
    level: 1,
    unlockedAchievements: {},
    completedChallengeIds: [],
    cardHistory: {},
    dailyGoalStreak: 0,
    dailyGoalStreakBest: 0,
    perfectBlitzCount: 0,
    typeCounts: {},
    topicsAnswered: [],
    dailyCaseHistory: {},
    ...overrides,
  };
}

describe("mergeProgress", () => {
  it("takes max of monotonic counters", () => {
    const local = makeProgress({
      xp: 120,
      level: 3,
      streakBest: 5,
      totalPoints: 500,
      cardsSeen: 200,
      cardsCorrect: 150,
      dailyGoalStreak: 4,
      dailyGoalStreakBest: 7,
      perfectBlitzCount: 2,
    });
    const remote = makeProgress({
      xp: 80,
      level: 2,
      streakBest: 10,
      totalPoints: 400,
      cardsSeen: 300,
      cardsCorrect: 100,
      dailyGoalStreak: 1,
      dailyGoalStreakBest: 12,
      perfectBlitzCount: 5,
    });
    const m = mergeProgress(local, remote);
    expect(m.xp).toBe(120);
    expect(m.level).toBe(3);
    expect(m.streakBest).toBe(10);
    expect(m.totalPoints).toBe(500);
    expect(m.cardsSeen).toBe(300);
    expect(m.cardsCorrect).toBe(150);
    expect(m.dailyGoalStreakBest).toBe(12);
    expect(m.perfectBlitzCount).toBe(5);
  });

  it("picks streak snapshot from the device with the freshest lastActiveDate", () => {
    const local = makeProgress({
      streakCurrent: 3,
      lastActiveDate: "2026-04-10",
      todayCardsSeen: 12,
    });
    const remote = makeProgress({
      streakCurrent: 8,
      lastActiveDate: "2026-04-08",
      todayCardsSeen: 40,
    });
    const m = mergeProgress(local, remote);
    expect(m.streakCurrent).toBe(3);
    expect(m.lastActiveDate).toBe("2026-04-10");
    expect(m.todayCardsSeen).toBe(12);
  });

  it("unions array fields without duplicates", () => {
    const local = makeProgress({
      completedChallengeIds: ["c1", "c2"],
      topicsAnswered: ["t1", "t2"],
    });
    const remote = makeProgress({
      completedChallengeIds: ["c2", "c3"],
      topicsAnswered: ["t2", "t3"],
    });
    const m = mergeProgress(local, remote);
    expect(m.completedChallengeIds.sort()).toEqual(["c1", "c2", "c3"]);
    expect(m.topicsAnswered.sort()).toEqual(["t1", "t2", "t3"]);
  });

  it("merges cardHistory — max counters, freshest lastSeen wins for timestamp", () => {
    const local = makeProgress({
      cardHistory: {
        cardA: {
          attempts: 5,
          correct: 3,
          lastSeen: "2026-04-10T10:00:00Z",
          consecutiveFails: 0,
        },
        cardB: {
          attempts: 2,
          correct: 2,
          lastSeen: "2026-04-01T00:00:00Z",
          consecutiveFails: 0,
        },
      },
    });
    const remote = makeProgress({
      cardHistory: {
        cardA: {
          attempts: 4,
          correct: 4,
          lastSeen: "2026-04-09T10:00:00Z",
          consecutiveFails: 1,
        },
        cardC: {
          attempts: 1,
          correct: 0,
          lastSeen: "2026-04-05T00:00:00Z",
          consecutiveFails: 1,
        },
      },
    });
    const m = mergeProgress(local, remote);
    expect(m.cardHistory.cardA.attempts).toBe(5);
    expect(m.cardHistory.cardA.correct).toBe(4);
    expect(m.cardHistory.cardA.lastSeen).toBe("2026-04-10T10:00:00Z");
    expect(m.cardHistory.cardA.consecutiveFails).toBe(0); // from freshest (local)
    expect(m.cardHistory.cardB).toBeDefined();
    expect(m.cardHistory.cardC).toBeDefined();
  });

  it("mergeAchievements keeps earliest unlock timestamp", () => {
    const local = makeProgress({
      unlockedAchievements: {
        firstWin: "2026-04-10T12:00:00Z",
        streak7: "2026-04-10T12:00:00Z",
      },
    });
    const remote = makeProgress({
      unlockedAchievements: {
        firstWin: "2026-04-01T12:00:00Z", // earlier — should win
        perfect: "2026-04-05T12:00:00Z",
      },
    });
    const m = mergeProgress(local, remote);
    expect(m.unlockedAchievements.firstWin).toBe("2026-04-01T12:00:00Z");
    expect(m.unlockedAchievements.streak7).toBe("2026-04-10T12:00:00Z");
    expect(m.unlockedAchievements.perfect).toBe("2026-04-05T12:00:00Z");
  });

  it("mergeDailyCaseHistory: later completedAt per date wins", () => {
    const local = makeProgress({
      dailyCaseHistory: {
        "2026-04-10": {
          completedAt: "2026-04-10T09:00:00Z",
          totalPoints: 80,
          maxPoints: 100,
          steps: [],
        },
      },
    });
    const remote = makeProgress({
      dailyCaseHistory: {
        "2026-04-10": {
          completedAt: "2026-04-10T07:00:00Z",
          totalPoints: 60,
          maxPoints: 100,
          steps: [],
        },
        "2026-04-09": {
          completedAt: "2026-04-09T10:00:00Z",
          totalPoints: 90,
          maxPoints: 100,
          steps: [],
        },
      },
    });
    const m = mergeProgress(local, remote);
    expect(m.dailyCaseHistory["2026-04-10"].totalPoints).toBe(80);
    expect(m.dailyCaseHistory["2026-04-09"].totalPoints).toBe(90);
  });

  it("scenario: local ahead on xp, remote ahead on cardHistory", () => {
    const local = makeProgress({
      xp: 500,
      lastActiveDate: "2026-04-10",
      cardHistory: {
        cardA: {
          attempts: 1,
          correct: 1,
          lastSeen: "2026-04-01T00:00:00Z",
          consecutiveFails: 0,
        },
      },
    });
    const remote = makeProgress({
      xp: 200,
      lastActiveDate: "2026-04-09",
      cardHistory: {
        cardA: {
          attempts: 10,
          correct: 7,
          lastSeen: "2026-04-09T00:00:00Z",
          consecutiveFails: 0,
        },
        cardB: {
          attempts: 3,
          correct: 3,
          lastSeen: "2026-04-08T00:00:00Z",
          consecutiveFails: 0,
        },
      },
    });
    const m = mergeProgress(local, remote);
    expect(m.xp).toBe(500);
    expect(m.lastActiveDate).toBe("2026-04-10");
    expect(m.cardHistory.cardA.attempts).toBe(10);
    expect(m.cardHistory.cardA.correct).toBe(7);
    expect(m.cardHistory.cardA.lastSeen).toBe("2026-04-09T00:00:00Z");
    expect(m.cardHistory.cardB).toBeDefined();
  });
});
