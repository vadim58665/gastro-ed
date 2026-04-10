export type CardType =
  | "clinical_case"
  | "myth_or_fact"
  | "build_scheme"
  | "visual_quiz"
  | "blitz_test"
  | "fill_blank"
  | "red_flags"
  | "match_pairs"
  | "priority_rank"
  | "cause_chain"
  | "dose_calc";

/** 1=Студент, 2=Ординатор, 3=Врач, 4=Профессор, 5=Академик */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface BaseCard {
  id: string;
  type: CardType;
  specialty: string;
  topic: string;
  difficulty?: DifficultyLevel;
  sourceRef?: string;
  keyFact?: string;
  relatedCardIds?: string[];
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

export interface MatchPairsCard extends BaseCard {
  type: "match_pairs";
  title: string;
  instruction: string;
  pairs: { left: string; right: string; explanation: string }[];
}

export interface PriorityRankCard extends BaseCard {
  type: "priority_rank";
  context: string;
  question: string;
  items: { text: string; explanation: string }[];
  correctOrder: number[];
}

export interface CauseChainCard extends BaseCard {
  type: "cause_chain";
  title: string;
  steps: { text: string; isBlank: boolean }[];
  options: string[];
  explanation: string;
}

export interface DoseCalcCard extends BaseCard {
  type: "dose_calc";
  scenario: string;
  params: { label: string; value: string }[];
  question: string;
  correctAnswer: number;
  tolerance: number;
  unit: string;
  formula: string;
  explanation: string;
}

export type Card =
  | ClinicalCaseCard
  | MythOrFactCard
  | BuildSchemeCard
  | VisualQuizCard
  | BlitzTestCard
  | FillBlankCard
  | RedFlagsCard
  | MatchPairsCard
  | PriorityRankCard
  | CauseChainCard
  | DoseCalcCard;
