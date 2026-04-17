/**
 * Export pending prebuilt_content entities to JSON batches for subagent workers.
 * No Anthropic API calls — only Supabase reads.
 *
 * Usage:
 *   npx tsx scripts/export-pending-batches.ts --type=hint --batches=3 --size=100 --out=/tmp/prebuild-batches
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(__dirname, "../.env.local"), override: true });

import { demoCards } from "../src/data/cards";
import type { Card } from "../src/types/card";
import type { TestQuestion } from "../src/types/accreditation";
import { gastroenterologiyaQuestions } from "../src/data/accreditation/gastroenterologiya";
import { kardiologiyaQuestions } from "../src/data/accreditation/kardiologiya";
import { nevrologiyaQuestions } from "../src/data/accreditation/nevrologiya";
import { hirurgiyaQuestions } from "../src/data/accreditation/hirurgiya";
import { lechebnoeDeloQuestions } from "../src/data/accreditation/lechebnoe-delo";
import { pediatriyaQuestions } from "../src/data/accreditation/pediatriya";

type ContentType = "hint" | "explain_short" | "explain_long";
type EntityType = "card" | "accreditation_question";

interface Entity {
  entity_type: EntityType;
  entity_id: string;
  specialty: string;
  topic?: string;
  prompt: string;
}

function cardToPrompt(card: Card): string {
  const lines: string[] = [`Тип карточки: ${card.type}`];
  if ("question" in card) lines.push(`Вопрос: ${card.question}`);
  if ("statement" in card) lines.push(`Утверждение: ${card.statement}`);
  if ("scenario" in card) lines.push(`Клиническая ситуация: ${card.scenario}`);
  if ("title" in card) lines.push(`Заголовок: ${card.title}`);
  if ("options" in card && Array.isArray(card.options)) {
    const opts = card.options
      .map((o, i) => {
        const marker =
          typeof (o as { isCorrect?: boolean }).isCorrect === "boolean"
            ? (o as { isCorrect: boolean }).isCorrect
              ? " [правильный]"
              : ""
            : "";
        return `  ${i + 1}. ${(o as { text: string }).text}${marker}`;
      })
      .join("\n");
    lines.push(`Варианты:\n${opts}`);
  }
  if ("correctAnswer" in card) lines.push(`Правильный ответ: ${card.correctAnswer}`);
  if ("explanation" in card && card.explanation) {
    lines.push(`Готовое объяснение (справочно): ${card.explanation}`);
  }
  lines.push(`Тема: ${card.topic}`);
  lines.push(`Специальность: ${card.specialty}`);
  return lines.join("\n");
}

function questionToPrompt(q: TestQuestion): string {
  const opts = q.options.map((o, i) => {
    const marker = i === q.correctIndex ? " [правильный]" : "";
    return `  ${i + 1}. ${o}${marker}`;
  });
  return [
    `Специальность: ${q.specialty}`,
    `Блок: ${q.blockNumber}`,
    `Вопрос: ${q.question}`,
    `Варианты:\n${opts.join("\n")}`,
    q.explanation ? `Готовое объяснение (справочно): ${q.explanation}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function loadAllEntities(): Entity[] {
  const entities: Entity[] = [];

  for (const card of demoCards) {
    entities.push({
      entity_type: "card",
      entity_id: card.id,
      specialty: card.specialty,
      topic: card.topic,
      prompt: cardToPrompt(card),
    });
  }

  const accredMap: Record<string, TestQuestion[]> = {
    gastroenterologiya: gastroenterologiyaQuestions,
    kardiologiya: kardiologiyaQuestions,
    nevrologiya: nevrologiyaQuestions,
    hirurgiya: hirurgiyaQuestions,
    "lechebnoe-delo": lechebnoeDeloQuestions,
    pediatriya: pediatriyaQuestions,
  };
  for (const questions of Object.values(accredMap)) {
    for (const q of questions) {
      entities.push({
        entity_type: "accreditation_question",
        entity_id: q.id,
        specialty: q.specialty,
        prompt: questionToPrompt(q),
      });
    }
  }

  return entities;
}

interface Args {
  type: ContentType;
  batches: number;
  size: number;
  out: string;
  total?: number;
}

function parseArgs(): Args {
  const args: Args = {
    type: "hint",
    batches: 3,
    size: 100,
    out: "/tmp/prebuild-batches",
  };
  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.replace(/^--/, "").split("=");
    if (k === "type") args.type = v as ContentType;
    else if (k === "batches") args.batches = Number(v);
    else if (k === "size") args.size = Number(v);
    else if (k === "out") args.out = v;
    else if (k === "total") args.total = Number(v);
  }
  return args;
}

async function main() {
  const args = parseArgs();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key);

  const all = loadAllEntities();
  console.log(`Loaded ${all.length} total entities`);

  // Fetch already-done entity_ids for this content_type
  const done = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("prebuilt_content")
      .select("entity_type,entity_id")
      .eq("content_type", args.type)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data as { entity_type: string; entity_id: string }[]) {
      done.add(`${r.entity_type}:${r.entity_id}`);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Already done for type=${args.type}: ${done.size}`);

  const pending = all.filter((e) => !done.has(`${e.entity_type}:${e.entity_id}`));
  console.log(`Pending: ${pending.length}`);

  const capped = args.total ? pending.slice(0, args.total) : pending;

  const slice = capped.slice(0, args.batches * args.size);
  console.log(
    `Exporting ${slice.length} entities into ${args.batches} batch files of up to ${args.size}`
  );

  fs.mkdirSync(args.out, { recursive: true });
  for (let b = 0; b < args.batches; b++) {
    const start = b * args.size;
    const chunk = slice.slice(start, start + args.size);
    if (chunk.length === 0) break;
    const file = path.join(args.out, `${args.type}-batch-${b + 1}.json`);
    fs.writeFileSync(file, JSON.stringify({ type: args.type, count: chunk.length, entities: chunk }, null, 2));
    console.log(`  wrote ${file} (${chunk.length})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
