import { describe, it, expect } from "vitest";
import { demoCards } from "@/data/cards";
import type { Card } from "@/types/card";

describe("Card data validation", () => {
  it("has 190+ cards", () => {
    expect(demoCards.length).toBeGreaterThanOrEqual(190);
  });

  it("all cards have unique IDs", () => {
    const ids = demoCards.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all cards have required fields", () => {
    for (const card of demoCards) {
      expect(card.id).toBeTruthy();
      expect(card.type).toBeTruthy();
      expect(card.topic).toBeTruthy();
    }
  });

  it("all card types are valid", () => {
    const validTypes = [
      "clinical_case",
      "myth_or_fact",
      "build_scheme",
      "blitz_test",
      "fill_blank",
      "red_flags",
      "visual_quiz",
    ];
    for (const card of demoCards) {
      expect(validTypes).toContain(card.type);
    }
  });

  it("clinical_case cards have exactly one correct option", () => {
    const cases = demoCards.filter((c) => c.type === "clinical_case") as Extract<Card, { type: "clinical_case" }>[];
    expect(cases.length).toBeGreaterThan(0);
    for (const card of cases) {
      const correctCount = card.options.filter((o) => o.isCorrect).length;
      expect(correctCount, `Card ${card.id} should have exactly 1 correct option, has ${correctCount}`).toBe(1);
    }
  });

  it("myth_or_fact cards have isMyth boolean", () => {
    const myths = demoCards.filter((c) => c.type === "myth_or_fact") as Extract<Card, { type: "myth_or_fact" }>[];
    expect(myths.length).toBeGreaterThan(0);
    for (const card of myths) {
      expect(typeof card.isMyth, `Card ${card.id} isMyth should be boolean`).toBe("boolean");
    }
  });

  it("blitz_test cards have timeLimit and questions", () => {
    const blitz = demoCards.filter((c) => c.type === "blitz_test") as Extract<Card, { type: "blitz_test" }>[];
    expect(blitz.length).toBeGreaterThan(0);
    for (const card of blitz) {
      expect(card.timeLimit).toBeGreaterThan(0);
      expect(card.questions.length).toBeGreaterThan(0);
      for (const q of card.questions) {
        expect(typeof q.correctAnswer).toBe("boolean");
        expect(q.explanation).toBeTruthy();
      }
    }
  });

  it("fill_blank cards have correctAnswer", () => {
    const blanks = demoCards.filter((c) => c.type === "fill_blank") as Extract<Card, { type: "fill_blank" }>[];
    expect(blanks.length).toBeGreaterThan(0);
    for (const card of blanks) {
      expect(card.correctAnswer, `Card ${card.id} missing correctAnswer`).toBeTruthy();
    }
  });

  it("red_flags cards have options with isDanger", () => {
    const flags = demoCards.filter((c) => c.type === "red_flags") as Extract<Card, { type: "red_flags" }>[];
    expect(flags.length).toBeGreaterThan(0);
    for (const card of flags) {
      expect(card.options.length).toBeGreaterThan(0);
      for (const option of card.options) {
        expect(typeof option.isDanger, `Card ${card.id} option missing isDanger`).toBe("boolean");
      }
    }
  });

  it("covers multiple topics", () => {
    const topics = new Set(demoCards.map((c) => c.topic));
    expect(topics.size).toBeGreaterThanOrEqual(8);
  });
});
