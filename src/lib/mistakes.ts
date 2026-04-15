import type { Card } from "@/types/card";
import type { UserProgress } from "@/types/user";

/**
 * Возвращает карточки, по которым у пользователя есть активные ошибки —
 * то есть последний ответ был неверным (consecutiveFails > 0).
 *
 * Это источник для раздела /mistakes. В отличие от FSRS-очереди (/review),
 * карточка пропадает из списка СРАЗУ при правильном ответе (consecutiveFails
 * обнуляется в useGamification) и больше не возвращается сама.
 */
export function getFeedMistakes(
  progress: UserProgress,
  allCards: Card[]
): Card[] {
  const history = progress.cardHistory ?? {};
  return allCards.filter((c) => (history[c.id]?.consecutiveFails ?? 0) > 0);
}

export interface MistakeGroup<K extends string> {
  key: K;
  label: string;
  count: number;
}

export function groupBySpecialty(cards: Card[]): MistakeGroup<string>[] {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    counts[card.specialty] = (counts[card.specialty] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count);
}

export function groupByTopic(cards: Card[]): MistakeGroup<string>[] {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    counts[card.topic] = (counts[card.topic] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count);
}
