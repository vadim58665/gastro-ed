#!/usr/bin/env npx tsx
/**
 * Загружает ~301k вопросов из `тесты/секции/<секция>/<специальность>/block_*.json`
 * в таблицу `public.test_questions` Supabase. Батчами по 500 строк через upsert
 * по `id` — идемпотентно, можно перезапускать.
 *
 * Использует SUPABASE_SERVICE_ROLE_KEY (RLS bypass).
 *
 * Usage:
 *   npx tsx scripts/import-test-questions.ts                    — импорт всего
 *   npx tsx scripts/import-test-questions.ts --section ПСА_ординатура
 *   npx tsx scripts/import-test-questions.ts --specialty Рентгенология
 *   npx tsx scripts/import-test-questions.ts --resume           — пропустить уже загруженное
 */

import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY должны быть в .env.local");
  process.exit(1);
}

const sb = createClient<any, any, any>(SUPABASE_URL, SERVICE_KEY);

const TESTS_ROOT = path.resolve(process.cwd(), "тесты/секции");
const BATCH_SIZE = 500;

interface BlockQuestion {
  num: number;
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  picture?: string;
}

interface Row {
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

const SECTION_SLUG: Record<string, string> = {
  "ПСА_ординатура":                              "psa-ordinatura",
  "ПСА_немедицинское":                           "psa-nemeditsinskoe",
  "Первичная_аккредитация_специалитет":          "pa-spetsialitet",
  "Высшее_образование_профпереподготовка":       "vysshee-pp",
  "Первичная_аккредитация_бакалавриат":          "pa-bakalavriat",
  "Первичная_аккредитация_магистратура":         "pa-magistratura",
};

/** Транслитерация русского названия специальности в стабильный ASCII slug. */
function makeSpecialtyId(specialtyName: string, sectionName: string): string {
  const sectionPrefix = SECTION_SLUG[sectionName] ?? transliterate(sectionName)
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = transliterate(specialtyName)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${sectionPrefix}/${slug}`;
}

function transliterate(s: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya",
  };
  return s
    .toLowerCase()
    .split("")
    .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
    .join("");
}

interface Opts {
  sectionFilter: string | null;
  specialtyFilter: string | null;
  resume: boolean;
}

function parseArgs(): Opts {
  const args = process.argv.slice(2);
  const opts: Opts = { sectionFilter: null, specialtyFilter: null, resume: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--section") opts.sectionFilter = args[++i];
    else if (args[i] === "--specialty") opts.specialtyFilter = args[++i];
    else if (args[i] === "--resume") opts.resume = true;
  }
  return opts;
}

async function upsertBatch(batch: Row[]): Promise<void> {
  const { error } = await sb
    .from("test_questions")
    .upsert(batch, { onConflict: "id" });
  if (error) {
    console.error("ERROR in batch upsert:", error.message);
    throw error;
  }
}

async function main() {
  const opts = parseArgs();
  console.log("Импорт тестовых вопросов в Supabase");
  console.log("  root:", TESTS_ROOT);
  if (opts.sectionFilter) console.log("  --section:", opts.sectionFilter);
  if (opts.specialtyFilter) console.log("  --specialty:", opts.specialtyFilter);
  if (opts.resume) console.log("  --resume (пропускаем уже загруженное)");

  // Список загруженных id для --resume
  let existingIds = new Set<string>();
  if (opts.resume) {
    console.log("Загружаю список уже существующих id...");
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await sb
        .from("test_questions")
        .select("id")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data) existingIds.add(row.id);
      if (data.length < pageSize) break;
      from += pageSize;
      if (from % 10000 === 0) process.stdout.write(`  загружено ${existingIds.size}\r`);
    }
    console.log(`  в Supabase уже ${existingIds.size} вопросов`);
  }

  const sections = await fs.readdir(TESTS_ROOT, { withFileTypes: true });
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  let batch: Row[] = [];
  const t0 = Date.now();

  for (const secEnt of sections) {
    if (!secEnt.isDirectory()) continue;
    if (secEnt.name.startsWith("_")) continue;
    if (secEnt.name.startsWith("секции_backup")) continue;
    if (opts.sectionFilter && secEnt.name !== opts.sectionFilter) continue;

    const sectionName = secEnt.name;
    const sectionDir = path.join(TESTS_ROOT, sectionName);
    const specs = await fs.readdir(sectionDir, { withFileTypes: true });

    for (const specEnt of specs) {
      if (!specEnt.isDirectory()) continue;
      const specialtyName = specEnt.name;
      if (opts.specialtyFilter && specialtyName !== opts.specialtyFilter) continue;

      const specialtyId = makeSpecialtyId(specialtyName, sectionName);
      const specDir = path.join(sectionDir, specialtyName);
      const blockFiles = (await fs.readdir(specDir))
        .filter((f) => f.startsWith("block_") && f.endsWith(".json"))
        .sort((a, b) => {
          const na = parseInt(a.match(/block_(\d+)-/)?.[1] ?? "0");
          const nb = parseInt(b.match(/block_(\d+)-/)?.[1] ?? "0");
          return na - nb;
        });

      for (const blockFile of blockFiles) {
        const content = await fs.readFile(path.join(specDir, blockFile), "utf-8");
        const qs = JSON.parse(content) as BlockQuestion[];

        for (const q of qs) {
          totalProcessed++;
          if (opts.resume && existingIds.has(q.id)) {
            totalSkipped++;
            continue;
          }
          const blockNumber = Math.floor((q.num - 1) / 100) + 1;
          batch.push({
            id: q.id,
            section: sectionName,
            specialty_id: specialtyId,
            specialty_name: specialtyName,
            block_number: blockNumber,
            num: q.num,
            question: q.question,
            options: q.options,
            correct_idx: q.correctIndex,
            picture: q.picture ?? null,
          });

          if (batch.length >= BATCH_SIZE) {
            await upsertBatch(batch);
            totalInserted += batch.length;
            batch = [];
            const elapsed = (Date.now() - t0) / 1000;
            const rate = totalInserted / Math.max(1, elapsed);
            process.stdout.write(
              `  processed=${totalProcessed} inserted=${totalInserted} skipped=${totalSkipped} rate=${rate.toFixed(0)}/s\r`
            );
          }
        }
      }
    }
  }

  if (batch.length > 0) {
    await upsertBatch(batch);
    totalInserted += batch.length;
  }

  console.log(); // newline after carriage return
  console.log(`Готово за ${((Date.now() - t0) / 1000).toFixed(1)}с`);
  console.log(`  обработано:   ${totalProcessed}`);
  console.log(`  загружено:    ${totalInserted}`);
  console.log(`  пропущено:    ${totalSkipped}`);

  // Обновить materialized view
  console.log("\nОбновляю materialized view test_specialty_counts...");
  const { error: rvError } = await sb.rpc("refresh_test_specialty_counts" as any);
  if (rvError) {
    console.log("  RPC не настроен, обновляю через SQL...");
    const { error: sqlError } = await sb
      .from("_dummy" as any)
      .select("1")
      .limit(0); // no-op чтобы прогреть соединение
    // Прямой REFRESH через SQL не доступен из клиента — сделаем через migration/MCP
    console.log("  (REFRESH MATERIALIZED VIEW нужно будет прогнать через Supabase MCP/Studio)");
  } else {
    console.log("  OK");
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
