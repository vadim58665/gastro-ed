import type { AchievementDef } from "@/types/gamification";

export const achievements: AchievementDef[] = [
  // --- Streak ---
  {
    id: "streak-3",
    title: "Три дня",
    description: "3 дня подряд без перерыва",
    category: "streak",
    condition: { type: "streak_days", days: 3 },
    rarity: "common",
    xpReward: 50,
  },
  {
    id: "streak-7",
    title: "Неделя подряд",
    description: "7 дней без перерыва",
    category: "streak",
    condition: { type: "streak_days", days: 7 },
    rarity: "rare",
    xpReward: 150,
  },
  {
    id: "streak-30",
    title: "Месяц дисциплины",
    description: "30 дней без перерыва",
    category: "streak",
    condition: { type: "streak_days", days: 30 },
    rarity: "epic",
    xpReward: 500,
  },
  {
    id: "streak-100",
    title: "Стодневка",
    description: "100 дней без перерыва",
    category: "streak",
    condition: { type: "streak_days", days: 100 },
    rarity: "legendary",
    xpReward: 2000,
  },

  // --- Volume ---
  {
    id: "cards-50",
    title: "Первый шаг",
    description: "Ответить на 50 карточек",
    category: "volume",
    condition: { type: "cards_total", count: 50 },
    rarity: "common",
    xpReward: 50,
  },
  {
    id: "cards-100",
    title: "Сотня",
    description: "Ответить на 100 карточек",
    category: "volume",
    condition: { type: "cards_total", count: 100 },
    rarity: "common",
    xpReward: 100,
  },
  {
    id: "cards-500",
    title: "Мастер",
    description: "Ответить на 500 карточек",
    category: "volume",
    condition: { type: "cards_total", count: 500 },
    rarity: "rare",
    xpReward: 300,
  },
  {
    id: "cards-1000",
    title: "Гуру",
    description: "Ответить на 1000 карточек",
    category: "volume",
    condition: { type: "cards_total", count: 1000 },
    rarity: "epic",
    xpReward: 1000,
  },

  // --- Accuracy ---
  {
    id: "accuracy-80",
    title: "Точный глаз",
    description: "Точность 80%+ на 50+ карточках",
    category: "accuracy",
    condition: { type: "accuracy_percent", percent: 80, minCards: 50 },
    rarity: "rare",
    xpReward: 200,
  },
  {
    id: "accuracy-95",
    title: "Безупречность",
    description: "Точность 95%+ на 100+ карточках",
    category: "accuracy",
    condition: { type: "accuracy_percent", percent: 95, minCards: 100 },
    rarity: "legendary",
    xpReward: 1500,
  },

  // --- Speed ---
  {
    id: "blitz-1",
    title: "Молния",
    description: "Идеальный результат в блиц-тесте",
    category: "speed",
    condition: { type: "perfect_blitz", count: 1 },
    rarity: "common",
    xpReward: 100,
  },
  {
    id: "blitz-5",
    title: "Blitz-мастер",
    description: "5 идеальных блиц-тестов",
    category: "speed",
    condition: { type: "perfect_blitz", count: 5 },
    rarity: "rare",
    xpReward: 300,
  },

  // --- Exploration ---
  {
    id: "all-types",
    title: "Универсал",
    description: "Ответить хотя бы на 1 карточку каждого типа",
    category: "exploration",
    condition: { type: "all_types_answered" },
    rarity: "common",
    xpReward: 100,
  },
  {
    id: "all-topics",
    title: "Энциклопедист",
    description: "Ответить на карточки из всех тем",
    category: "exploration",
    condition: { type: "all_topics_answered" },
    rarity: "epic",
    xpReward: 500,
  },
  {
    id: "specialties-3",
    title: "Мультипрофиль",
    description: "Изучить 3 разные специальности",
    category: "exploration",
    condition: { type: "specialties_tried", count: 3 },
    rarity: "rare",
    xpReward: 200,
  },

  // --- Daily goal ---
  {
    id: "goal-streak-7",
    title: "Неделя целей",
    description: "Выполнить дневную цель 7 дней подряд",
    category: "streak",
    condition: { type: "daily_goal_streak", days: 7 },
    rarity: "rare",
    xpReward: 200,
  },
  {
    id: "marathon-50",
    title: "Марафонец",
    description: "50 карточек за один день",
    category: "volume",
    condition: { type: "cards_in_day", count: 50 },
    rarity: "rare",
    xpReward: 300,
  },

];
