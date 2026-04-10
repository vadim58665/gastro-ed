import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "analyze");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const supabase = getServiceSupabase();

    // Fetch all user answers
    const { data: answers } = await supabase
      .from("user_answers")
      .select("card_id, is_correct")
      .eq("user_id", userId);

    if (!answers || answers.length === 0) {
      return Response.json({ weakTopics: [], strengths: [] });
    }

    // We need card metadata to map card_id -> topic
    // Import dynamically to avoid bundling all cards in API route
    const { demoCards } = await import("@/data/cards");
    const cardMeta = new Map<string, { topic: string; specialty: string }>();
    for (const card of demoCards) {
      cardMeta.set(card.id, { topic: card.topic, specialty: card.specialty });
    }

    // Aggregate by topic
    const topicStats = new Map<
      string,
      { specialty: string; attempted: number; correct: number }
    >();

    for (const answer of answers) {
      const meta = cardMeta.get(answer.card_id);
      if (!meta) continue;

      const existing = topicStats.get(meta.topic);
      if (existing) {
        existing.attempted++;
        if (answer.is_correct) existing.correct++;
      } else {
        topicStats.set(meta.topic, {
          specialty: meta.specialty,
          attempted: 1,
          correct: answer.is_correct ? 1 : 0,
        });
      }
    }

    // Upsert knowledge graph
    const rows = [];
    const weakTopics = [];
    const strengths = [];

    for (const [topic, stats] of topicStats) {
      const errorRate =
        stats.attempted > 0
          ? (stats.attempted - stats.correct) / stats.attempted
          : 0;
      const masteryScore = stats.attempted > 0 ? stats.correct / stats.attempted : 0;

      const row = {
        user_id: userId,
        topic,
        specialty: stats.specialty,
        cards_attempted: stats.attempted,
        cards_correct: stats.correct,
        error_rate: Math.round(errorRate * 10000) / 10000,
        mastery_score: Math.round(masteryScore * 10000) / 10000,
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      rows.push(row);

      const entry = {
        topic,
        specialty: stats.specialty,
        errorRate: row.error_rate,
        masteryScore: row.mastery_score,
        cardsAttempted: stats.attempted,
        cardsCorrect: stats.correct,
        isWeak: errorRate > 0.4,
      };

      if (errorRate > 0.4) {
        weakTopics.push(entry);
      } else if (masteryScore > 0.85) {
        strengths.push(entry);
      }
    }

    // Batch upsert to knowledge_graph
    if (rows.length > 0) {
      await supabase.from("knowledge_graph").upsert(rows);
    }

    // Sort weak topics by error rate desc
    weakTopics.sort((a, b) => b.errorRate - a.errorRate);

    return Response.json({ weakTopics, strengths });
  } catch (err) {
    return errorResponse(err);
  }
}
