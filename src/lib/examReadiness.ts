import type { Card } from "@/types/card";
import type { CardHistoryEntry } from "@/types/user";

export type TopicStatus = "untouched" | "weak" | "developing" | "strong";

export interface TopicReadiness {
  topic: string;
  totalCards: number;
  cardsSeen: number;
  attempts: number;
  correct: number;
  accuracy: number;
  weight: number;
  contribution: number;
  status: TopicStatus;
  priorityScore: number;
}

export interface ExamReadinessReport {
  specialty: string;
  totalTopics: number;
  touchedTopics: number;
  readinessPercent: number;
  averageAccuracy: number;
  totalAttempts: number;
  totalCards: number;
  cardsSeen: number;
  topics: TopicReadiness[];
}

const ATTEMPTS_FOR_FULL_WEIGHT = 5;
const WEAK_ACCURACY_THRESHOLD = 0.6;
const WEAK_MIN_ATTEMPTS = 3;
const STRONG_CONTRIBUTION_THRESHOLD = 0.85;

export function computeExamReadiness(
  cardHistory: Record<string, CardHistoryEntry>,
  specialtyName: string,
  allCards: Card[]
): ExamReadinessReport {
  const specialtyCards = allCards.filter((c) => c.specialty === specialtyName);

  // Group cards by topic within specialty
  const cardsByTopic = new Map<string, Card[]>();
  for (const card of specialtyCards) {
    const list = cardsByTopic.get(card.topic);
    if (list) list.push(card);
    else cardsByTopic.set(card.topic, [card]);
  }

  const topics: TopicReadiness[] = [];
  let touchedTopics = 0;
  let totalAttempts = 0;
  let cardsSeen = 0;
  let sumContribution = 0;
  let sumAccuracyTouched = 0;

  for (const [topic, cards] of cardsByTopic) {
    let attempts = 0;
    let correct = 0;
    let seen = 0;

    for (const card of cards) {
      const entry = cardHistory[card.id];
      if (!entry || entry.attempts === 0) continue;
      attempts += entry.attempts;
      correct += entry.correct;
      seen += 1;
    }

    const accuracy = attempts > 0 ? correct / attempts : 0;
    const weight = Math.min(1, attempts / ATTEMPTS_FOR_FULL_WEIGHT);
    const contribution = weight * accuracy;
    const priorityScore = (1 - accuracy) * weight;

    let status: TopicStatus;
    if (attempts === 0) {
      status = "untouched";
    } else if (accuracy < WEAK_ACCURACY_THRESHOLD && attempts >= WEAK_MIN_ATTEMPTS) {
      status = "weak";
    } else if (contribution >= STRONG_CONTRIBUTION_THRESHOLD) {
      status = "strong";
    } else {
      status = "developing";
    }

    topics.push({
      topic,
      totalCards: cards.length,
      cardsSeen: seen,
      attempts,
      correct,
      accuracy: round4(accuracy),
      weight: round4(weight),
      contribution: round4(contribution),
      status,
      priorityScore: round4(priorityScore),
    });

    if (attempts > 0) {
      touchedTopics += 1;
      totalAttempts += attempts;
      cardsSeen += seen;
      sumContribution += contribution;
      sumAccuracyTouched += accuracy;
    } else {
      // untouched still contributes 0 to sumContribution — this is intentional,
      // the denominator below is totalTopics (not touchedTopics)
    }
  }

  const totalTopics = topics.length;
  const readinessPercent =
    totalTopics > 0 ? Math.round((sumContribution / totalTopics) * 100) : 0;
  const averageAccuracy =
    touchedTopics > 0 ? Math.round((sumAccuracyTouched / touchedTopics) * 100) : 0;

  // Sort: weak first (by priorityScore desc), then developing, then strong, then untouched
  // Within same status, higher priorityScore first for weak/developing, higher contribution for strong
  const statusOrder: Record<TopicStatus, number> = {
    weak: 0,
    developing: 1,
    strong: 2,
    untouched: 3,
  };
  topics.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (a.status === "strong") return b.contribution - a.contribution;
    if (a.status === "untouched") return a.topic.localeCompare(b.topic, "ru");
    return b.priorityScore - a.priorityScore;
  });

  return {
    specialty: specialtyName,
    totalTopics,
    touchedTopics,
    readinessPercent,
    averageAccuracy,
    totalAttempts,
    totalCards: specialtyCards.length,
    cardsSeen,
    topics,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
