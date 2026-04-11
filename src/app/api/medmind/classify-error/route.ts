import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { buildSystemPrompt } from "../../_lib/prompts/system-prompt";
import { selectModel, estimateCost } from "../../_lib/model-router";
import { logApiUsage } from "../../_lib/cost-tracker";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (client) return client;
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return client;
}

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "analyze");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const body = await req.json();
    const { cardId, selectedAnswer, correctAnswer, cardText, topic } = body as {
      cardId: string;
      selectedAnswer: string;
      correctAnswer: string;
      cardText: string;
      topic: string;
    };

    if (!cardText || !correctAnswer || !selectedAnswer) {
      return Response.json({ error: "cardText, correctAnswer, selectedAnswer required" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt({
      action: "error_classify",
      topic,
      cardContext: {
        question: cardText,
        correctAnswer,
        userAnswer: selectedAnswer,
      },
    });

    const { model, maxTokens } = selectModel("error_classify");

    const userPrompt = `Вопрос: ${cardText}
Правильный ответ: ${correctAnswer}
Ответ пользователя: ${selectedAnswer}

Классифицируй ошибку.`;

    const response = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Log usage
    const cost = estimateCost(model, response.usage.input_tokens, response.usage.output_tokens);
    await logApiUsage(userId, "classify-error", model, response.usage.input_tokens, response.usage.output_tokens, cost);

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ errorType: "gap", explanation: text, recommendation: "", relatedTopics: [] });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Save classification to user_answers
    if (cardId) {
      const supabase = getServiceSupabase();
      await supabase
        .from("user_answers")
        .update({
          error_type: parsed.errorType,
          error_explanation: parsed.explanation,
        })
        .eq("user_id", userId)
        .eq("card_id", cardId)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    return Response.json(parsed);
  } catch (err) {
    return errorResponse(err);
  }
}
