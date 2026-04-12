import type { UserProgress } from "@/types/user";

export const defaultProgress: UserProgress = {
  streakCurrent: 0,
  streakBest: 0,
  totalPoints: 0,
  cardsSeen: 0,
  cardsCorrect: 0,
  lastActiveDate: "",
  dailyGoal: 10,
  todayCardsSeen: 0,
  xp: 0,
  level: 1,
  unlockedAchievements: {},
  completedChallengeIds: [],
  cardHistory: {},
  dailyGoalStreak: 0,
  dailyGoalStreakBest: 0,
  perfectBlitzCount: 0,
  typeCounts: {},
  topicsAnswered: [],
  dailyCaseHistory: {},
};
