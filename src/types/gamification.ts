export type AchievementCategory =
  | "streak"
  | "volume"
  | "accuracy"
  | "mastery"
  | "speed"
  | "exploration";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export type AchievementCondition =
  | { type: "streak_days"; days: number }
  | { type: "cards_total"; count: number }
  | { type: "cards_correct"; count: number }
  | { type: "accuracy_percent"; percent: number; minCards: number }
  | { type: "perfect_blitz"; count: number }
  | { type: "all_types_answered" }
  | { type: "daily_goal_streak"; days: number }
  | { type: "cards_in_day"; count: number }
  | { type: "all_topics_answered" }
  | { type: "specialties_tried"; count: number };

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  condition: AchievementCondition;
  rarity: AchievementRarity;
  xpReward: number;
}

export interface LevelDef {
  level: number;
  xpRequired: number;
  color: string;
}

export interface RankDef {
  id: string;
  title: string;
  minAccuracy: number;
  minCards: number;
  color: string;
}

export type ChallengeCondition =
  | { type: "answer_cards"; count: number }
  | { type: "answer_correct"; count: number }
  | { type: "answer_topic"; topic: string; count: number }
  | { type: "answer_type"; cardType: string; count: number }
  | { type: "maintain_accuracy"; percent: number; minCards: number }
  | { type: "complete_review"; count: number };

export interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  type: "daily" | "weekly";
  condition: ChallengeCondition;
  xpReward: number;
}

export interface TopicMastery {
  topic: string;
  totalCards: number;
  answeredCards: number;
  correctCards: number;
  masteredCards: number;
  masteryPercent: number;
}

export interface GamificationEvent {
  newAchievements: AchievementDef[];
  levelUp: boolean;
  previousLevel: number;
  currentLevel: number;
  xpGained: number;
  challengeCompleted: ChallengeDef | null;
  dailyGoalReached: boolean;
}
