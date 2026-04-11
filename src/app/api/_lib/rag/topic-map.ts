/**
 * Static mapping from topic names to wiki page paths.
 * Deterministic, zero-cost, fast. Updated as wiki grows.
 */

const TOPIC_TO_WIKI: Record<string, string[]> = {
  // Gastroenterology
  "H. pylori": ["wiki/medical/entities/h-pylori.md"],
  "Хеликобактер": ["wiki/medical/entities/h-pylori.md"],
  "Эрадикация": [
    "wiki/medical/entities/h-pylori.md",
    "wiki/medical/concepts/eradication-therapy.md",
  ],
  "ГЭРБ": ["wiki/medical/entities/gerd.md"],
  "Панкреатит": ["wiki/medical/entities/pancreatitis.md"],
  "Язвенная болезнь": ["wiki/medical/entities/peptic-ulcer.md"],
  "СРК": ["wiki/medical/entities/ibs.md"],
  "Болезнь Крона": ["wiki/medical/entities/crohn-disease.md"],
  "НЯК": ["wiki/medical/entities/ulcerative-colitis.md"],
  "Цирроз": ["wiki/medical/entities/cirrhosis.md"],
  "Гепатит": ["wiki/medical/entities/hepatitis.md"],

  // Cardiology
  "ИБС": ["wiki/medical/entities/ihd.md"],
  "Артериальная гипертензия": ["wiki/medical/entities/hypertension.md"],
  "ХСН": ["wiki/medical/entities/heart-failure.md"],
  "Фибрилляция предсердий": ["wiki/medical/entities/atrial-fibrillation.md"],
  "ОКС": ["wiki/medical/entities/acs.md"],

  // Neurology
  "Инсульт": ["wiki/medical/entities/stroke.md"],
  "Эпилепсия": ["wiki/medical/entities/epilepsy.md"],
  "Болезнь Паркинсона": ["wiki/medical/entities/parkinson.md"],
  "Рассеянный склероз": ["wiki/medical/entities/ms.md"],
  "Мигрень": ["wiki/medical/entities/migraine.md"],

  // Endocrinology
  "Сахарный диабет": ["wiki/medical/entities/diabetes.md"],
  "Гипотиреоз": ["wiki/medical/entities/hypothyroidism.md"],
  "Ожирение": ["wiki/medical/entities/obesity.md"],

  // Pulmonology
  "Бронхиальная астма": ["wiki/medical/entities/asthma.md"],
  "ХОБЛ": ["wiki/medical/entities/copd.md"],
  "Пневмония": ["wiki/medical/entities/pneumonia.md"],
};

/**
 * Find wiki pages for a given topic/query.
 * Uses exact match and substring matching.
 */
export function getTopicWikiPages(query: string): string[] {
  const normalized = query.toLowerCase().trim();

  // Exact match
  for (const [topic, paths] of Object.entries(TOPIC_TO_WIKI)) {
    if (topic.toLowerCase() === normalized) {
      return paths;
    }
  }

  // Substring match
  const matches: string[] = [];
  for (const [topic, paths] of Object.entries(TOPIC_TO_WIKI)) {
    if (
      normalized.includes(topic.toLowerCase()) ||
      topic.toLowerCase().includes(normalized)
    ) {
      matches.push(...paths);
    }
  }

  return [...new Set(matches)];
}
