export type CardType =
  | "clinical_case"
  | "myth_or_fact"
  | "build_scheme"
  | "visual_quiz"
  | "blitz_test"
  | "fill_blank"
  | "red_flags";

export interface BaseCard {
  id: string;
  type: CardType;
  topic: string;
  sourceRef?: string;
}

export interface ClinicalCaseCard extends BaseCard {
  type: "clinical_case";
  scenario: string;
  question: string;
  options: { text: string; isCorrect: boolean; explanation: string }[];
}

export interface MythOrFactCard extends BaseCard {
  type: "myth_or_fact";
  statement: string;
  isMyth: boolean;
  explanation: string;
}

export interface BuildSchemeCard extends BaseCard {
  type: "build_scheme";
  title: string;
  instruction: string;
  components: { text: string; isCorrect: boolean }[];
  correctOrder?: number[];
  successMessage: string;
}

export interface VisualQuizCard extends BaseCard {
  type: "visual_quiz";
  imageUrl: string;
  question: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface BlitzQuestion {
  question: string;
  correctAnswer: boolean;
  explanation: string;
}

export interface BlitzTestCard extends BaseCard {
  type: "blitz_test";
  title: string;
  timeLimit: number;
  questions: BlitzQuestion[];
}

export interface FillBlankCard extends BaseCard {
  type: "fill_blank";
  textBefore: string;
  textAfter: string;
  correctAnswer: string;
  acceptableAnswers: string[];
  hint?: string;
  explanation: string;
}

export interface RedFlagsCard extends BaseCard {
  type: "red_flags";
  scenario: string;
  options: { text: string; isDanger: boolean }[];
  explanation: string;
}

export type Card =
  | ClinicalCaseCard
  | MythOrFactCard
  | BuildSchemeCard
  | VisualQuizCard
  | BlitzTestCard
  | FillBlankCard
  | RedFlagsCard;
