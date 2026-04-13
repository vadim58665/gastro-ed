import type { SubscriptionTier } from "@/types/medmind";
import type { PromptAction } from "./prompts/system-prompt";

type Model = "claude-sonnet-4-20250514" | "claude-haiku-4-5-20251001";

const SONNET: Model = "claude-sonnet-4-20250514";
const HAIKU: Model = "claude-haiku-4-5-20251001";

/**
 * Routes AI calls to the appropriate model based on action type and budget.
 *
 * Sonnet: complex reasoning, creative generation, first impressions.
 * Haiku: structured output, classification, follow-ups, validation.
 */
const ACTION_MODEL_MAP: Record<PromptAction, Model> = {
  chat: SONNET,           // first message quality matters
  explain: SONNET,        // depth and accuracy
  explain_friend: HAIKU,  // simpler language
  mnemonic_acronym: SONNET,
  mnemonic_story: SONNET,
  mnemonic_rhyme: SONNET,
  memory_poem: SONNET,
  hint: HAIKU,
  why_chain: SONNET,      // Socratic dialog needs depth
  error_classify: HAIKU,  // structured JSON output
  nudge: HAIKU,
  tip: HAIKU,
  learning_plan: SONNET,  // complex generation
  disease_info: SONNET,   // depth and accuracy
  verify: HAIKU,          // fact-checking
  image_prompt: HAIKU,    // prompt engineering for image model
};

// Actions that can use Haiku for follow-up messages (after first in conversation)
const DOWNGRADE_ON_FOLLOWUP = new Set<PromptAction>(["chat"]);

export interface ModelSelection {
  model: Model;
  maxTokens: number;
  reason: string;
}

export function selectModel(
  action: PromptAction,
  opts?: {
    tier?: SubscriptionTier;
    isFollowUp?: boolean;
    remainingBudgetUsd?: number;
  }
): ModelSelection {
  const base = ACTION_MODEL_MAP[action] ?? SONNET;
  let model = base;
  let reason = `default for ${action}`;

  // Downgrade to Haiku for follow-up chat messages
  if (opts?.isFollowUp && DOWNGRADE_ON_FOLLOWUP.has(action)) {
    model = HAIKU;
    reason = "follow-up message, downgraded to Haiku";
  }

  // Auto-downgrade when budget is running low (< $0.05 remaining)
  if (opts?.remainingBudgetUsd !== undefined && opts.remainingBudgetUsd < 0.05) {
    model = HAIKU;
    reason = "budget low, forced Haiku";
  }

  const maxTokens = getMaxTokens(action, model);

  return { model, maxTokens, reason };
}

function getMaxTokens(action: PromptAction, model: Model): number {
  // Longer outputs for creative/complex actions
  const longActions: PromptAction[] = [
    "explain",
    "disease_info",
    "learning_plan",
    "why_chain",
  ];
  const mediumActions: PromptAction[] = [
    "chat",
    "mnemonic_story",
    "memory_poem",
    "mnemonic_rhyme",
  ];

  if (longActions.includes(action)) return 2048;
  // Haiku follow-ups get shorter limit to save tokens
  if (mediumActions.includes(action)) return model === HAIKU ? 512 : 1024;
  // Hints and tips are short by nature
  if (action === "hint" || action === "tip") return 256;
  return 512;
}

// Cost estimation per model (per million tokens)
const MODEL_COSTS = {
  [SONNET]: { input: 3, output: 15 },
  [HAIKU]: { input: 0.8, output: 4 },
} as const;

export function estimateCost(
  model: Model,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model];
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}
