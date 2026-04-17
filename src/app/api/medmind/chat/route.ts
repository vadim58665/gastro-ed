import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { checkDailyCap, dailyCapResponse, logApiUsage } from "../../_lib/cost-tracker";
import { streamChat, estimateCostUsd } from "../../_lib/claude";
import { fetchUserLearningProfile } from "../../_lib/user-profile";
import { getAppStatsForUser, searchAppContent } from "../../_lib/rag/app-content-index";
import { retrieveContext } from "../../_lib/rag";
import { selectModel } from "../../_lib/model-router";
import {
  snapshotToProfile,
  type AccreditationSnapshot,
} from "../../_lib/accreditation-snapshot";
import type { PromptContext } from "../../_lib/prompts/system-prompt";

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "chat");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const withinCap = await checkDailyCap(userId);
    if (!withinCap) return dailyCapResponse();

    const body = await req.json();
    const { message, contextTopic, history, mode, accreditationSnapshot } = body as {
      message: string;
      contextTopic?: string;
      history?: { role: "user" | "assistant"; content: string }[];
      mode?: "feed" | "accreditation" | "other";
      accreditationSnapshot?: AccreditationSnapshot;
    };

    if (!message) {
      return Response.json({ error: "message required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Save user message (non-blocking — DB may be unavailable in dev)
    Promise.resolve(
      supabase.from("medmind_chat_history").insert({
        user_id: userId,
        role: "user",
        content: message,
        context_topic: contextTopic ?? null,
      })
    ).catch(() => {});

    // Build messages array with history
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...(history ?? []).slice(-10),
      { role: "user" as const, content: message },
    ];

    const isFollowUp = (history?.length ?? 0) > 0;

    // Gather context for modular prompt system.
    // Skip heavy DB queries for follow-up messages (uses Haiku anyway).
    const [feedProfile, appStats, wikiContext] = isFollowUp
      ? [null, { totalCards: 0, totalSpecialties: 0, totalAccreditationQuestions: 0 }, ""]
      : await Promise.all([
          fetchUserLearningProfile(userId).catch(() => null),
          getAppStatsForUser().catch(() => ({
            totalCards: 0,
            totalSpecialties: 0,
            totalAccreditationQuestions: 0,
          })),
          contextTopic
            ? retrieveContext(contextTopic, undefined, 1000).catch(() => "")
            : Promise.resolve(""),
        ]);

    // Two-channel profile: if user is in accreditation mode, swap the feed
    // profile for the client-supplied accreditation snapshot so the assistant
    // talks about the right weak topics / blocks / exam results.
    let userProfile = feedProfile;
    if (
      !isFollowUp &&
      mode === "accreditation" &&
      accreditationSnapshot &&
      accreditationSnapshot.specialty
    ) {
      userProfile = snapshotToProfile(
        accreditationSnapshot,
        feedProfile?.tier ?? "free"
      );
    } else if (feedProfile && mode === "feed") {
      userProfile = { ...feedProfile, mode: "feed" };
    } else if (mode === "accreditation") {
      // Accreditation mode без валидного snapshot: принудительно помечаем mode,
      // чтобы промпт не соврал про «ленту карточек» и не вставил feed-метки.
      userProfile = feedProfile
        ? { ...feedProfile, mode: "accreditation" }
        : null;
    }

    // Hybrid RAG: extend wiki context with matching cards/questions from the
    // app itself so the assistant can cite what users see in the UI.
    const appMatchText = !isFollowUp
      ? await searchAppContent(contextTopic || message, {
          limit: 3,
          preferType:
            mode === "accreditation"
              ? "accreditation_question"
              : mode === "feed"
                ? "card"
                : undefined,
        }).catch(() => "")
      : "";
    const ragContext = [wikiContext, appMatchText].filter(Boolean).join("\n\n");

    const promptContext: PromptContext = {
      action: "chat",
      specialty: userProfile?.specialty,
      topic: contextTopic ?? undefined,
      userProfile: userProfile ?? undefined,
      appStats,
      ragContext: ragContext || undefined,
    };

    // Determine model
    const { model } = selectModel("chat", { isFollowUp });

    // Stream response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(messages, {
            promptContext,
            isFollowUp,
          })) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }

          // Save assistant response (non-blocking)
          Promise.resolve(
            supabase.from("medmind_chat_history").insert({
              user_id: userId,
              role: "assistant",
              content: fullResponse,
              context_topic: contextTopic ?? null,
            })
          ).catch(() => {});

          // Estimate cost (non-blocking)
          const estimatedInput = messages.reduce((s, m) => s + m.content.length / 4, 0);
          const estimatedOutput = fullResponse.length / 4;
          const cost = estimateCostUsd(model, Math.round(estimatedInput), Math.round(estimatedOutput));
          logApiUsage(userId, "chat", model, Math.round(estimatedInput), Math.round(estimatedOutput), cost).catch(() => {});

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
