import { describe, it, expect } from "vitest";
import { fsrs, createEmptyCard, Rating } from "ts-fsrs";

const f = fsrs({
  request_retention: 0.85,
  maximum_interval: 365,
  enable_fuzz: false, // deterministic for tests
});

describe("FSRS scheduling", () => {
  it("new card scheduled after correct answer", () => {
    const now = new Date(2026, 3, 2, 10, 0); // April 2, 2026 10:00
    const card = createEmptyCard(now);
    const result = f.next(card, now, Rating.Good);

    expect(result.card.due.getTime()).toBeGreaterThan(now.getTime());
    expect(result.card.reps).toBe(1);
  });

  it("Again resets to short interval", () => {
    const now = new Date(2026, 3, 2, 10, 0);
    const card = createEmptyCard(now);
    const result = f.next(card, now, Rating.Again);

    // Again should give a very short interval (minutes)
    const diffMs = result.card.due.getTime() - now.getTime();
    const diffMinutes = diffMs / 1000 / 60;
    expect(diffMinutes).toBeLessThan(60); // less than 1 hour
  });

  it("Good gives longer interval than Again", () => {
    const now = new Date(2026, 3, 2, 10, 0);
    const card = createEmptyCard(now);

    const again = f.next(card, now, Rating.Again);
    const good = f.next(card, now, Rating.Good);

    expect(good.card.due.getTime()).toBeGreaterThan(again.card.due.getTime());
  });

  it("repeated Good answers increase interval", () => {
    const now = new Date(2026, 3, 2, 10, 0);
    let card = createEmptyCard(now);
    let reviewDate = now;

    const intervals: number[] = [];

    for (let i = 0; i < 4; i++) {
      const result = f.next(card, reviewDate, Rating.Good);
      const intervalMs = result.card.due.getTime() - reviewDate.getTime();
      intervals.push(intervalMs);
      card = result.card;
      reviewDate = result.card.due;
    }

    // Each successive interval should be >= previous
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
  });

  it("Easy gives longest interval", () => {
    const now = new Date(2026, 3, 2, 10, 0);
    const card = createEmptyCard(now);

    const good = f.next(card, now, Rating.Good);
    const easy = f.next(card, now, Rating.Easy);

    expect(easy.card.due.getTime()).toBeGreaterThanOrEqual(good.card.due.getTime());
  });
});
