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
}

export interface CardAnswer {
  cardId: string;
  isCorrect: boolean;
  timestamp: number;
}
