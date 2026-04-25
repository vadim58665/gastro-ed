import type { DifficultyLevel } from "./card";

export interface QuestionStats {
  attempts: number;
  wrong: number;
  lastSeen: number;
  wasEverCorrect: boolean;
}

export interface TestQuestion {
  id: string;
  specialty: string;
  blockNumber: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: DifficultyLevel;
  /**
   * Имя файла картинки в Supabase Storage bucket `test-images`.
   * Заполняется, если вопрос требует изображения (КТ-снимок, график и т.п.).
   * URL получается через getPictureUrl() из @/lib/accreditation-client.
   */
  picture?: string;
}

export interface CaseQuestion {
  question: string;
  options: string[];
  correctIndices: number[];
  explanation?: string;
}

export interface CaseTask {
  id: string;
  specialty: string;
  topic: string;
  scenario: string;
  questions: CaseQuestion[];
}

export interface ExamResult {
  total: number;
  correct: number;
  percentage: number;
  passed: boolean;
  duration: number;
  timestamp: number;
}

export interface BlockProgress {
  blockNumber: number;
  learned: number;
  total: number;
  mistakes: string[];
}

export interface AccreditationProgress {
  specialty: string;
  blocks: BlockProgress[];
  examResults: ExamResult[];
  mistakes: string[];
  favorites: string[];
  questionStats: Record<string, QuestionStats>;
  updatedAt: number;
}
