export interface CardHistoryEntry {
  attempts: number;
  correct: number;
  lastSeen: string;
  consecutiveFails: number;
}

export interface UserProgress {
  streakCurrent: number;
  streakBest: number;
  totalPoints: number;
  cardsSeen: number;
  cardsCorrect: number;
  lastActiveDate: string;
  dailyGoal: number;
  todayCardsSeen: number;
  updatedAt?: string;
  xp: number;
  level: number;
  unlockedAchievements: Record<string, string>;
  completedChallengeIds: string[];
  cardHistory: Record<string, CardHistoryEntry>;
  dailyGoalStreak: number;
  dailyGoalStreakBest: number;
  perfectBlitzCount: number;
  typeCounts: Record<string, number>;
  topicsAnswered: string[];
}

export interface CardAnswer {
  cardId: string;
  isCorrect: boolean;
  timestamp: number;
}
