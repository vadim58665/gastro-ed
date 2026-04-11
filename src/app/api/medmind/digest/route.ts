import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";

/** GET: fetch latest weekly digest for the current user */
export async function GET(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const supabase = getServiceSupabase();

    const { data } = await supabase
      .from("weekly_digests")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return Response.json({ digest: null });
    }

    return Response.json({
      digest: {
        weekStart: data.week_start,
        weekEnd: data.week_end,
        cardsAttempted: data.cards_attempted,
        cardsCorrect: data.cards_correct,
        accuracyPct: data.accuracy_pct,
        streakMaintained: data.streak_maintained,
        topicsStudied: data.topics_studied,
        weakTopics: data.weak_topics,
        improvedTopics: data.improved_topics,
        aiInsights: data.ai_insights,
        aiRecommendations: data.ai_recommendations,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
