import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { TIER_CONFIGS } from "@/types/medmind";
import type { SubscriptionTier } from "@/types/medmind";

/**
 * GET /api/medmind/usage
 * Returns today's chat/explain/image counts + the current tier's daily limits,
 * so the Companion can display "8/40 chat · 2/15 explain" and degrade before
 * the user hits a 429.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const supabase = getServiceSupabase();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [subRes, usageRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("tier, status")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("ai_usage_log")
        .select("endpoint")
        .eq("user_id", userId)
        .gte("created_at", todayStart.toISOString()),
    ]);

    const tier: SubscriptionTier =
      (subRes.data?.status === "active" || subRes.data?.status === "trial"
        ? (subRes.data?.tier as SubscriptionTier)
        : "free") ?? "free";

    const limits = TIER_CONFIGS[tier];

    const counts = { chat: 0, explain: 0, image: 0 };
    for (const row of usageRes.data ?? []) {
      const ep = (row as { endpoint: string }).endpoint;
      if (ep === "chat") counts.chat += 1;
      else if (ep === "generate" || ep === "analyze") counts.explain += 1;
      else if (ep === "image") counts.image += 1;
    }

    return Response.json({
      tier,
      date: todayStart.toISOString().slice(0, 10),
      usage: {
        chat: { used: counts.chat, limit: limits.chatPerDay },
        explain: { used: counts.explain, limit: limits.explanationsPerDay },
        image: { used: counts.image, limit: limits.imagesPerDay },
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
