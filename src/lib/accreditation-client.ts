/**
 * Клиент доступа к банку тестовых вопросов аккредитации в Supabase.
 *
 * 301k вопросов в таблице `public.test_questions` и материализованном
 * представлении `public.test_specialty_counts`. Всё — плоская выборка
 * по (specialty_id, block_number, num).
 *
 * Дизайн:
 *  - Один поход за метаданными (список специальностей + счётчики) на mount.
 *    Кешируется в модульном `metaCache` на время жизни вкладки.
 *  - Блок (100 вопросов) тянется на клик по блоку — LRU на 8 последних.
 *  - Публичные URL картинок строим через supabase.storage.from('test-images').
 */

import { getSupabase } from "@/lib/supabase/client";
import type { TestQuestion } from "@/types/accreditation";

// Серверные строки Supabase.
export interface DbQuestion {
  id: string;
  section: string;
  specialty_id: string;
  specialty_name: string;
  block_number: number;
  num: number;
  question: string;
  options: string[];
  correct_idx: number;
  picture: string | null;
}

export interface SpecialtyMeta {
  section: string;
  specialty_id: string;
  specialty_name: string;
  total_questions: number;
  block_count: number;
  picture_count: number;
}

// In-memory кеши (per-tab).
let metaPromise: Promise<SpecialtyMeta[]> | null = null;
const blockCache = new Map<string, DbQuestion[]>(); // key = specialty_id|block
const blockCacheOrder: string[] = [];
const BLOCK_CACHE_MAX = 8;

/** Публичный URL картинки по её имени файла. */
export function getPictureUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  const sb = getSupabase();
  const { data } = sb.storage.from("test-images").getPublicUrl(filename);
  return data.publicUrl || null;
}

/** Конвертация row БД в клиентский TestQuestion. */
export function rowToTestQuestion(row: DbQuestion): TestQuestion {
  return {
    id: row.id,
    specialty: row.specialty_name,
    blockNumber: row.block_number,
    question: row.question,
    options: row.options,
    correctIndex: row.correct_idx,
    // picture прокидывается через расширенный тип (TestQuestion ещё не знает
    // о picture, но runtime-доступ возможен — QuestionView проверит через
    // (q as any).picture).
    ...(row.picture ? { picture: row.picture } : {}),
  } as TestQuestion;
}

/** Список всех специальностей с счётчиками (для навигационных экранов). */
export async function listSpecialties(): Promise<SpecialtyMeta[]> {
  if (metaPromise) return metaPromise;
  metaPromise = (async () => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("test_specialty_counts")
      .select("section, specialty_id, specialty_name, total_questions, block_count, picture_count");
    if (error) {
      console.error("listSpecialties error:", error);
      return [];
    }
    return (data as SpecialtyMeta[]) ?? [];
  })();
  return metaPromise;
}

/** Мета одной специальности (total, blocks, pictures). */
export async function getSpecialtyMeta(specialtyId: string): Promise<SpecialtyMeta | null> {
  const all = await listSpecialties();
  return all.find((s) => s.specialty_id === specialtyId) ?? null;
}

/** 100 (или меньше на хвосте) вопросов конкретного блока, от БД. */
export async function getBlockQuestions(
  specialtyId: string,
  blockNumber: number
): Promise<DbQuestion[]> {
  const key = `${specialtyId}|${blockNumber}`;
  const cached = blockCache.get(key);
  if (cached) return cached;

  const sb = getSupabase();
  const { data, error } = await sb
    .from("test_questions")
    .select("id, section, specialty_id, specialty_name, block_number, num, question, options, correct_idx, picture")
    .eq("specialty_id", specialtyId)
    .eq("block_number", blockNumber)
    .order("num");

  if (error) {
    console.error("getBlockQuestions error:", error);
    return [];
  }

  const rows = (data as DbQuestion[]) ?? [];
  blockCache.set(key, rows);
  blockCacheOrder.push(key);
  if (blockCacheOrder.length > BLOCK_CACHE_MAX) {
    const evict = blockCacheOrder.shift();
    if (evict) blockCache.delete(evict);
  }
  return rows;
}

/**
 * Вернуть список ошибок (mistakes) для специальности по набору id.
 * Используется режимом «Работа над ошибками».
 */
export async function getQuestionsByIds(ids: string[]): Promise<DbQuestion[]> {
  if (ids.length === 0) return [];
  const sb = getSupabase();
  const out: DbQuestion[] = [];
  // IN-list безопасно держать до ~1000; для больших списков разобьём.
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const { data, error } = await sb
      .from("test_questions")
      .select("id, section, specialty_id, specialty_name, block_number, num, question, options, correct_idx, picture")
      .in("id", chunk);
    if (error) {
      console.error("getQuestionsByIds error:", error);
      continue;
    }
    if (data) out.push(...(data as DbQuestion[]));
  }
  return out;
}

/**
 * Fisher–Yates перемешивание с детерминированным seed'ом (mulberry32).
 * Нужно, чтобы внутри блока порядок вопросов не совпадал с БД.
 */
export function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let t = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = r + Math.imul(r ^ (r >>> 7), 61 | r) ^ r;
    const rand = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(rand * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
