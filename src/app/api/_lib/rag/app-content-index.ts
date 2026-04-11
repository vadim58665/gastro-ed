/**
 * In-memory index of all app content (cards, specialties, accreditation).
 * Built once at server startup, used by prompt system and RAG.
 */

import type { CardType } from "@/types/card";
import type { AppStats } from "../prompts/app-knowledge";

export interface AppContentIndex {
  specialties: {
    id: string;
    name: string;
    cardCount: number;
    hasAccreditation: boolean;
  }[];
  topicsBySpecialty: Map<string, string[]>;
  cardsByTopic: Map<string, { id: string; type: CardType; question: string }[]>;
  accreditationBlocks: Map<string, { blockCount: number; questionCount: number }>;
  totalCards: number;
  totalAccreditationQuestions: number;
}

let cachedIndex: AppContentIndex | null = null;

function extractQuestion(card: any): string {
  if (card.question) return card.question;
  if (card.statement) return card.statement;
  if (card.scenario) return card.scenario;
  if (card.title) return card.title;
  return "";
}

export async function getAppContentIndex(): Promise<AppContentIndex> {
  if (cachedIndex) return cachedIndex;

  // Dynamic imports to avoid bundling large data files in all routes
  const { demoCards } = await import("@/data/cards");
  const { accreditationCategories } = await import("@/data/specialties");
  const { getQuestionsForSpecialty, getBlockCount } = await import(
    "@/data/accreditation"
  );

  const topicsBySpecialty = new Map<string, string[]>();
  const cardsByTopic = new Map<
    string,
    { id: string; type: CardType; question: string }[]
  >();
  const specialtyCardCounts = new Map<string, number>();

  for (const card of demoCards) {
    // Card count per specialty
    specialtyCardCounts.set(
      card.specialty,
      (specialtyCardCounts.get(card.specialty) ?? 0) + 1
    );

    // Topics per specialty
    const topics = topicsBySpecialty.get(card.specialty) ?? [];
    if (!topics.includes(card.topic)) {
      topics.push(card.topic);
      topicsBySpecialty.set(card.specialty, topics);
    }

    // Cards per topic
    const topicCards = cardsByTopic.get(card.topic) ?? [];
    topicCards.push({
      id: card.id,
      type: card.type,
      question: extractQuestion(card).slice(0, 200),
    });
    cardsByTopic.set(card.topic, topicCards);
  }

  // Accreditation data
  const accreditationBlocks = new Map<
    string,
    { blockCount: number; questionCount: number }
  >();
  const accreditationSpecialtyIds = [
    "gastroenterologiya",
    "kardiologiya",
    "nevrologiya",
    "hirurgiya",
    "lechebnoe-delo",
    "pediatriya",
  ];
  let totalAccreditationQuestions = 0;

  for (const specId of accreditationSpecialtyIds) {
    const questions = getQuestionsForSpecialty(specId);
    const blocks = getBlockCount(specId);
    if (questions.length > 0) {
      accreditationBlocks.set(specId, {
        blockCount: blocks,
        questionCount: questions.length,
      });
      totalAccreditationQuestions += questions.length;
    }
  }

  // Build specialty list with accreditation flag
  const specialtySet = new Set<string>();
  for (const cat of accreditationCategories) {
    for (const spec of cat.specialties) {
      specialtySet.add(spec.name);
    }
  }
  // Also include specialties from cards
  for (const name of specialtyCardCounts.keys()) {
    specialtySet.add(name);
  }

  const specialties = Array.from(specialtySet).map((name) => ({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    cardCount: specialtyCardCounts.get(name) ?? 0,
    hasAccreditation: accreditationSpecialtyIds.some(
      (id) =>
        name.toLowerCase().includes(id.replace(/-/g, " ").replace("iya", ""))
    ),
  }));

  cachedIndex = {
    specialties,
    topicsBySpecialty,
    cardsByTopic,
    accreditationBlocks,
    totalCards: demoCards.length,
    totalAccreditationQuestions,
  };

  return cachedIndex;
}

/**
 * Builds AppStats for the prompt system, optionally filtered to user's specialty.
 */
export async function getAppStatsForUser(
  userSpecialty?: string
): Promise<AppStats> {
  const index = await getAppContentIndex();

  const stats: AppStats = {
    totalCards: index.totalCards,
    totalSpecialties: index.specialties.length,
    totalAccreditationQuestions: index.totalAccreditationQuestions,
  };

  if (userSpecialty) {
    const topics = index.topicsBySpecialty.get(userSpecialty);
    if (topics) {
      stats.userSpecialtyTopics = topics;
      stats.userSpecialtyCardCount = topics.reduce(
        (sum, t) => sum + (index.cardsByTopic.get(t)?.length ?? 0),
        0
      );
    }
  }

  return stats;
}
