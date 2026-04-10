import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return client;
}

const MEDMIND_SYSTEM = `Ты MedMind  - медицинский ИИ-педагог для врачей. Пиши на русском языке.
Генерируй клинически точный контент. Без эмодзи. Цитируй источники где возможно.
Будь кратким и конкретным.`;

export interface GenerateOptions {
  systemSuffix?: string;
  maxTokens?: number;
  model?: "claude-sonnet-4-20250514" | "claude-haiku-4-5-20251001";
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function generateText(
  userPrompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const model = options.model ?? "claude-sonnet-4-20250514";
  const maxTokens = options.maxTokens ?? 1024;
  const system = options.systemSuffix
    ? `${MEDMIND_SYSTEM}\n${options.systemSuffix}`
    : MEDMIND_SYSTEM;

  try {
    const response = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model,
    };
  } catch (err) {
    // Fallback to Haiku if Sonnet fails
    if (model === "claude-sonnet-4-20250514") {
      return generateText(userPrompt, {
        ...options,
        model: "claude-haiku-4-5-20251001",
      });
    }
    throw err;
  }
}

export async function* streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  systemSuffix?: string
): AsyncGenerator<string> {
  const system = systemSuffix
    ? `${MEDMIND_SYSTEM}\n${systemSuffix}`
    : MEDMIND_SYSTEM;

  const stream = getClient().messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

// Cost estimation: Sonnet input=$3/M, output=$15/M; Haiku input=$0.80/M, output=$4/M
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  if (model.includes("haiku")) {
    return (inputTokens * 0.8 + outputTokens * 4) / 1_000_000;
  }
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}
