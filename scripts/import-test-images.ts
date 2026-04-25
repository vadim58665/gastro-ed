#!/usr/bin/env npx tsx
/**
 * Загружает 953 картинки из `тесты/картинки/*.jpg` в Supabase Storage
 * bucket `test-images`. Параллельно, с пропуском уже загруженных.
 *
 * Usage:
 *   npx tsx scripts/import-test-images.ts
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
const IMAGES_DIR = path.resolve(process.cwd(), "тесты/картинки");
const BUCKET = "test-images";
const CONCURRENCY = 8;

async function uploadOne(filename: string, existing: Set<string>): Promise<"ok" | "skip" | "fail"> {
  if (existing.has(filename)) return "skip";
  const buf = await fs.readFile(path.join(IMAGES_DIR, filename));
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(filename, buf, {
      contentType: "image/jpeg",
      cacheControl: "31536000, immutable",
      upsert: false,
    });
  if (error) {
    if (error.message.includes("already exists")) return "skip";
    console.error(`  FAIL ${filename}: ${error.message}`);
    return "fail";
  }
  return "ok";
}

async function main() {
  console.log(`Загрузка картинок в Supabase Storage bucket "${BUCKET}"`);
  const files = (await fs.readdir(IMAGES_DIR)).filter((f) => f.endsWith(".jpg"));
  console.log(`  файлов на диске: ${files.length}`);

  // Существующие объекты в бакете
  const existing = new Set<string>();
  let offset = 0;
  while (true) {
    const { data, error } = await sb.storage.from(BUCKET).list("", {
      limit: 1000,
      offset,
    });
    if (error) {
      console.error("list error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    for (const obj of data) existing.add(obj.name);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  уже в Storage: ${existing.size}`);

  const queue = [...files];
  let ok = 0, skip = 0, fail = 0;
  const t0 = Date.now();

  async function worker() {
    while (queue.length > 0) {
      const f = queue.shift();
      if (!f) return;
      const r = await uploadOne(f, existing);
      if (r === "ok") ok++;
      else if (r === "skip") skip++;
      else fail++;
      if ((ok + skip + fail) % 50 === 0) {
        const elapsed = (Date.now() - t0) / 1000;
        const rate = (ok + skip + fail) / Math.max(1, elapsed);
        process.stdout.write(`  ok=${ok} skip=${skip} fail=${fail} rate=${rate.toFixed(1)}/s\r`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log();
  console.log(`Готово за ${((Date.now() - t0) / 1000).toFixed(1)}с`);
  console.log(`  загружено:  ${ok}`);
  console.log(`  пропущено:  ${skip}`);
  console.log(`  ошибок:     ${fail}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
