import type { Card, DifficultyLevel } from "@/types/card";

const DEFAULT_DIFFICULTY: DifficultyLevel = 3;

/**
 * Weighted card selection by difficulty level.
 * 60% selected level, 25% one below, 15% one above.
 * Cards without difficulty default to 3 (Врач).
 */
export function filterByDifficulty(
  cards: Card[],
  userLevel: DifficultyLevel
): Card[] {
  const getD = (c: Card): DifficultyLevel => c.difficulty ?? DEFAULT_DIFFICULTY;

  const exact = cards.filter((c) => getD(c) === userLevel);
  const below = cards.filter((c) => getD(c) === Math.max(1, userLevel - 1) && getD(c) !== userLevel);
  const above = cards.filter((c) => getD(c) === Math.min(5, userLevel + 1) && getD(c) !== userLevel);
  const rest = cards.filter(
    (c) =>
      getD(c) !== userLevel &&
      getD(c) !== Math.max(1, userLevel - 1) &&
      getD(c) !== Math.min(5, userLevel + 1)
  );

  // Target proportions: 60% exact, 25% below, 15% above
  const targetTotal = cards.length;
  const targetExact = Math.round(targetTotal * 0.6);
  const targetBelow = Math.round(targetTotal * 0.25);
  const targetAbove = Math.round(targetTotal * 0.15);

  const result: Card[] = [];

  // Fill each bucket up to target, shuffle within
  result.push(...shuffle(exact).slice(0, targetExact));
  result.push(...shuffle(below).slice(0, targetBelow));
  result.push(...shuffle(above).slice(0, targetAbove));

  // If any bucket was short, fill from remaining cards
  const remaining = targetTotal - result.length;
  if (remaining > 0) {
    const used = new Set(result.map((c) => c.id));
    const unused = [...exact, ...below, ...above, ...rest].filter(
      (c) => !used.has(c.id)
    );
    result.push(...shuffle(unused).slice(0, remaining));
  }

  return shuffle(result);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Compute card difficulty from the user's recent answer history.
 * Maps sliding-window accuracy to DifficultyLevel 1-5.
 * New users (< 5 answers) start at level 1.
 */
export function getAdaptiveDifficulty(recentAnswers: boolean[]): DifficultyLevel {
  if (recentAnswers.length < 5) return 1;
  const accuracy = (recentAnswers.filter(Boolean).length / recentAnswers.length) * 100;
  if (accuracy < 40) return 1;
  if (accuracy < 68) return 2;
  if (accuracy < 85) return 3;
  if (accuracy < 94) return 4;
  return 5;
}
