import { getServiceSupabase } from "../../_lib/auth";
import { generateText } from "../../_lib/claude";

/**
 * Cron: generate weekly digests for all active users.
 * Runs every Monday at 08:00 MSK via Vercel Cron.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const now = new Date();
  const weekEnd = now.toISOString().slice(0, 10);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Get users with activity this week
  const { data: users } = await supabase
    .from("daily_activity")
    .select("user_id")
    .gte("date", weekStart)
    .limit(500);

  if (!users || users.length === 0) {
    return Response.json({ processed: 0 });
  }

  const uniqueUserIds = [...new Set(users.map((u: { user_id: string }) => u.user_id))];
  let processed = 0;

  for (const userId of uniqueUserIds) {
    try {
      // Aggregate week stats
      const { data: answers } = await supabase
        .from("user_answers")
        .select("is_correct, card_id")
        .eq("user_id", userId)
        .gte("created_at", weekStart)
        .lte("created_at", weekEnd + "T23:59:59Z");

      if (!answers || answers.length === 0) continue;

      const attempted = answers.length;
      const correct = answers.filter((a: { is_correct: boolean }) => a.is_correct).length;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

      // Get topics studied
      const { demoCards } = await import("@/data/cards");
      const cardMeta = new Map<string, string>();
      for (const c of demoCards) cardMeta.set(c.id, c.topic);

      const topicsSet = new Set<string>();
      for (const a of answers) {
        const topic = cardMeta.get(a.card_id);
        if (topic) topicsSet.add(topic);
      }
      const topicsStudied = [...topicsSet];

      // Get weak topics
      const { data: weakData } = await supabase
        .from("knowledge_graph")
        .select("topic")
        .eq("user_id", userId)
        .gt("error_rate", 0.4)
        .limit(5);
      const weakTopics = (weakData ?? []).map((w: { topic: string }) => w.topic);

      // Generate AI insights via Haiku
      let aiInsights = "";
      let aiRecommendations: string[] = [];

      try {
        const result = await generateText(
          `Пользователь за неделю: ${attempted} ответов, ${accuracy}% точность, изучал темы: ${topicsStudied.join(", ")}. Слабые темы: ${weakTopics.join(", ") || "нет"}. Дай 2-3 предложения персонального совета на русском.`,
          { model: "claude-haiku-4-5-20251001", maxTokens: 256 }
        );
        aiInsights = result.text;
        aiRecommendations = weakTopics.length > 0
          ? [`Уделите внимание теме "${weakTopics[0]}"`, "Используйте мнемоники для запоминания"]
          : ["Отличная работа! Попробуйте новые темы"];
      } catch {
        aiInsights = `На этой неделе вы ответили на ${attempted} вопросов с точностью ${accuracy}%.`;
      }

      // Check streak
      const { data: streakData } = await supabase
        .from("profiles")
        .select("streak_current")
        .eq("id", userId)
        .maybeSingle();

      // Upsert digest
      await supabase.from("weekly_digests").upsert({
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        cards_attempted: attempted,
        cards_correct: correct,
        accuracy_pct: accuracy,
        streak_maintained: (streakData?.streak_current ?? 0) > 0,
        topics_studied: topicsStudied,
        weak_topics: weakTopics,
        improved_topics: [],
        ai_insights: aiInsights,
        ai_recommendations: aiRecommendations,
      });

      processed++;
    } catch {
      // Skip user on error
    }
  }

  return Response.json({ processed, total: uniqueUserIds.length });
}
