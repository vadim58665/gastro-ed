import type { TestQuestion } from "@/types/accreditation";

/**
 * Accreditation questions have only `blockNumber` and `specialty` — no
 * explicit `topic` field. To still offer a «По темам» grouping for
 * mistakes, we extract pseudo-topics from question text: tokenise each
 * question, filter stopwords, stem, and pick the most frequent medical
 * root across the corpus as the "topic seed" for each question.
 *
 * Result: 5–15 clusters of related mistakes with human-readable topic
 * labels. Good enough for navigation; not perfect NLP.
 */

// Русские стопслова + общие для медицинских тестов формулировки.
// Ранее в списке был набор коротких частотных слов, но темы всё равно
// получались типа «Болезни», «Следует», «Включает», «Методом» — потому
// что лемматизация отсутствовала. Расширяем список + ниже добавляем
// простой стеммер.
const STOPWORDS = new Set<string>([
  // служебные
  "при", "для", "как", "что", "это", "уже", "если", "или", "когда",
  "чтобы", "также", "чаще", "наиболее", "менее", "более", "самым",
  "самое", "самого", "основным", "основной", "основного", "главным",
  "главной", "главного", "является", "являются", "используют",
  "назначают", "относят", "относится", "относятся", "характеризуется",
  "характерно", "характерным", "характерной", "типичным", "типичной",
  "типичного", "показана", "показано", "показан", "проводят",
  "проводится", "выбор", "выбора", "препаратом", "препарата",
  "линии", "первой", "второй", "третьей", "возникает", "возникают",
  "определяется", "определяют", "может", "должен", "должна", "должны",
  "будет", "будут", "стадии", "стадия", "форма", "формы", "степени",
  "степень", "признаком", "признаков", "признаки", "признак",
  "развитии", "развитие", "которая", "который", "которые", "которой",
  "которого", "этой", "этого", "этих", "этим", "наблюдается",
  "наблюдают", "отмечается", "отмечают", "тактика", "тактики",
  "оценка", "оценки", "результат", "результате", "случае", "случаев",
  "после", "перед", "между", "около", "уровне", "уровень", "уровня",
  "одной", "одних", "один", "одно", "одна", "двух", "трех",
  "обычно", "часто", "редко", "иногда", "всегда", "никогда",
  "зависит", "влияет", "обусловлен", "обусловлено",
  // предикаты и глаголы, которые просачиваются под видом «тем»
  "следует", "включает", "включающее", "включающая", "методом",
  "метода", "способом", "способ", "путем", "путём", "выбрать",
  "выбрано", "применяют", "применяется", "применять", "применения",
  "выполняют", "выполняется", "выполнять", "проведение", "проведения",
  "наличие", "наличии", "требует", "требуется", "требуются",
  "следующий", "следующая", "следующее", "следующие",
  "следующих", "следующим", "необходимо", "необходимый", "нужно",
  "возможно", "возможны", "существует", "существуют",
  // слишком общие категории (без тематики)
  "болезни", "болезнь", "болезней", "болезнях", "болезнью",
  "заболевание", "заболевания", "заболеванию", "заболеванием",
  "синдром", "синдрома", "синдромов", "синдрому", "синдромом",
  "лечение", "лечения", "лечению", "лечением", "лечении",
  "диагностика", "диагностики", "диагностике", "диагностикой",
  "терапия", "терапии", "терапией",
  "хронический", "хроническая", "хроническое", "хронического",
  "хроническим", "хронической", "острый", "острая", "острое",
  "острого", "острым", "острой",
  "первичный", "первичная", "первичное", "первичного", "первичной",
  "вторичный", "вторичная",
  "пациент", "пациента", "пациенту", "пациентов", "пациентам",
  "пациентами", "больной", "больного", "больному", "больных", "больными",
  "характерна", "характерная", "характерное", "характерной",
  "недостаточность", "недостаточности", "недостаточностью",
  "повышение", "повышения", "повышению", "повышенный", "повышенная",
  "повышенное", "снижение", "снижения", "снижению", "сниженный",
  "сниженная", "сниженное",
  "назначение", "назначения", "назначению", "проявление", "проявления",
  "проявлением", "проявлению", "применение", "применения", "применению",
]);

/**
 * Очень простой русский «стеммер» — обрезает типичные окончания.
 * Не идеальный, но достаточно, чтобы «печени», «печеночной» и «печень»
 * сошлись в общий кластер.
 */
const SUFFIXES = [
  // падежные окончания существительных / прилагательных
  "ами", "ями", "ого", "ему", "ыми", "ими", "ого", "ему",
  "ой", "ей", "ом", "ем", "ах", "ях", "ов", "ев", "ий", "ий",
  "ая", "яя", "ое", "ее", "ые", "ие", "ую", "юю",
  "ым", "им", "ых", "их",
  "ия", "ие", "ию", "ии", "иям", "иями", "иях",
  // глагольные / причастные
  "ется", "ются", "ится", "ятся", "ающ", "ующ",
  // мн. и падежи коротких слов
  "ам", "ям", "ом", "ем", "ой", "ей", "ы", "и", "а", "я", "о", "е", "у", "ю",
];

function stem(word: string): string {
  // Самые длинные окончания пробуем первыми, чтобы «печеночной» → «печен»,
  // а не «печеночн» через "ой".
  const sorted = [...SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suf of sorted) {
    if (word.length - suf.length >= 4 && word.endsWith(suf)) {
      return word.slice(0, -suf.length);
    }
  }
  return word;
}

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
    .filter((w) => w.length >= 5 && !STOPWORDS.has(w) && !/^\d/.test(w))
    .map(stem)
    .filter((w) => w.length >= 4);
}

export interface TopicCluster {
  topic: string;        // ключевое слово-стебель
  label: string;        // то что показываем пользователю (Capitalized)
  questionIds: string[];
  count: number;
}

/**
 * Кластеризует произвольное множество вопросов по ключевым словам.
 * Алгоритм: для каждого вопроса выбираем seed = самое частое значимое
 * слово (после стемминга), встречающееся в корпусе. Вопросы с
 * одинаковым seed объединяются.
 *
 * Используется на /tests (вкладка «Темы») и /accreditation/mistakes.
 */
export function clusterQuestionsByTopic(
  questions: TestQuestion[],
  opts: { maxClusters?: number; minClusterSize?: number } = {}
): TopicCluster[] {
  const maxClusters = opts.maxClusters ?? 20;
  // Клетки меньше 4 вопросов, как правило, не дают полезной тренировки —
  // лучше, если пользователь пойдёт в блок целиком.
  const minClusterSize = opts.minClusterSize ?? 4;

  if (questions.length === 0) return [];

  // Считаем частоту слов в корпусе.
  const freq = new Map<string, number>();
  // Для каждого стебля запоминаем оригиналы — выбираем самый частый
  // оригинал как display label, чтобы «печень» выиграло у «печенью».
  const originalByStem = new Map<string, Map<string, number>>();
  const questionStems = new Map<string, string[]>();

  for (const q of questions) {
    const words = q.question
      .split(/[\s,.;:!?()«»"'—–-]+/u)
      .map(normalise)
      .filter((w) => w.length >= 5 && !STOPWORDS.has(w) && !/^\d/.test(w));
    const stems = words.map(stem).filter((w) => w.length >= 4);
    questionStems.set(q.id, stems);

    const seenInQuestion = new Set<string>();
    for (let i = 0; i < stems.length; i++) {
      const s = stems[i];
      if (seenInQuestion.has(s)) continue;
      seenInQuestion.add(s);
      freq.set(s, (freq.get(s) ?? 0) + 1);
      const originals = originalByStem.get(s) ?? new Map<string, number>();
      const orig = words[i];
      if (orig) originals.set(orig, (originals.get(orig) ?? 0) + 1);
      originalByStem.set(s, originals);
    }
  }

  // Для каждого вопроса выбираем seed = самое частое значимое слово,
  // встречающееся хотя бы в 3 вопросах (меньше — слишком редкое, чтобы
  // быть темой). Если таких нет — вопрос не попадает ни в один кластер.
  const seedByQuestion = new Map<string, string>();
  for (const q of questions) {
    const stems = questionStems.get(q.id) ?? [];
    let bestSeed = "";
    let bestScore = 0;
    for (const s of stems) {
      const f = freq.get(s) ?? 0;
      if (f < 3) continue;
      const score = f * 10 + s.length;
      if (score > bestScore) {
        bestScore = score;
        bestSeed = s;
      }
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
    // Подбираем самый частый оригинал как человекочитаемую метку —
    // «печень» смотрится лучше, чем «печен».
    const originals = originalByStem.get(seed);
    let label = seed;
    if (originals) {
      let bestOrig = seed;
      let bestCount = 0;
      for (const [orig, cnt] of originals) {
        if (cnt > bestCount) {
          bestCount = cnt;
          bestOrig = orig;
        }
      }
      label = bestOrig;
    }
    result.push({
      topic: seed,
      label: capitalize(label),
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
    // В режиме ошибок кластер от 2 полезен — это всё же «больные места».
    minClusterSize: opts.minClusterSize ?? 2,
  });
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
