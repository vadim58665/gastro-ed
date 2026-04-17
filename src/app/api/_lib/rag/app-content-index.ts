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

export interface AppMatch {
  id: string;
  type: "card" | "accreditation_question";
  topic?: string;
  specialty: string;
  text: string;
  score: number;
}

/**
 * Lightweight keyword search over cards + accreditation questions. Used by the
 * chat route to enrich RAG context with items the user actually sees in the UI.
 * No embedding / vector DB — just token overlap scored by topic, specialty,
 * and question body.
 */
export async function searchAppContent(
  query: string,
  opts: {
    limit?: number;
    preferType?: "card" | "accreditation_question";
  } = {}
): Promise<string> {
  const limit = opts.limit ?? 3;
  if (!query || query.trim().length < 2) return "";

  const { demoCards } = await import("@/data/cards");
  const accredMod = await import("@/data/accreditation");

  const q = query.toLowerCase();
  const tokens = q
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return "";

  const matches: AppMatch[] = [];

  for (const card of demoCards) {
    const body = extractQuestion(card).toLowerCase();
    const topic = (card.topic ?? "").toLowerCase();
    const specialty = (card.specialty ?? "").toLowerCase();

    let score = 0;
    if (topic && q.includes(topic)) score += 3;
    if (specialty && q.includes(specialty)) score += 2;
    for (const t of tokens) {
      if (body.includes(t)) score += 1;
      if (topic.includes(t)) score += 0.5;
    }
    if (score > 0) {
      matches.push({
        id: card.id,
        type: "card",
        topic: card.topic,
        specialty: card.specialty,
        text: extractQuestion(card).slice(0, 240),
        score: score + (opts.preferType === "card" ? 0.5 : 0),
      });
    }
  }

  const accreditationSpecialtyIds = [
    "gastroenterologiya",
    "kardiologiya",
    "nevrologiya",
    "hirurgiya",
    "lechebnoe-delo",
    "pediatriya",
  ];
  for (const specId of accreditationSpecialtyIds) {
    const questions = accredMod.getQuestionsForSpecialty(specId);
    for (const qst of questions) {
      const body = qst.question.toLowerCase();
      const specialty = qst.specialty.toLowerCase();
      let score = 0;
      if (specialty && q.includes(specialty)) score += 2;
      for (const t of tokens) {
        if (body.includes(t)) score += 1;
      }
      if (score > 0) {
        matches.push({
          id: qst.id,
          type: "accreditation_question",
          specialty: qst.specialty,
          text: qst.question.slice(0, 240),
          score:
            score +
            (opts.preferType === "accreditation_question" ? 0.5 : 0),
        });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, limit);
  if (top.length === 0) return "";

  const lines = ["<app_matches>"];
  for (const m of top) {
    const label = m.type === "card" ? "Карточка" : "Вопрос аккредитации";
    const topicPart = m.topic ? ` · ${m.topic}` : "";
    lines.push(`${label} [${m.id}] ${m.specialty}${topicPart}: ${m.text}`);
  }
  lines.push("</app_matches>");
  return lines.join("\n");
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
