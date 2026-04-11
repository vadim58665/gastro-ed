import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { checkDailyCap, dailyCapResponse, logApiUsage } from "../../_lib/cost-tracker";
import { buildSystemPrompt } from "../../_lib/prompts/system-prompt";
import { selectModel, estimateCost } from "../../_lib/model-router";
import { fetchUserLearningProfile } from "../../_lib/user-profile";
import { getAppStatsForUser } from "../../_lib/rag/app-content-index";
import { retrieveContext } from "../../_lib/rag";
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

    const rl = checkRateLimit(userId, "generate");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const withinCap = await checkDailyCap(userId);
    if (!withinCap) return dailyCapResponse();

    const body = await req.json();
    const { topic, specialty, intensity } = body as {
      topic: string;
      specialty?: string;
      intensity?: "fast" | "standard" | "deep";
    };

    if (!topic) {
      return Response.json({ error: "topic required" }, { status: 400 });
    }

    // Gather context
    const userProfile = await fetchUserLearningProfile(userId);
    const userSpec = specialty ?? userProfile?.specialty;
    const [appStats, ragContext] = await Promise.all([
      getAppStatsForUser(userSpec),
      retrieveContext(topic, specialty),
    ]);

    const systemPrompt = buildSystemPrompt({
      action: "learning_plan",
      specialty: specialty ?? userProfile?.specialty,
      topic,
      userProfile: userProfile ?? undefined,
      appStats,
      ragContext: ragContext || undefined,
    });

    const { model, maxTokens } = selectModel("learning_plan");

    const intensityHint = intensity
      ? `Интенсивность: ${intensity === "fast" ? "ускоренный" : intensity === "deep" ? "углублённый" : "стандартный"}`
      : "";

    const userPrompt = `Составь учебный план по теме: ${topic}${intensityHint ? `\n${intensityHint}` : ""}`;

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
    await logApiUsage(userId, "learning-plan", model, response.usage.input_tokens, response.usage.output_tokens, cost);

    // Try to parse JSON plan
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let plan = null;
    if (jsonMatch) {
      try {
        plan = JSON.parse(jsonMatch[0]);
      } catch {
        // JSON parse failed, return raw text
      }
    }

    // Auto-save plan to user_saved_content
    if (plan) {
      const supabase = getServiceSupabase();
      await supabase.from("user_saved_content").insert({
        user_id: userId,
        content_type: "learning_plan",
        specialty: specialty ?? userProfile?.specialty ?? null,
        topic,
        content_ru: text,
        metadata: { plan, intensity: intensity ?? "standard" },
      });
    }

    return Response.json({ plan, rawText: text });
  } catch (err) {
    return errorResponse(err);
  }
}
