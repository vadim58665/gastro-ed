// MedMind AI companion types

export type EngagementLevel = "light" | "medium" | "maximum";

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "trial"
  | "past_due"
  | "cancelled";

export type SubscriptionPlan = "free" | "pro";

export type SubscriptionTier =
  | "free"
  | "feed_helper"      // Помощник (лента)  - 490₽
  | "accred_basic"      // Базовый  - 1190₽
  | "accred_mentor"     // Наставник  - 2690₽
  | "accred_tutor"      // Тьютор  - 5890₽
  | "accred_extreme";   // Экстремальный  - 9990₽

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  section: "feed" | "accreditation";
  priceRub: number;
  blocksPerDay: number;
  chatPerDay: number;
  explanationsPerDay: number;
  mnemonicsPerDay: number;
  imagesPerDay: number;
  features: string[];
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  free: {
    id: "free",
    name: "Бесплатный",
    section: "feed",
    priceRub: 0,
    blocksPerDay: 0,
    chatPerDay: 0,
    explanationsPerDay: 0,
    mnemonicsPerDay: 0,
    imagesPerDay: 0,
    features: ["Лента карточек", "Базовая статистика"],
  },
  feed_helper: {
    id: "feed_helper",
    name: "Помощник",
    section: "feed",
    priceRub: 490,
    blocksPerDay: 0,
    chatPerDay: 10,
    explanationsPerDay: 7,
    mnemonicsPerDay: 5,
    imagesPerDay: 1,
    features: [
      "AI разберёт 7 сложных вопросов в день  - покажет почему ответ правильный",
      "15 наводящих подсказок  - не даёт ответ, а помогает додуматься самому",
      "5 стишков и мнемоник  - запомните материал надолго",
      "10 вопросов MedMind в свободной форме на любую тему",
      "1 картинка-ассоциация для визуального запоминания",
      "Персонаж-доктор реагирует на ваши ответы",
      "Анализ: какие темы западают  - чтобы знать что повторить",
    ],
  },
  accred_basic: {
    id: "accred_basic",
    name: "Базовый",
    section: "accreditation",
    priceRub: 1190,
    blocksPerDay: 1,
    chatPerDay: 30,
    explanationsPerDay: 7,
    mnemonicsPerDay: 5,
    imagesPerDay: 1,
    features: [
      "100 тестовых вопросов в день  - один полный блок аккредитации",
      "AI разберёт 7 вопросов, где вы ошиблись  - объяснит правильный ход мысли",
      "5 стишков и мнемоник  - AI придумает рифму или историю для запоминания",
      "К каждому вопросу можно попросить наводящую подсказку",
      "30 вопросов MedMind  - спросите что угодно по медицине",
      "1 картинка-ассоциация для визуального запоминания",
      "Сводка после блока  - сколько правильных, где пробелы",
      "Тренировка, зачёт, экзамен, спринт и ещё 3 режима",
      "Повторная проработка вопросов, где ошиблись",
    ],
  },
  accred_mentor: {
    id: "accred_mentor",
    name: "Наставник",
    section: "accreditation",
    priceRub: 2690,
    blocksPerDay: 2,
    chatPerDay: 50,
    explanationsPerDay: 20,
    mnemonicsPerDay: 20,
    imagesPerDay: 4,
    features: [
      "200 вопросов в день  - два полных блока аккредитации",
      "AI разберёт до 20 сложных вопросов  - подробное объяснение каждого",
      "20 мнемоник и стишков  - AI поможет запомнить трудный материал",
      "Наводящая подсказка к каждому вопросу блока",
      "50 вопросов MedMind  - свободный диалог на медицинские темы",
      "4 картинки-ассоциации для визуального запоминания",
      "Разбор после каждого блока  - анализ ошибок, слабые места",
      "Все 7 режимов тестирования",
      "Проработка ошибок с помощью AI",
      "Сравнительные таблицы: Крон vs НЯК, ГЭРБ vs ЯБ и т.д.",
    ],
  },
  accred_tutor: {
    id: "accred_tutor",
    name: "Тьютор",
    section: "accreditation",
    priceRub: 5890,
    blocksPerDay: 4,
    chatPerDay: 100,
    explanationsPerDay: 48,
    mnemonicsPerDay: 48,
    imagesPerDay: 12,
    features: [
      "400 вопросов в день  - четыре блока аккредитации",
      "AI разберёт до 48 вопросов  - объяснит каждую ошибку",
      "48 мнемоник и стишков  - максимум помощи для запоминания",
      "Наводящая подсказка к каждому вопросу",
      "100 вопросов MedMind  - полноценный диалог с AI-наставником",
      "12 картинок-ассоциаций для визуального запоминания",
      "Полный AI-разбор: классификация ошибок, рекомендации",
      "Все 7 режимов тестирования",
      "Проработка ошибок с помощью AI",
      "Сравнительные таблицы по схожим диагнозам",
      "Прогноз: AI оценит ваши шансы на аккредитации",
    ],
  },
  accred_extreme: {
    id: "accred_extreme",
    name: "Экстремальный",
    section: "accreditation",
    priceRub: 9990,
    blocksPerDay: 6,
    chatPerDay: 150,
    explanationsPerDay: 90,
    mnemonicsPerDay: 90,
    imagesPerDay: 30,
    features: [
      "600 вопросов в день  - шесть блоков, максимальная подготовка",
      "AI разберёт до 90 вопросов  - разбор практически каждой ошибки",
      "90 мнемоник и стишков  - AI создаст всё, что нужно для запоминания",
      "Наводящая подсказка к каждому вопросу",
      "150 вопросов MedMind  - неограниченный диалог с AI",
      "30 картинок-ассоциаций для запоминания",
      "Полный AI-разбор: классификация ошибок, рекомендации",
      "Все 7 режимов тестирования",
      "Проработка ошибок с помощью AI",
      "Сравнительные таблицы по схожим диагнозам",
      "Прогноз результата аккредитации",
      "Еженедельный отчёт: прогресс, рост по темам, что подтянуть",
      "Персональный план на каждый день до экзамена",
    ],
  },
};

export interface SubscriptionState {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  tier: SubscriptionTier;
  engagementLevel: EngagementLevel;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
}

export type ContentType =
  | "mnemonic_acronym"
  | "mnemonic_story"
  | "mnemonic_rhyme"
  | "memory_poem"
  | "flashcard"
  | "study_image"
  | "explanation"
  | "tip";

export interface GeneratedContent {
  id: string;
  cardId?: string;
  topic: string;
  contentType: ContentType;
  contentRu: string;
  imageUrl?: string;
  sourceRefs?: string[];
  createdAt: string;
}

export interface TopicAnalysis {
  topic: string;
  specialty: string;
  cardsAttempted: number;
  cardsCorrect: number;
  errorRate: number;
  masteryScore: number;
  isWeak: boolean;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

export interface StudySession {
  weakCards: string[];
  reviewCards: string[];
  newCards: string[];
  focusTopic: string;
  estimatedMinutes: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  contextTopic?: string;
  createdAt: string;
}

export type NudgeType =
  | "overdue_review"
  | "weak_topic"
  | "streak_risk"
  | "daily_session"
  | "new_content"
  | "milestone";

export interface Nudge {
  id: string;
  type: NudgeType;
  titleRu: string;
  bodyRu: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaymentConfirmation {
  paymentUrl: string;
  paymentId: string;
}
