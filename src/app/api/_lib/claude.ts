import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, type PromptContext } from "./prompts/system-prompt";
import { selectModel, estimateCost } from "./model-router";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return client;
}

// Legacy system prompt for backwards compatibility during migration
const MEDMIND_SYSTEM_LEGACY = `Ты MedMind - медицинский ИИ-педагог для врачей. Пиши на русском языке.
Генерируй клинически точный контент. Без эмодзи. Цитируй источники где возможно.
Будь кратким и конкретным.`;

export interface GenerateOptions {
  /** @deprecated Use promptContext instead */
  systemSuffix?: string;
  maxTokens?: number;
  model?: "claude-sonnet-4-20250514" | "claude-haiku-4-5-20251001";
  promptContext?: PromptContext;
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
  let model: string;
  let maxTokens: number;
  let system: string;

  if (options.promptContext) {
    // New modular prompt system
    const selection = selectModel(options.promptContext.action);
    model = options.model ?? selection.model;
    maxTokens = options.maxTokens ?? selection.maxTokens;
    system = buildSystemPrompt(options.promptContext);
  } else {
    // Legacy path
    model = options.model ?? "claude-sonnet-4-20250514";
    maxTokens = options.maxTokens ?? 1024;
    system = options.systemSuffix
      ? `${MEDMIND_SYSTEM_LEGACY}\n${options.systemSuffix}`
      : MEDMIND_SYSTEM_LEGACY;
  }

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

export interface StreamChatOptions {
  /** @deprecated Use promptContext instead */
  systemSuffix?: string;
  promptContext?: PromptContext;
  isFollowUp?: boolean;
}

export async function* streamChat(
  messages: { role: "user" | "assistant"; content: string }[],
  options?: string | StreamChatOptions
): AsyncGenerator<string> {
  let system: string;
  let model: string;
  let maxTokens: number;

  // Handle both legacy (string) and new (object) signatures
  if (typeof options === "string" || options === undefined) {
    const suffix = options as string | undefined;
    system = suffix
      ? `${MEDMIND_SYSTEM_LEGACY}\n${suffix}`
      : MEDMIND_SYSTEM_LEGACY;
    model = "claude-sonnet-4-20250514";
    maxTokens = 1024;
  } else {
    if (options.promptContext) {
      system = buildSystemPrompt(options.promptContext);
      const selection = selectModel(
        options.promptContext.action,
        { isFollowUp: options.isFollowUp }
      );
      model = selection.model;
      maxTokens = selection.maxTokens;
    } else {
      system = options.systemSuffix
        ? `${MEDMIND_SYSTEM_LEGACY}\n${options.systemSuffix}`
        : MEDMIND_SYSTEM_LEGACY;
      model = "claude-sonnet-4-20250514";
      maxTokens = 1024;
    }
  }

  const stream = getClient().messages.stream({
    model,
    max_tokens: maxTokens,
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

/** @deprecated Use estimateCost from model-router instead */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  return estimateCost(
    model as "claude-sonnet-4-20250514" | "claude-haiku-4-5-20251001",
    inputTokens,
    outputTokens
  );
}
