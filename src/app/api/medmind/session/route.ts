import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "session");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const supabase = getServiceSupabase();

    // Get weak topics from knowledge graph
    const { data: weakTopics } = await supabase
      .from("knowledge_graph")
      .select("topic, error_rate, mastery_score")
      .eq("user_id", userId)
      .eq("is_weak", true)
      .order("error_rate", { ascending: false })
      .limit(5);

    // Get due review cards
    const { data: dueCards } = await supabase
      .from("review_cards")
      .select("card_id")
      .eq("user_id", userId)
      .lte("due", new Date().toISOString())
      .limit(20);

    // Get card metadata to map topics to card IDs
    const { demoCards } = await import("@/data/cards");
    const cardsByTopic = new Map<string, string[]>();
    const allCardIds = new Set<string>();

    for (const card of demoCards) {
      allCardIds.add(card.id);
      const existing = cardsByTopic.get(card.topic) ?? [];
      existing.push(card.id);
      cardsByTopic.set(card.topic, existing);
    }

    // Get user's seen cards to find new ones
    const { data: seenRows } = await supabase
      .from("user_answers")
      .select("card_id")
      .eq("user_id", userId);

    const seenCardIds = new Set((seenRows ?? []).map((r) => r.card_id));

    // Build session: 60% weak + 30% review + 10% new
    const weakCardIds: string[] = [];
    for (const wt of weakTopics ?? []) {
      const topicCards = cardsByTopic.get(wt.topic) ?? [];
      weakCardIds.push(...topicCards.slice(0, 4));
    }

    const reviewCardIds = (dueCards ?? []).map((r) => r.card_id).slice(0, 6);

    const newCardIds: string[] = [];
    for (const cardId of allCardIds) {
      if (!seenCardIds.has(cardId) && newCardIds.length < 3) {
        newCardIds.push(cardId);
      }
    }

    const focusTopic = weakTopics?.[0]?.topic ?? "";
    const totalCards = weakCardIds.length + reviewCardIds.length + newCardIds.length;
    const estimatedMinutes = Math.ceil(totalCards * 0.5); // ~30 sec per card

    return Response.json({
      weakCards: weakCardIds,
      reviewCards: reviewCardIds,
      newCards: newCardIds,
      focusTopic,
      estimatedMinutes,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
