import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { checkDailyCap, dailyCapResponse, logApiUsage } from "../../_lib/cost-tracker";
import { buildSystemPrompt } from "../../_lib/prompts/system-prompt";
import { selectModel, estimateCost } from "../../_lib/model-router";
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

    const rl = checkRateLimit(userId, "image");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const withinCap = await checkDailyCap(userId);
    if (!withinCap) return dailyCapResponse();

    const body = await req.json();
    const { topic, concept, cardId } = body as {
      topic: string;
      concept: string;
      cardId?: string;
    };

    if (!topic || !concept) {
      return Response.json({ error: "topic and concept required" }, { status: 400 });
    }

    // Step 1: Generate image description via Haiku
    const systemPrompt = buildSystemPrompt({
      action: "image_prompt",
      topic,
    });

    const { model } = selectModel("image_prompt");

    const promptResponse = await getClient().messages.create({
      model,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Создай описание визуальной ассоциации для запоминания: ${concept} (тема: ${topic})`,
      }],
    });

    const imageDescription = promptResponse.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const promptCost = estimateCost(model, promptResponse.usage.input_tokens, promptResponse.usage.output_tokens);
    await logApiUsage(userId, "image-prompt", model, promptResponse.usage.input_tokens, promptResponse.usage.output_tokens, promptCost);

    // Step 2: Generate image via fal.ai
    let imageUrl: string | null = null;
    const falApiKey = process.env.FAL_API_KEY;

    if (falApiKey) {
      try {
        const falResponse = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
          method: "POST",
          headers: {
            Authorization: `Key ${falApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: `Medical education illustration: ${imageDescription}. Clean, professional, educational style, no text, bright colors, simple composition.`,
            image_size: "square_hd",
            num_inference_steps: 4,
            num_images: 1,
          }),
        });

        if (falResponse.ok) {
          const falData = await falResponse.json();
          imageUrl = falData.images?.[0]?.url ?? null;
        }
      } catch {
        // Image generation failed, return description only
      }
    }

    // Step 3: Save to user_saved_content
    const supabase = getServiceSupabase();
    const { data: saved } = await supabase
      .from("user_saved_content")
      .insert({
        user_id: userId,
        content_type: "image",
        topic,
        question_context: concept,
        content_ru: imageDescription,
        image_url: imageUrl,
        metadata: { cardId },
      })
      .select("id")
      .single();

    return Response.json({
      id: saved?.id,
      description: imageDescription,
      imageUrl,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
