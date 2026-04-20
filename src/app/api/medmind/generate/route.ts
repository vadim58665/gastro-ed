import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { checkDailyCap, dailyCapResponse, logApiUsage } from "../../_lib/cost-tracker";
import { generateText, estimateCostUsd } from "../../_lib/claude";
import type { ContentType } from "@/types/medmind";

// Общие стилевые правила для всех промптов на русском. ЛЛМ часто
// натягивает букву мнемоники под несуществующее слово («Ы — ыстрая»)
// или ставит двойной дефис `--` вместо обычной пунктуации. Эти
// инструкции отсекают оба паттерна на уровне промпта.
const RU_STYLE_RULES = `Стилевые правила:
- Только реально существующие русские слова. Если буква не начинает
  уместного слова — пропусти её или замени всю строку короткой фразой
  без подгонки под букву.
- Не используй двойной дефис "--" и длинное тире в тексте. Используй
  обычные знаки препинания (запятая, точка с запятой, короткий дефис).
- Никаких эмодзи и декоративных символов.`;

const PROMPTS: Record<string, string> = {
  mnemonic_acronym: `Создай мнемонический АКРОНИМ на русском для запоминания.
Правила: клинически точно, кратко, запоминающийся.
${RU_STYLE_RULES}
Ответ в JSON: { "mnemonic": "...", "explanation": "..." }`,

  mnemonic_story: `Создай короткую яркую ИСТОРИЮ-мнемонику на русском.
Правила: медицинские факты вплетены в запоминающийся сюжет, 3-5 предложений.
${RU_STYLE_RULES}
Ответ в JSON: { "mnemonic": "...", "explanation": "..." }`,

  mnemonic_rhyme: `Создай рифмованную МНЕМОНИКУ на русском (4-6 строк).
Правила: рифма, ритм, медицинская точность.
${RU_STYLE_RULES}
Ответ в JSON: { "mnemonic": "...", "explanation": "..." }`,

  memory_poem: `Создай короткое стихотворение для запоминания (4-8 строк, русский).
Правила: рифма, включить ключевые факты, медицински точно.
${RU_STYLE_RULES}
Ответ в JSON: { "poem": "...", "facts_covered": ["..."] }`,

  flashcard: `Создай учебную карточку.
${RU_STYLE_RULES}
Ответ в JSON: { "front": "вопрос", "back": "ответ + объяснение" }`,

  explanation: `Объясни кратко и понятно для врача.
${RU_STYLE_RULES}
Ответ в JSON: { "explanation": "..." }`,

  tip: `Дай короткую подсказку для запоминания этой темы (1-2 предложения).
${RU_STYLE_RULES}
Ответ в JSON: { "tip": "..." }`,
};

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "generate");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const withinCap = await checkDailyCap(userId);
    if (!withinCap) return dailyCapResponse();

    const body = await req.json();
    const { type, topic, cardId, context } = body as {
      type: ContentType;
      topic: string;
      cardId?: string;
      context?: string;
    };

    if (!type || !topic) {
      return Response.json({ error: "type and topic required" }, { status: 400 });
    }

    // Check for cached content
    const supabase = getServiceSupabase();
    const { data: existing } = await supabase
      .from("ai_generated_content")
      .select("id, content_ru, image_url, source_refs, created_at")
      .eq("user_id", userId)
      .eq("topic", topic)
      .eq("content_type", type)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (existing) {
      return Response.json({
        id: existing.id,
        contentRu: existing.content_ru,
        imageUrl: existing.image_url,
        sourceRefs: existing.source_refs,
        cached: true,
      });
    }

    // Generate via Claude
    const promptBase = PROMPTS[type] ?? PROMPTS.explanation;
    const userPrompt = context
      ? `Тема: ${topic}. Карточка: ${context}.\n\n${promptBase}`
      : `Тема: ${topic}.\n\n${promptBase}`;

    const result = await generateText(userPrompt);
    const costUsd = estimateCostUsd(result.model, result.inputTokens, result.outputTokens);

    // Log usage
    await logApiUsage(userId, "generate", result.model, result.inputTokens, result.outputTokens, costUsd);

    // Save generated content
    const { data: saved } = await supabase
      .from("ai_generated_content")
      .insert({
        user_id: userId,
        card_id: cardId ?? null,
        topic,
        content_type: type,
        content_ru: result.text,
        model_used: result.model,
        tokens_used: result.inputTokens + result.outputTokens,
        cost_usd: costUsd,
      })
      .select("id")
      .single();

    return Response.json({
      id: saved?.id,
      contentRu: result.text,
      cached: false,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
