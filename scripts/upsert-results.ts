/**
 * Upsert agent-generated content JSON into prebuilt_content.
 * NO Anthropic API calls — Supabase only.
 *
 * Usage:
 *   npx tsx scripts/upsert-results.ts --type=hint --files='/Users/vadim/Desktop/проекты/gastro-ed/hint-batch-*-result.json'
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(__dirname, "../.env.local"), override: true });

interface ResultRecord {
  entity_type: "card" | "accreditation_question";
  entity_id: string;
  content_ru: string;
}

interface Args {
  type: "hint" | "explain_short" | "explain_long";
  files: string;
  model: string;
}

function parseArgs(): Args {
  const args: Args = {
    type: "hint",
    files: "",
    model: "claude-opus-4-7-agent",
  };
  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.replace(/^--/, "").split("=");
    if (k === "type") args.type = v as Args["type"];
    else if (k === "files") args.files = v;
    else if (k === "model") args.model = v;
  }
  if (!args.files) throw new Error("--files=<glob> is required");
  return args;
}

async function main() {
  const args = parseArgs();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key);

  // Simple glob: expand only trailing * in basename, e.g. /dir/hint-batch-*-result.json
  const dir = path.dirname(args.files);
  const pattern = path.basename(args.files);
  const regex = new RegExp(
    "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"
  );
  const paths = fs
    .readdirSync(dir)
    .filter((f) => regex.test(f))
    .map((f) => path.join(dir, f));
  console.log(`Found ${paths.length} result file(s) matching: ${args.files}`);
  if (paths.length === 0) process.exit(1);

  const rows: Array<{
    entity_type: string;
    entity_id: string;
    content_type: string;
    content_ru: string;
    model_used: string;
    tokens_used: number;
    cost_usd: number;
    updated_at: string;
  }> = [];

  for (const p of paths) {
    const raw = fs.readFileSync(p, "utf8");
    let parsed: { results: ResultRecord[] };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`  parse failed ${p}:`, (err as Error).message);
      continue;
    }
    const items = parsed.results || [];
    console.log(`  ${p}: ${items.length} records`);
    for (const r of items) {
      if (!r.entity_type || !r.entity_id || !r.content_ru) {
        console.warn(`  skip invalid record in ${p}:`, r);
        continue;
      }
      rows.push({
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        content_type: args.type,
        content_ru: r.content_ru,
        model_used: args.model,
        tokens_used: 0,
        cost_usd: 0,
        updated_at: new Date().toISOString(),
      });
    }
  }

  console.log(`\nTotal to upsert: ${rows.length}`);
  if (rows.length === 0) process.exit(0);

  const chunkSize = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("prebuilt_content").upsert(chunk, {
      onConflict: "entity_type,entity_id,content_type",
    });
    if (error) {
      console.error(`  UPSERT failed:`, error.message);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`  upserted ${inserted}/${rows.length}`);
  }

  const { count } = await supabase
    .from("prebuilt_content")
    .select("*", { count: "exact", head: true })
    .eq("content_type", args.type);
  console.log(`\nDone. Total ${args.type} rows in DB: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
