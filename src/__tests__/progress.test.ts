import { describe, it, expect } from "vitest";

// Pure function tests extracted from useProgress logic

function getLocalDateStr(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPreviousDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const prev = new Date(y, m - 1, d - 1);
  return getLocalDateStr(prev);
}

interface Progress {
  streakCurrent: number;
  streakBest: number;
  totalPoints: number;
  cardsSeen: number;
  cardsCorrect: number;
  lastActiveDate: string;
  dailyGoal: number;
  todayCardsSeen: number;
}

function recordAnswer(progress: Progress, isCorrect: boolean, today: string): Progress {
  const isFirstAnswerToday = progress.lastActiveDate !== today;
  const updated: Progress = {
    ...progress,
    cardsSeen: progress.cardsSeen + 1,
    cardsCorrect: progress.cardsCorrect + (isCorrect ? 1 : 0),
    totalPoints: progress.totalPoints + (isCorrect ? 10 : 2),
    todayCardsSeen: progress.todayCardsSeen + 1,
    lastActiveDate: today,
    streakCurrent: isFirstAnswerToday
      ? progress.streakCurrent + 1
      : progress.streakCurrent || 1,
  };
  updated.streakBest = Math.max(updated.streakBest, updated.streakCurrent);
  return updated;
}

function resetDayIfNeeded(progress: Progress, today: string): Progress {
  if (progress.lastActiveDate !== today) {
    const isConsecutive = progress.lastActiveDate === getPreviousDate(today);
    return {
      ...progress,
      streakCurrent: isConsecutive ? progress.streakCurrent : 0,
      todayCardsSeen: 0,
    };
  }
  return progress;
}

describe("getLocalDateStr", () => {
  it("formats date correctly", () => {
    const date = new Date(2026, 3, 2); // April 2, 2026
    expect(getLocalDateStr(date)).toBe("2026-04-02");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 5); // Jan 5
    expect(getLocalDateStr(date)).toBe("2026-01-05");
  });
});

describe("getPreviousDate", () => {
  it("returns previous day", () => {
    expect(getPreviousDate("2026-04-02")).toBe("2026-04-01");
  });

  it("crosses month boundary", () => {
    expect(getPreviousDate("2026-04-01")).toBe("2026-03-31");
  });

  it("crosses year boundary", () => {
    expect(getPreviousDate("2026-01-01")).toBe("2025-12-31");
  });
});

describe("recordAnswer", () => {
  const base: Progress = {
    streakCurrent: 0,
    streakBest: 0,
    totalPoints: 0,
    cardsSeen: 0,
    cardsCorrect: 0,
    lastActiveDate: "",
    dailyGoal: 10,
    todayCardsSeen: 0,
  };

  it("correct answer gives 10 points", () => {
    const result = recordAnswer(base, true, "2026-04-02");
    expect(result.totalPoints).toBe(10);
    expect(result.cardsCorrect).toBe(1);
    expect(result.cardsSeen).toBe(1);
  });

  it("incorrect answer gives 2 points", () => {
    const result = recordAnswer(base, false, "2026-04-02");
    expect(result.totalPoints).toBe(2);
    expect(result.cardsCorrect).toBe(0);
    expect(result.cardsSeen).toBe(1);
  });

  it("first answer of day starts streak", () => {
    const result = recordAnswer(base, true, "2026-04-02");
    expect(result.streakCurrent).toBe(1);
    expect(result.streakBest).toBe(1);
    expect(result.lastActiveDate).toBe("2026-04-02");
  });

  it("second answer same day keeps streak", () => {
    const after1 = recordAnswer(base, true, "2026-04-02");
    const after2 = recordAnswer(after1, true, "2026-04-02");
    expect(after2.streakCurrent).toBe(1);
    expect(after2.cardsSeen).toBe(2);
    expect(after2.todayCardsSeen).toBe(2);
  });

  it("consecutive day increments streak", () => {
    const day1 = recordAnswer(base, true, "2026-04-01");
    // Simulate next day reset
    const resetted = resetDayIfNeeded(day1, "2026-04-02");
    const day2 = recordAnswer(resetted, true, "2026-04-02");
    expect(day2.streakCurrent).toBe(2);
    expect(day2.streakBest).toBe(2);
  });

  it("gap day resets streak", () => {
    const day1 = recordAnswer(base, true, "2026-04-01");
    // Skip a day
    const resetted = resetDayIfNeeded(day1, "2026-04-03");
    expect(resetted.streakCurrent).toBe(0);
    const day3 = recordAnswer(resetted, true, "2026-04-03");
    expect(day3.streakCurrent).toBe(1);
  });

  it("streakBest never decreases", () => {
    let p = base;
    p = recordAnswer(p, true, "2026-04-01");
    const resetted = resetDayIfNeeded(p, "2026-04-02");
    p = recordAnswer(resetted, true, "2026-04-02");
    expect(p.streakBest).toBe(2);
    // Gap
    const resetted2 = resetDayIfNeeded(p, "2026-04-05");
    p = recordAnswer(resetted2, true, "2026-04-05");
    expect(p.streakCurrent).toBe(1);
    expect(p.streakBest).toBe(2); // Best stays
  });

  it("accumulates points across multiple answers", () => {
    let p = base;
    p = recordAnswer(p, true, "2026-04-02");  // +10
    p = recordAnswer(p, false, "2026-04-02"); // +2
    p = recordAnswer(p, true, "2026-04-02");  // +10
    expect(p.totalPoints).toBe(22);
    expect(p.cardsSeen).toBe(3);
    expect(p.cardsCorrect).toBe(2);
  });
});
