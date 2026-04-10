export interface DailyCaseOption {
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface DailyCaseStep {
  type: "complaint" | "history" | "labs" | "examination" | "differential" | "diagnosis" | "complication" | "treatment" | "monitoring" | "prognosis";
  title: string;
  description: string;
  options: DailyCaseOption[];
}

export interface DailyCase {
  id: string;
  date?: string;
  specialty: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  steps: DailyCaseStep[];
  outcome: {
    correct: string;
    wrong: string;
  };
}

export interface StepResult {
  isCorrect: boolean;
  selectedIndex: number;
  timeMs: number;
  points: number;
  timedOut: boolean;
}

export interface DailyCaseScoring {
  completedAt: string;
  totalPoints: number;
  maxPoints: number;
  steps: StepResult[];
}

export const STEP_TIME_LIMIT = 30_000; // 30 seconds
export const CORRECT_BASE = 300;       // fixed points for correct answer
export const SPEED_BONUS_MAX = 200;    // max bonus for fast answer
export const MAX_POINTS_PER_STEP = CORRECT_BASE + SPEED_BONUS_MAX; // 500

// Scoring: 300 base for correct + up to 200 speed bonus
// Speed bonus = linear: 200 at 0s, 0 at 30s
// Wrong or timeout = 0
export function calculateStepPoints(isCorrect: boolean, timeMs: number): number {
  if (!isCorrect) return 0;
  const speedFraction = Math.max(0, 1 - timeMs / STEP_TIME_LIMIT);
  const speedBonus = Math.round(SPEED_BONUS_MAX * speedFraction);
  return CORRECT_BASE + speedBonus;
}
