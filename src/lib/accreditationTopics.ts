import type { TestQuestion } from "@/types/accreditation";

/**
 * Accreditation questions have only `blockNumber` and `specialty` — no
 * explicit `topic` field. To still offer a «По темам» grouping for
 * mistakes, we extract pseudo-topics from question text: tokenise each
 * question, filter stopwords, and pick the most frequent keyword across
 * all mistakes as the "topic seed" for each question.
 *
 * Result: 5–15 clusters of related mistakes with human-readable topic
 * labels. Good enough for navigation; not perfect NLP.
 */

// Русские стопслова + общие для медицинских тестов формулировки.
const STOPWORDS = new Set<string>([
  "при",
  "для",
  "как",
  "что",
  "это",
  "уже",
  "если",
  "или",
  "когда",
  "чтобы",
  "также",
  "чаще",
  "наиболее",
  "менее",
  "более",
  "самым",
  "самое",
  "самое",
  "основным",
  "основной",
  "основной",
  "главным",
  "главной",
  "является",
  "являются",
  "используют",
  "назначают",
  "относят",
  "относится",
  "относятся",
  "характеризуется",
  "характерным",
  "типичным",
  "типичной",
  "показана",
  "показано",
  "показан",
  "проводят",
  "проводится",
  "выбор",
  "выбора",
  "препаратом",
  "препарата",
  "линии",
  "первой",
  "второй",
  "третьей",
  "возникает",
  "возникают",
  "определяется",
  "определяют",
  "может",
  "должен",
  "должна",
  "должны",
  "будет",
  "будут",
  "стадии",
  "стадия",
  "форма",
  "формы",
  "степени",
  "степень",
  "признаком",
  "признаков",
  "признаки",
  "признак",
  "развитии",
  "развитие",
  "которая",
  "который",
  "которые",
  "которой",
  "которого",
  "этой",
  "этого",
  "этих",
  "этим",
  "наблюдается",
  "наблюдают",
  "отмечается",
  "отмечают",
  "тактика",
  "тактики",
  "оценка",
  "оценки",
  "результат",
  "результате",
  "случае",
  "случаев",
  "случае",
  "после",
  "перед",
  "между",
  "около",
  "уровне",
  "уровень",
  "уровня",
  "одной",
  "одной",
  "одних",
  "один",
  "одно",
  "одна",
  "двух",
  "трех",
  "обычно",
  "часто",
  "редко",
  "иногда",
  "всегда",
  "никогда",
  "зависит",
  "влияет",
  "обусловлен",
  "обусловлено",
]);

function normalise(word: string): string {
  // Приводим слово к нижнему регистру и убираем пунктуацию по краям.
  return word
    .toLowerCase()
    .replace(/[^а-яёa-z0-9-]+/gi, "")
    .trim();
}

function tokenise(text: string): string[] {
  return text
    .split(/[\s,.;:!?()«»"'—–-]+/u)
    .map(normalise)
    .filter((w) => w.length >= 5 && !STOPWORDS.has(w) && !/^\d/.test(w));
}

export interface TopicCluster {
  topic: string;        // ключевое слово-ярлык (в именительном падеже-ish)
  label: string;        // то что показываем пользователю (Capitalized)
  questionIds: string[];
  count: number;
}

/**
 * Кластеризует произвольное множество вопросов по ключевым словам.
 * Алгоритм: для каждого вопроса выбираем seed = самое частое значимое
 * слово, встречающееся в корпусе. Вопросы с одинаковым seed объединяются.
 *
 * Используется на /tests (вкладка «Темы») и /accreditation/mistakes.
 */
export function clusterQuestionsByTopic(
  questions: TestQuestion[],
  opts: { maxClusters?: number; minClusterSize?: number } = {}
): TopicCluster[] {
  const maxClusters = opts.maxClusters ?? 20;
  const minClusterSize = opts.minClusterSize ?? 2;

  if (questions.length === 0) return [];

  // Считаем частоту слов в корпусе.
  const freq = new Map<string, number>();
  const questionWords = new Map<string, string[]>();

  for (const q of questions) {
    const words = tokenise(q.question);
    questionWords.set(q.id, words);
    const uniq = new Set(words);
    for (const w of uniq) freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  // Для каждого вопроса выбираем seed = самое частое значимое слово,
  // встречающееся хотя бы в 2 вопросах. Если таких нет — fallback
  // на самое длинное слово в вопросе.
  const seedByQuestion = new Map<string, string>();
  for (const q of questions) {
    const words = questionWords.get(q.id) ?? [];
    let bestSeed = "";
    let bestScore = 0;
    for (const w of words) {
      const f = freq.get(w) ?? 0;
      if (f < 2) continue;
      const score = f * 10 + w.length;
      if (score > bestScore) {
        bestScore = score;
        bestSeed = w;
      }
    }
    if (!bestSeed) {
      bestSeed = words.reduce(
        (acc, w) => (w.length > acc.length ? w : acc),
        ""
      );
    }
    if (bestSeed) seedByQuestion.set(q.id, bestSeed);
  }

  // Группируем
  const clusters = new Map<string, string[]>();
  for (const [qId, seed] of seedByQuestion) {
    const existing = clusters.get(seed) ?? [];
    existing.push(qId);
    clusters.set(seed, existing);
  }

  const result: TopicCluster[] = [];
  for (const [seed, ids] of clusters) {
    if (ids.length < minClusterSize) continue;
    result.push({
      topic: seed,
      label: capitalize(seed),
      questionIds: ids,
      count: ids.length,
    });
  }
  result.sort((a, b) => b.count - a.count);
  return result.slice(0, maxClusters);
}

/**
 * Обёртка для совместимости: кластеризует ТОЛЬКО ошибки из списка
 * вопросов. Вызывается из /accreditation/mistakes.
 */
export function clusterMistakesByTopic(
  mistakeIds: string[],
  questions: TestQuestion[],
  opts: { maxClusters?: number; minClusterSize?: number } = {}
): TopicCluster[] {
  const mistakeSet = new Set(mistakeIds);
  const mistakeQuestions = questions.filter((q) => mistakeSet.has(q.id));
  return clusterQuestionsByTopic(mistakeQuestions, {
    maxClusters: opts.maxClusters ?? 12,
    minClusterSize: opts.minClusterSize ?? 1,
  });
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
