"use client";

import { useState, useMemo, useCallback } from "react";
import type { Card } from "@/types/card";
import type { TestQuestion } from "@/types/accreditation";

export interface SearchResult {
  type: "card" | "test";
  id: string;
  title: string;
  topic: string;
  specialty: string;
  matchSnippet: string;
}

function getCardSearchText(card: Card): string {
  const parts = [card.topic, card.specialty, card.keyFact ?? ""];

  switch (card.type) {
    case "clinical_case":
      parts.push(card.scenario, card.question, ...card.options.map((o) => o.text));
      break;
    case "myth_or_fact":
      parts.push(card.statement, card.explanation);
      break;
    case "build_scheme":
      parts.push(card.title, card.instruction, ...card.components.map((c) => c.text));
      break;
    case "visual_quiz":
      parts.push(card.question, ...card.options.map((o) => o.text), card.explanation);
      break;
    case "blitz_test":
      parts.push(card.title, ...card.questions.map((q) => q.question));
      break;
    case "fill_blank":
      parts.push(card.textBefore, card.textAfter, card.correctAnswer, card.explanation);
      break;
    case "red_flags":
      parts.push(card.scenario, ...card.options.map((o) => o.text), card.explanation);
      break;
  }

  return parts.join(" ").toLowerCase();
}

function getCardTitle(card: Card): string {
  switch (card.type) {
    case "clinical_case":
      return card.question;
    case "myth_or_fact":
      return card.statement;
    case "build_scheme":
      return card.title;
    case "visual_quiz":
      return card.question;
    case "blitz_test":
      return card.title;
    case "fill_blank":
      return `${card.textBefore}___${card.textAfter}`;
    case "red_flags":
      return card.scenario.slice(0, 80);
    case "match_pairs":
      return card.title;
    case "priority_rank":
      return card.question;
    case "cause_chain":
      return card.title;
    case "dose_calc":
      return card.question;
  }
}

function getTestSearchText(q: TestQuestion): string {
  return [q.question, q.specialty, ...q.options].join(" ").toLowerCase();
}

function findSnippet(fullText: string, query: string): string {
  const lower = fullText.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return fullText.slice(0, 80);
  const start = Math.max(0, idx - 30);
  const end = Math.min(fullText.length, idx + query.length + 50);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < fullText.length ? "..." : "";
  return prefix + fullText.slice(start, end) + suffix;
}

export function useQuestionSearch(
  cards: Card[],
  testQuestions: TestQuestion[] = []
) {
  const [query, setQuery] = useState("");

  const cardIndex = useMemo(
    () => cards.map((c) => ({ card: c, text: getCardSearchText(c) })),
    [cards]
  );

  const testIndex = useMemo(
    () => testQuestions.map((q) => ({ question: q, text: getTestSearchText(q) })),
    [testQuestions]
  );

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const found: SearchResult[] = [];

    for (const { card, text } of cardIndex) {
      if (text.includes(q)) {
        found.push({
          type: "card",
          id: card.id,
          title: getCardTitle(card).slice(0, 80),
          topic: card.topic,
          specialty: card.specialty,
          matchSnippet: findSnippet(text, q),
        });
      }
      if (found.length >= 20) break;
    }

    for (const { question, text } of testIndex) {
      if (found.length >= 20) break;
      if (text.includes(q)) {
        found.push({
          type: "test",
          id: question.id,
          title: question.question.slice(0, 80),
          topic: question.specialty,
          specialty: question.specialty,
          matchSnippet: findSnippet(text, q),
        });
      }
    }

    return found;
  }, [query, cardIndex, testIndex]);

  const clear = useCallback(() => setQuery(""), []);

  return { query, setQuery, results, clear };
}
