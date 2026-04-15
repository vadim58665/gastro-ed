import { describe, it, expect } from "vitest";
import { getFeedMistakes, groupBySpecialty, groupByTopic } from "@/lib/mistakes";
import type { Card } from "@/types/card";
import type { UserProgress, CardHistoryEntry } from "@/types/user";

function makeCard(id: string, specialty: string, topic: string): Card {
  return {
    id,
    type: "myth_or_fact",
    specialty,
    topic,
    statement: "тест",
    isMyth: false,
    explanation: "тест",
  } as Card;
}

function makeProgress(
  history: Record<string, Partial<CardHistoryEntry>>
): UserProgress {
  const full: Record<string, CardHistoryEntry> = {};
  for (const [id, entry] of Object.entries(history)) {
    full[id] = {
      attempts: 1,
      correct: 0,
      lastSeen: new Date().toISOString(),
      consecutiveFails: 1,
      ...entry,
    };
  }
  return {
    streakCurrent: 0,
    streakBest: 0,
    totalPoints: 0,
    cardsSeen: 0,
    cardsCorrect: 0,
    lastActiveDate: "",
    dailyGoal: 20,
    todayCardsSeen: 0,
    xp: 0,
    level: 1,
    unlockedAchievements: {},
    completedChallengeIds: [],
    cardHistory: full,
    dailyGoalStreak: 0,
    dailyGoalStreakBest: 0,
    perfectBlitzCount: 0,
    typeCounts: {},
    topicsAnswered: [],
    dailyCaseHistory: {},
    recentAnswers: [],
  };
}

describe("getFeedMistakes", () => {
  const cards: Card[] = [
    makeCard("c1", "Кардиология", "Артериальная гипертензия"),
    makeCard("c2", "Кардиология", "ИБС"),
    makeCard("c3", "Неврология", "Инсульт"),
    makeCard("c4", "Неврология", "Мигрень"),
  ];

  it("возвращает пустой список, если нет истории", () => {
    const progress = makeProgress({});
    expect(getFeedMistakes(progress, cards)).toEqual([]);
  });

  it("возвращает только карточки с consecutiveFails > 0", () => {
    const progress = makeProgress({
      c1: { consecutiveFails: 2 },
      c2: { consecutiveFails: 0 }, // правильный ответ → не ошибка
      c3: { consecutiveFails: 1 },
    });
    const result = getFeedMistakes(progress, cards);
    expect(result.map((c) => c.id).sort()).toEqual(["c1", "c3"]);
  });

  it("карточка исчезает, когда consecutiveFails обнуляется", () => {
    const progress1 = makeProgress({ c1: { consecutiveFails: 3 } });
    expect(getFeedMistakes(progress1, cards).map((c) => c.id)).toEqual(["c1"]);

    const progress2 = makeProgress({ c1: { consecutiveFails: 0 } });
    expect(getFeedMistakes(progress2, cards)).toEqual([]);
  });

  it("игнорирует карточки, которых уже нет в колоде", () => {
    const progress = makeProgress({
      "orphan-id": { consecutiveFails: 5 },
      c1: { consecutiveFails: 1 },
    });
    const result = getFeedMistakes(progress, cards);
    expect(result.map((c) => c.id)).toEqual(["c1"]);
  });
});

describe("groupBySpecialty / groupByTopic", () => {
  const cards: Card[] = [
    makeCard("c1", "Кардиология", "АГ"),
    makeCard("c2", "Кардиология", "АГ"),
    makeCard("c3", "Кардиология", "ИБС"),
    makeCard("c4", "Неврология", "Инсульт"),
  ];

  it("группирует по специальности со счётчиками", () => {
    const groups = groupBySpecialty(cards);
    expect(groups).toEqual([
      { key: "Кардиология", label: "Кардиология", count: 3 },
      { key: "Неврология", label: "Неврология", count: 1 },
    ]);
  });

  it("группирует по теме со счётчиками", () => {
    const groups = groupByTopic(cards);
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.count]));
    expect(byKey).toEqual({ АГ: 2, ИБС: 1, Инсульт: 1 });
  });

  it("сортирует по убыванию count", () => {
    const groups = groupBySpecialty(cards);
    expect(groups[0].count).toBeGreaterThanOrEqual(groups[1].count);
  });
});
