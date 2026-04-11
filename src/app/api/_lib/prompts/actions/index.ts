import type { PromptAction } from "../system-prompt";
import { getChatActionPrompt } from "./chat";
import { getExplainActionPrompt, getExplainFriendPrompt } from "./explain";
import { getMnemonicPrompt } from "./mnemonic";
import { getLearningPlanPrompt } from "./learning-plan";
import { getErrorClassifyPrompt } from "./error-classify";
import { getVerifyPrompt } from "./verify";
import { getDiseaseInfoPrompt } from "./disease-info";

export function getActionPrompt(
  action: PromptAction,
  options?: { mnemonicType?: "acronym" | "story" | "rhyme" | "poem" }
): string {
  switch (action) {
    case "chat":
      return getChatActionPrompt();
    case "explain":
      return getExplainActionPrompt();
    case "explain_friend":
      return getExplainFriendPrompt();
    case "mnemonic_acronym":
      return getMnemonicPrompt(options?.mnemonicType ?? "acronym");
    case "mnemonic_story":
      return getMnemonicPrompt("story");
    case "mnemonic_rhyme":
      return getMnemonicPrompt("rhyme");
    case "memory_poem":
      return getMnemonicPrompt("poem");
    case "learning_plan":
      return getLearningPlanPrompt();
    case "error_classify":
      return getErrorClassifyPrompt();
    case "verify":
      return getVerifyPrompt();
    case "disease_info":
      return getDiseaseInfoPrompt();
    case "hint":
      return `Дай подсказку к вопросу. НЕ давай правильный ответ напрямую. Направь мышление пользователя в правильную сторону. 1-2 предложения.`;
    case "tip":
      return `Дай короткую подсказку для запоминания (1-2 предложения). Клинически точно.`;
    case "why_chain":
      return `Задай пользователю вопрос "Почему ты выбрал этот ответ?" и разбери его ход рассуждений. Задавай уточняющие "Почему?", помогая глубже понять тему.`;
    case "nudge":
      return `Создай короткое мотивирующее сообщение (1-2 предложения) для пользователя. Учитывай его профиль.`;
    case "image_prompt":
      return `Опиши визуальную ассоциацию для запоминания медицинской концепции. Описание должно быть ярким, конкретным, пригодным для генерации изображения. 2-3 предложения на английском языке.`;
    default:
      return "";
  }
}

export { getChatActionPrompt } from "./chat";
export { getExplainActionPrompt, getExplainFriendPrompt } from "./explain";
export { getMnemonicPrompt } from "./mnemonic";
export { getLearningPlanPrompt } from "./learning-plan";
export { getErrorClassifyPrompt } from "./error-classify";
export { getVerifyPrompt } from "./verify";
export { getDiseaseInfoPrompt } from "./disease-info";
