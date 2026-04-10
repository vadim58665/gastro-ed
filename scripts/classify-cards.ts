/**
 * One-time script: classify all cards by difficulty using Claude.
 *
 * Reads card data files, sends batches to Claude API,
 * writes difficulty values back into the source .ts files.
 *
 * Usage: npx tsx scripts/classify-cards.ts
 *
 * Requires ANTHROPIC_API_KEY in environment.
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local for API key
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import Anthropic from "@anthropic-ai/sdk";

const CARDS_DIR = path.resolve(__dirname, "../src/data/cards");
const ACCRED_DIR = path.resolve(__dirname, "../src/data/accreditation");
const BATCH_SIZE = 20;

const client = new Anthropic();

interface CardSummary {
  id: string;
  file: string;
  text: string;
}

function extractCardsFromFile(filePath: string): CardSummary[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);
  const cards: CardSummary[] = [];

  const idRegex = /id:\s*"([^"]+)"/g;
  let match;
  while ((match = idRegex.exec(content)) !== null) {
    const id = match[1];
    const start = Math.max(0, match.index - 50);
    const end = Math.min(content.length, match.index + 500);
    const snippet = content.slice(start, end);
    cards.push({ id, file: fileName, text: snippet });
  }

  return cards;
}

async function classifyBatch(
  cards: CardSummary[]
): Promise<Record<string, number>> {
  const cardDescriptions = cards
    .map(
      (c, i) =>
        `[${i + 1}] id="${c.id}"\n${c.text.replace(/\n/g, " ").slice(0, 300)}`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Classify each medical education card by difficulty level 1-5:
1 = Student (basic facts, single-step reasoning)
2 = Resident (multi-step, differential diagnosis)
3 = Doctor (complex clinical scenarios, management)
4 = Professor (rare conditions, nuanced guidelines)
5 = Academician (expert-only, controversial topics)

Cards:
${cardDescriptions}

Reply ONLY with JSON object mapping card id to difficulty number. Example:
{"cc-1": 2, "cc-2": 3}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to parse response:", text);
    return {};
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Invalid JSON:", jsonMatch[0]);
    return {};
  }
}

function writeDifficultyToFile(
  filePath: string,
  difficulties: Record<string, number>
): number {
  let content = fs.readFileSync(filePath, "utf-8");
  let count = 0;

  for (const [id, diff] of Object.entries(difficulties)) {
    const level = Math.max(1, Math.min(5, Math.round(diff)));

    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const topicPattern = new RegExp(
      `(id:\\s*"${escapedId}"[\\s\\S]*?topic:\\s*"[^"]*",)`,
      "m"
    );
    const topicMatch = content.match(topicPattern);
    if (topicMatch) {
      const original = topicMatch[1];
      if (!original.includes("difficulty:")) {
        const replacement = `${original}\n    difficulty: ${level} as const,`;
        content = content.replace(original, replacement);
        count++;
      }
    }
  }

  if (count > 0) {
    fs.writeFileSync(filePath, content, "utf-8");
  }
  return count;
}

async function main() {
  console.log("=== Card Difficulty Classifier ===\n");

  const cardFiles = fs
    .readdirSync(CARDS_DIR)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => path.join(CARDS_DIR, f));

  const accredFiles = fs.existsSync(ACCRED_DIR)
    ? fs
        .readdirSync(ACCRED_DIR)
        .filter((f) => f.endsWith(".ts") && f !== "index.ts")
        .map((f) => path.join(ACCRED_DIR, f))
    : [];

  const allFiles = [...cardFiles, ...accredFiles];
  console.log(`Found ${allFiles.length} data files\n`);

  let totalCards = 0;
  let totalClassified = 0;

  for (const filePath of allFiles) {
    const fileName = path.basename(filePath);
    const cards = extractCardsFromFile(filePath);
    if (cards.length === 0) continue;

    console.log(`\n${fileName}: ${cards.length} cards`);
    totalCards += cards.length;

    const allDifficulties: Record<string, number> = {};

    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE);
      console.log(
        `  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(cards.length / BATCH_SIZE)}...`
      );

      try {
        const result = await classifyBatch(batch);
        Object.assign(allDifficulties, result);
      } catch (err) {
        console.error(`  Error classifying batch:`, err);
      }

      if (i + BATCH_SIZE < cards.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    const written = writeDifficultyToFile(filePath, allDifficulties);
    totalClassified += written;
    console.log(
      `  Classified: ${Object.keys(allDifficulties).length}, Written: ${written}`
    );
  }

  console.log(`\n=== Done ===`);
  console.log(`Total cards: ${totalCards}`);
  console.log(`Total classified: ${totalClassified}`);
}

main().catch(console.error);
