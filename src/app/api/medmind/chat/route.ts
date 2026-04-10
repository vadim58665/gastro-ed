import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { checkDailyCap, dailyCapResponse, logApiUsage } from "../../_lib/cost-tracker";
import { streamChat, estimateCostUsd } from "../../_lib/claude";

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "chat");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const withinCap = await checkDailyCap(userId);
    if (!withinCap) return dailyCapResponse();

    const body = await req.json();
    const { message, contextTopic, history } = body as {
      message: string;
      contextTopic?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message) {
      return Response.json({ error: "message required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Save user message
    await supabase.from("medmind_chat_history").insert({
      user_id: userId,
      role: "user",
      content: message,
      context_topic: contextTopic ?? null,
    });

    // Build messages array with history
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...(history ?? []).slice(-10), // Keep last 10 messages for context
      { role: "user" as const, content: message },
    ];

    const systemSuffix = contextTopic
      ? `Текущая тема обсуждения: ${contextTopic}`
      : undefined;

    // Stream response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(messages, systemSuffix)) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }

          // Save assistant response
          await supabase.from("medmind_chat_history").insert({
            user_id: userId,
            role: "assistant",
            content: fullResponse,
            context_topic: contextTopic ?? null,
          });

          // Estimate cost (rough: ~400 input + output length tokens)
          const estimatedInput = messages.reduce((s, m) => s + m.content.length / 4, 0);
          const estimatedOutput = fullResponse.length / 4;
          const cost = estimateCostUsd("claude-sonnet-4-20250514", Math.round(estimatedInput), Math.round(estimatedOutput));
          await logApiUsage(userId, "chat", "claude-sonnet-4-20250514", Math.round(estimatedInput), Math.round(estimatedOutput), cost);

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
