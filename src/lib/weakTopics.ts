import type { UserProgress } from "@/types/user";
import type { Card } from "@/types/card";

const MIN_ATTEMPTS = 3;
const WEAK_THRESHOLD = 0.6;

/**
 * Compute topics where the user's success rate is below WEAK_THRESHOLD.
 * Only topics with at least MIN_ATTEMPTS attempts are considered, to avoid
 * noise from a single random mistake.
 */
export function getWeakTopics(
  progress: UserProgress,
  cards: Card[]
): string[] {
  const history = progress.cardHistory || {};
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const byTopic = new Map<string, { attempts: number; correct: number }>();

  for (const [cardId, entry] of Object.entries(history)) {
    const card = cardById.get(cardId);
    if (!card) continue;
    const agg = byTopic.get(card.topic) || { attempts: 0, correct: 0 };
    agg.attempts += entry.attempts;
    agg.correct += entry.correct;
    byTopic.set(card.topic, agg);
  }

  const weak: string[] = [];
  for (const [topic, { attempts, correct }] of byTopic) {
    if (attempts < MIN_ATTEMPTS) continue;
    if (correct / attempts < WEAK_THRESHOLD) weak.push(topic);
  }
  return weak;
}

export function getWeakTopicCards(cards: Card[], weakTopics: string[]): Card[] {
  if (weakTopics.length === 0) return [];
  const set = new Set(weakTopics);
  return cards.filter((c) => set.has(c.topic));
}
