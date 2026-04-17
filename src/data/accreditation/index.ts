import { gastroenterologiyaQuestions } from "./gastroenterologiya";
import { kardiologiyaQuestions } from "./kardiologiya";
import { nevrologiyaQuestions } from "./nevrologiya";
import { hirurgiyaQuestions } from "./hirurgiya";
import { lechebnoeDeloQuestions } from "./lechebnoe-delo";
import { pediatriyaQuestions } from "./pediatriya";
import type { TestQuestion } from "@/types/accreditation";

const questionsBySpecialty: Record<string, TestQuestion[]> = {
  gastroenterologiya: gastroenterologiyaQuestions,
  kardiologiya: kardiologiyaQuestions,
  nevrologiya: nevrologiyaQuestions,
  hirurgiya: hirurgiyaQuestions,
  "lechebnoe-delo": lechebnoeDeloQuestions,
  pediatriya: pediatriyaQuestions,
};

// Канонический источник специальностей аккредитации.
// RAG, prebuild-пайплайн и export-пайплайн должны брать список отсюда,
// иначе новая специальность молча выпадет из поиска/генерации контента.
export const ACCREDITATION_SPECIALTY_IDS = Object.keys(
  questionsBySpecialty
);

export function getQuestionsForSpecialty(specialtyId: string): TestQuestion[] {
  return questionsBySpecialty[specialtyId] || [];
}

export function getBlockQuestions(
  specialtyId: string,
  blockNumber: number
): TestQuestion[] {
  return getQuestionsForSpecialty(specialtyId).filter(
    (q) => q.blockNumber === blockNumber
  );
}

export function getBlockCount(specialtyId: string): number {
  const questions = getQuestionsForSpecialty(specialtyId);
  if (questions.length === 0) return 0;
  return Math.max(...questions.map((q) => q.blockNumber));
}

export function getTotalQuestionCount(specialtyId: string): number {
  return getQuestionsForSpecialty(specialtyId).length;
}
