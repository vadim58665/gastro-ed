/**
 * Nudge generation logic.
 * Rule-based triggers with optional AI personalization via Haiku.
 */

import { getServiceSupabase } from "./auth";
import { generateText } from "./claude";
import type { NudgeType } from "@/types/medmind";

interface NudgeTemplate {
  type: NudgeType;
  titleRu: string;
  bodyRu: string;
  actionUrl?: string;
}

/**
 * Generate nudges for a single user based on their activity.
 * Only generates if user has medmind_proactive = true.
 */
export async function generateNudgesForUser(userId: string): Promise<void> {
  const supabase = getServiceSupabase();

  // Check if user wants proactive nudges
  const { data: profile } = await supabase
    .from("profiles")
    .select("medmind_proactive, specialty")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.medmind_proactive) return;

  const nudges: NudgeTemplate[] = [];

  // 1. Overdue review cards
  const { count: overdueCount } = await supabase
    .from("review_cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("due", new Date().toISOString());

  if (overdueCount && overdueCount > 5) {
    nudges.push({
      type: "overdue_review",
      titleRu: `${overdueCount} карточек ждут повторения`,
      bodyRu: "Интервальное повторение работает лучше, когда вы повторяете вовремя",
      actionUrl: "/review",
    });
  }

  // 2. Weak topic (error_rate > 0.5, not reviewed in 3 days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weakTopics } = await supabase
    .from("knowledge_graph")
    .select("topic, error_rate")
    .eq("user_id", userId)
    .gt("error_rate", 0.5)
    .lt("last_reviewed_at", threeDaysAgo)
    .order("error_rate", { ascending: false })
    .limit(1);

  if (weakTopics && weakTopics.length > 0) {
    const topic = weakTopics[0];
    nudges.push({
      type: "weak_topic",
      titleRu: `Тема "${topic.topic}" требует внимания`,
      bodyRu: `${Math.round(topic.error_rate * 100)}% ошибок. Попробуйте пройти карточки по этой теме`,
      actionUrl: `/feed?topic=${encodeURIComponent(topic.topic)}`,
    });
  }

  // 3. Streak risk (last active > 20 hours ago, streak > 3)
  const { data: activity } = await supabase
    .from("daily_activity")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1);

  if (activity && activity.length > 0) {
    const lastActive = new Date(activity[0].date);
    const hoursAgo = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);

    const { data: streakData } = await supabase
      .from("profiles")
      .select("streak_current")
      .eq("id", userId)
      .maybeSingle();

    if (hoursAgo > 20 && (streakData?.streak_current ?? 0) > 3) {
      nudges.push({
        type: "streak_risk",
        titleRu: `Серия ${streakData!.streak_current} дней под угрозой`,
        bodyRu: "Ответьте хотя бы на одну карточку, чтобы сохранить серию",
        actionUrl: "/feed",
      });
    }
  }

  // 4. Milestone detection
  const { count: totalAnswers } = await supabase
    .from("user_answers")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  const milestones = [100, 250, 500, 1000, 2500, 5000];
  const answersCount = totalAnswers ?? 0;
  for (const m of milestones) {
    if (answersCount >= m && answersCount < m + 10) {
      nudges.push({
        type: "milestone",
        titleRu: `${m} ответов - отличный результат!`,
        bodyRu: "Вы стабильно продвигаетесь. Продолжайте в том же духе",
      });
      break;
    }
  }

  // Save nudges (skip if similar nudge exists in last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const nudge of nudges) {
    const { data: existing } = await supabase
      .from("medmind_nudges")
      .select("id")
      .eq("user_id", userId)
      .eq("type", nudge.type)
      .gte("created_at", oneDayAgo)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      await supabase.from("medmind_nudges").insert({
        user_id: userId,
        type: nudge.type,
        title_ru: nudge.titleRu,
        body_ru: nudge.bodyRu,
        action_url: nudge.actionUrl ?? null,
        is_read: false,
      });
    }
  }
}
