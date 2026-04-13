/**
 * Main system prompt builder. Assembles all layers into a single prompt.
 */

import { getBasePrompt } from "./base";
import { getSpecialtyKnowledge } from "./specialty-knowledge";
import { getAccreditationKnowledge } from "./accreditation";
import { getAppKnowledge, type AppStats } from "./app-knowledge";
import { serializeUserContext, type UserLearningProfile } from "./user-context";
import { getActionPrompt } from "./actions";

export type PromptAction =
  | "chat"
  | "explain"
  | "explain_friend"
  | "mnemonic_acronym"
  | "mnemonic_story"
  | "mnemonic_rhyme"
  | "memory_poem"
  | "hint"
  | "why_chain"
  | "error_classify"
  | "nudge"
  | "tip"
  | "learning_plan"
  | "disease_info"
  | "verify"
  | "image_prompt";

export interface PromptContext {
  action: PromptAction;
  specialty?: string;
  topic?: string;
  userProfile?: UserLearningProfile;
  ragContext?: string;
  cardContext?: {
    question: string;
    options?: string[];
    correctAnswer?: string;
    userAnswer?: string;
  };
  appStats?: AppStats;
}

// Actions that need heavyweight context (specialty, accreditation, user profile, app stats)
const FULL_CONTEXT_ACTIONS = new Set<PromptAction>([
  "chat",
  "explain",
  "learning_plan",
  "disease_info",
  "why_chain",
]);

// Actions that only need specialty + card context (no user profile, no app stats)
const MEDIUM_CONTEXT_ACTIONS = new Set<PromptAction>([
  "explain_friend",
  "mnemonic_acronym",
  "mnemonic_story",
  "mnemonic_rhyme",
  "memory_poem",
]);

// Light actions: base prompt + action instructions only
// hint, tip, nudge, error_classify, verify, image_prompt

// Actions that should include accreditation knowledge
const ACCREDITATION_ACTIONS = new Set<PromptAction>([
  "chat",
  "learning_plan",
  "disease_info",
]);

export function buildSystemPrompt(ctx: PromptContext): string {
  const blocks: string[] = [];
  const isFull = FULL_CONTEXT_ACTIONS.has(ctx.action);
  const isMedium = MEDIUM_CONTEXT_ACTIONS.has(ctx.action);

  // 1. Base identity (always)
  blocks.push(getBasePrompt());

  // 2. Specialty knowledge (full + medium actions only)
  if ((isFull || isMedium) && ctx.specialty) {
    const specialtyBlock = getSpecialtyKnowledge(ctx.specialty);
    if (specialtyBlock) blocks.push(specialtyBlock);
  }

  // 3. Accreditation knowledge (only for specific actions)
  if (ACCREDITATION_ACTIONS.has(ctx.action)) {
    blocks.push(getAccreditationKnowledge());
  }

  // 4. App knowledge (full context only)
  if (isFull && ctx.appStats) {
    blocks.push(getAppKnowledge(ctx.appStats));
  }

  // 5. User context (full context only)
  if (isFull && ctx.userProfile) {
    blocks.push(serializeUserContext(ctx.userProfile));
  }

  // 6. RAG context (full context only)
  if (isFull && ctx.ragContext) {
    blocks.push(`<medical_context>\n${ctx.ragContext}\n</medical_context>`);
  }

  // 7. Card context (full + medium)
  if ((isFull || isMedium) && ctx.cardContext) {
    const cardLines = [`<current_card>`, `Вопрос: ${ctx.cardContext.question}`];
    if (ctx.cardContext.options) {
      cardLines.push(`Варианты: ${ctx.cardContext.options.join("; ")}`);
    }
    if (ctx.cardContext.correctAnswer) {
      cardLines.push(`Правильный ответ: ${ctx.cardContext.correctAnswer}`);
    }
    if (ctx.cardContext.userAnswer) {
      cardLines.push(`Ответ пользователя: ${ctx.cardContext.userAnswer}`);
    }
    cardLines.push("</current_card>");
    blocks.push(cardLines.join("\n"));
  }

  // 8. Action-specific instructions (always)
  const actionBlock = getActionPrompt(ctx.action);
  if (actionBlock) blocks.push(actionBlock);

  return blocks.join("\n\n");
}

export type { UserLearningProfile, AppStats };
