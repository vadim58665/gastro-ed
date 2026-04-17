/**
 * Mass-generate prebuilt AI content (hint / explain_short / explain_long) for
 * every card and accreditation question. Results live in Supabase table
 * `prebuilt_content` and are served to all subscribers without token cost.
 *
 * Usage examples:
 *   npx tsx scripts/prebuild-content.ts --type=hint --entity=card --limit=5 --dry-run
 *   npx tsx scripts/prebuild-content.ts --type=hint --entity=card
 *   npx tsx scripts/prebuild-content.ts --type=all --entity=all --resume
 *   npx tsx scripts/prebuild-content.ts --type=explain_short --entity=accred --specialty=gastroenterologiya
 *
 * Requires ANTHROPIC_API_KEY and SUPABASE_SERVICE_ROLE_KEY (or anon) in env.
 */

import * as dotenv from "dotenv";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(__dirname, "../.env.local"), override: true });

import { demoCards } from "../src/data/cards";
import type { Card } from "../src/types/card";
import type { TestQuestion } from "../src/types/accreditation";
import {
  ACCREDITATION_SPECIALTY_IDS,
  getQuestionsForSpecialty,
} from "../src/data/accreditation";

type ContentType = "hint" | "explain_short" | "explain_long";
type EntityType = "card" | "accreditation_question";
type Model = "claude-sonnet-4-20250514" | "claude-haiku-4-5-20251001";

const SONNET: Model = "claude-sonnet-4-20250514";
const HAIKU: Model = "claude-haiku-4-5-20251001";

const MODEL_COSTS: Record<Model, { input: number; output: number }> = {
  [SONNET]: { input: 3, output: 15 },
  [HAIKU]: { input: 0.8, output: 4 },
};

const BATCH_SIZE = 10;

interface Args {
  type: "hint" | "explain_short" | "explain_long" | "all";
  entity: "card" | "accred" | "all";
  limit?: number;
  resume: boolean;
  dryRun: boolean;
  specialty?: string;
}

function parseArgs(): Args {
  const args: Args = {
    type: "all",
    entity: "all",
    resume: false,
    dryRun: false,
  };
  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.replace(/^--/, "").split("=");
    if (k === "type") args.type = v as Args["type"];
    else if (k === "entity") args.entity = v as Args["entity"];
    else if (k === "limit") args.limit = Number(v);
    else if (k === "resume") args.resume = true;
    else if (k === "dry-run") args.dryRun = true;
    else if (k === "specialty") args.specialty = v;
  }
  return args;
}

interface Entity {
  type: EntityType;
  id: string;
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

function loadEntities(args: Args): Entity[] {
  const entities: Entity[] = [];

  if (args.entity === "card" || args.entity === "all") {
    for (const card of demoCards) {
      if (args.specialty && card.specialty !== args.specialty) continue;
      entities.push({
        type: "card",
        id: card.id,
        specialty: card.specialty,
        topic: card.topic,
        prompt: cardToPrompt(card),
      });
    }
  }

  if (args.entity === "accred" || args.entity === "all") {
    for (const specId of ACCREDITATION_SPECIALTY_IDS) {
      const questions = getQuestionsForSpecialty(specId);
      if (args.specialty && specId !== args.specialty) continue;
      for (const q of questions) {
        entities.push({
          type: "accreditation_question",
          id: q.id,
          specialty: q.specialty,
          prompt: questionToPrompt(q),
        });
      }
    }
  }

  return entities;
}

const EBM_BASE = `Опирайся СТРОГО на доказательную медицину:
- Клинические рекомендации Минздрава РФ (cr.minzdrav.gov.ru): приоритет.
- Международные гайдлайны (WHO, ESC, ESMO, KDIGO, GOLD, GINA и профильные): для уточнения.
- Свежие систематические обзоры и метаанализы (Cochrane, крупные мультицентровые).
- Крупные РКИ последних лет.

Правила фактологии:
- Не выдумывай цифры, дозы и схемы. Если не уверен в конкретной цифре, переформулируй без неё.
- Отражай только устоявшиеся положения (не экспериментальные терапии).
- Учитывай, что это российская подготовка к аккредитации, используй терминологию и алгоритмы, принятые в РФ.
- НЕ вставляй в ответ прямые ссылки, URL, названия конкретных КР или метаанализов, только сами рекомендации.
- Русский язык. Без эмодзи. Без длинного тире "—" (используй обычное тире "-" или двоеточие).`;

const SYSTEM_PROMPTS: Record<ContentType, string> = {
  hint: `Ты медицинский наставник. Твоя задача: дать КОРОТКУЮ наводящую подсказку к вопросу.

${EBM_BASE}

Правила подсказки:
- НЕ называй правильный ответ напрямую.
- Направь мышление в нужную сторону: ключевой патогенетический принцип, патогномоничный признак, опорная КР-рекомендация.
- 1-2 предложения, 20-40 слов.
Ответ: ТОЛЬКО текст подсказки, без префиксов.`,

  explain_short: `Ты медицинский наставник. Дай КРАТКИЙ разбор вопроса для врача.

${EBM_BASE}

Правила краткого разбора:
- 2-4 предложения.
- Объясни почему правильный ответ верный с точки зрения КР РФ / EBM.
- Упомяни ключевой механизм или критерий выбора, не уходя в детали.
- Без вводных слов и префиксов "Ответ:".
Ответ: только сам разбор.`,

  explain_long: `Ты медицинский наставник. Дай РАЗВЁРНУТЫЙ разбор для врача, готовящегося к аккредитации.

${EBM_BASE}

Структура разбора (используй маркдаун, заголовки "##"):
## Суть
Коротко: о чём вопрос, что спрашивается.

## Почему правильный ответ
Патогенез / механизм / клинический контекст. Соответствие действующим КР РФ и современной доказательной базе (без цитирования источников дословно, но с упоминанием "согласно действующим клиническим рекомендациям", "по данным систематических обзоров" и т.п. когда это уместно).

## Почему остальные варианты неверны
По каждому неверному варианту: 1-2 предложения, какой конкретный критерий или механизм делает его неподходящим.

## Клинически значимо помнить
1-3 пункта: ключевые факты, которые часто путают, типичные ловушки мышления, сильные клинические маркеры.

Правила:
- Без прямых ссылок и URL.
- Без эмодзи и длинного тире.
- Без вводных "Давайте разберём" и финальных "Надеюсь, помог".
Ответ: только сам разбор.`,
};

function modelFor(type: ContentType): Model {
  return type === "hint" ? HAIKU : SONNET;
}

function maxTokensFor(type: ContentType): number {
  if (type === "hint") return 200;
  if (type === "explain_short") return 400;
  return 1500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateOne(
  client: Anthropic,
  entity: Entity,
  contentType: ContentType
): Promise<{ text: string; inputTokens: number; outputTokens: number; model: Model }> {
  const model = modelFor(contentType);
  const maxAttempts = 4;
  let lastErr: unknown;
  let response: Message | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      response = (await client.messages.create({
        model,
        max_tokens: maxTokensFor(contentType),
        system: SYSTEM_PROMPTS[contentType],
        messages: [{ role: "user", content: entity.prompt }],
      })) as Message;
      break;
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { status?: number } | null)?.status;
      const headers = (err as { headers?: Record<string, string> } | null)?.headers;
      if (status === 429 && attempt < maxAttempts) {
        const retryAfter = Number(headers?.["retry-after"]);
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(30000, 2000 * attempt * attempt);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  if (!response) throw lastErr as Error;

  const text = response.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { type: string }) => (b as unknown as { text: string }).text)
    .join("")
    .trim();

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
  };
}

function estimateCostUsd(model: Model, inTok: number, outTok: number): number {
  const c = MODEL_COSTS[model];
  return (inTok * c.input + outTok * c.output) / 1_000_000;
}

type SupabaseAny = ReturnType<typeof createClient<any, any, any>>;

async function loadExisting(
  supabase: SupabaseAny,
  entityType: EntityType,
  contentType: ContentType
): Promise<Set<string>> {
  const existing = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("prebuilt_content")
      .select("entity_id")
      .eq("entity_type", entityType)
      .eq("content_type", contentType)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data as { entity_id: string }[]) existing.add(row.entity_id);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return existing;
}

async function run(args: Args) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
  }
  const supabase = createClient(url, serviceKey);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const allEntities = loadEntities(args);
  console.log(`Loaded ${allEntities.length} entities (entity=${args.entity}, specialty=${args.specialty ?? "all"})`);

  const contentTypes: ContentType[] =
    args.type === "all" ? ["hint", "explain_short", "explain_long"] : [args.type];

  let totalDone = 0;
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const contentType of contentTypes) {
    console.log(`\n=== Generating ${contentType} ===`);

    // Group by entity_type to load existing efficiently
    const byType: Record<EntityType, Entity[]> = {
      card: [],
      accreditation_question: [],
    };
    for (const e of allEntities) byType[e.type].push(e);

    for (const [entityType, list] of Object.entries(byType) as [EntityType, Entity[]][]) {
      if (list.length === 0) continue;
      let pending = list;

      if (args.resume) {
        const existing = await loadExisting(supabase, entityType, contentType);
        pending = pending.filter((e) => !existing.has(e.id));
        console.log(`  ${entityType}: ${existing.size} already in DB, ${pending.length} pending`);
      }

      if (args.limit !== undefined) {
        pending = pending.slice(0, args.limit);
      }

      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        if (args.dryRun) {
          for (const e of batch) {
            console.log(`  [dry-run] ${entityType}/${e.id} ${contentType} (${modelFor(contentType)})`);
          }
          totalDone += batch.length;
          continue;
        }

        const results = await Promise.allSettled(
          batch.map((e) => generateOne(client, e, contentType))
        );

        const rows: Array<{
          entity_type: EntityType;
          entity_id: string;
          content_type: ContentType;
          content_ru: string;
          model_used: string;
          tokens_used: number;
          cost_usd: number;
          updated_at: string;
        }> = [];

        for (let j = 0; j < batch.length; j++) {
          const r = results[j];
          const e = batch[j];
          if (r.status === "rejected") {
            console.error(`  FAIL ${e.id}: ${String(r.reason)}`);
            continue;
          }
          const cost = estimateCostUsd(r.value.model, r.value.inputTokens, r.value.outputTokens);
          totalCost += cost;
          totalInputTokens += r.value.inputTokens;
          totalOutputTokens += r.value.outputTokens;
          rows.push({
            entity_type: entityType,
            entity_id: e.id,
            content_type: contentType,
            content_ru: r.value.text,
            model_used: r.value.model,
            tokens_used: r.value.inputTokens + r.value.outputTokens,
            cost_usd: cost,
            updated_at: new Date().toISOString(),
          });
        }

        if (rows.length > 0) {
          const { error } = await supabase.from("prebuilt_content").upsert(rows, {
            onConflict: "entity_type,entity_id,content_type",
          });
          if (error) {
            console.error(`  UPSERT failed:`, error.message);
          }
        }

        totalDone += rows.length;
        console.log(
          `  progress ${i + batch.length}/${pending.length} · batch cost ~$${rows
            .reduce((s, r) => s + r.cost_usd, 0)
            .toFixed(4)} · total $${totalCost.toFixed(2)}`
        );

        // Throttle to stay under 50 req/min (Haiku tier).
        // BATCH_SIZE=10 + ~15s pause = 40 req/min target.
        if (i + BATCH_SIZE < pending.length) {
          await sleep(15000);
        }
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Processed: ${totalDone}`);
  console.log(`Input tokens: ${totalInputTokens}`);
  console.log(`Output tokens: ${totalOutputTokens}`);
  console.log(`Total cost: $${totalCost.toFixed(4)}`);
}

run(parseArgs()).catch((err) => {
  console.error(err);
  process.exit(1);
});
