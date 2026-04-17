import type { UserLearningProfile } from "./prompts/user-context";
import { getServiceSupabase } from "./auth";

// In-memory cache with 10-minute TTL to avoid 7+ DB queries per request
const profileCache = new Map<string, { data: UserLearningProfile; expiry: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches user's learning profile from Supabase for prompt injection.
 * Aggregates data from knowledge_graph, user_answers, profiles, and subscriptions.
 * Results are cached for 10 minutes to reduce DB load.
 */
export async function fetchUserLearningProfile(
  userId: string
): Promise<UserLearningProfile | null> {
  const cached = profileCache.get(userId);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  const supabase = getServiceSupabase();

  // Parallel queries
  const [profileRes, weakRes, strongRes, errorsRes, progressRes] =
    await Promise.all([
      // User profile + subscription
      supabase
        .from("profiles")
        .select("specialty, accreditation_category, preferred_difficulty")
        .eq("id", userId)
        .maybeSingle(),

      // Weak topics (error_rate > 0.4)
      supabase
        .from("knowledge_graph")
        .select("topic, specialty, error_rate")
        .eq("user_id", userId)
        .gt("error_rate", 0.4)
        .order("error_rate", { ascending: false })
        .limit(5),

      // Strong topics (mastery > 0.85)
      supabase
        .from("knowledge_graph")
        .select("topic, mastery_score")
        .eq("user_id", userId)
        .gt("mastery_score", 0.85)
        .order("mastery_score", { ascending: false })
        .limit(3),

      // Recent wrong answers
      supabase
        .from("user_answers")
        .select("card_id, is_correct")
        .eq("user_id", userId)
        .eq("is_correct", false)
        .order("created_at", { ascending: false })
        .limit(15),

      // Overall stats
      supabase
        .from("user_answers")
        .select("is_correct")
        .eq("user_id", userId),
    ]);

  if (!profileRes.data) return null;

  const profile = profileRes.data;

  // Calculate overall accuracy
  const allAnswers = progressRes.data ?? [];
  const totalAttempts = allAnswers.length;
  const correctCount = allAnswers.filter(
    (a: { is_correct: boolean }) => a.is_correct
  ).length;
  const overallAccuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0;

  // Map card IDs to topics for recent errors (using dynamic import to avoid bundling)
  const { demoCards } = await import("@/data/cards");
  const cardMeta = new Map<
    string,
    { topic: string; type: string }
  >();
  for (const card of demoCards) {
    cardMeta.set(card.id, { topic: card.topic, type: card.type });
  }

  const recentErrors = (errorsRes.data ?? [])
    .slice(0, 5)
    .map((e: { card_id: string }) => {
      const meta = cardMeta.get(e.card_id);
      return {
        topic: meta?.topic ?? "Неизвестно",
        cardType: meta?.type ?? "unknown",
        question: "", // We don't store question text in user_answers
      };
    });

  // Get streak from daily_activity or progress
  let currentStreak = 0;
  const { data: streakData } = await supabase
    .from("profiles")
    .select("streak_current")
    .eq("id", userId)
    .maybeSingle();
  if (streakData?.streak_current) {
    currentStreak = streakData.streak_current;
  }

  // Get subscription tier
  let tier: UserLearningProfile["tier"] = "free";
  const { data: subData } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (subData?.tier) {
    tier = subData.tier;
  }

  const result: UserLearningProfile = {
    specialty: profile.specialty ?? "Лечебное дело",
    mode: "feed",
    accreditationCategory: profile.accreditation_category,
    weakTopics: (weakRes.data ?? []).map(
      (t: { topic: string; error_rate: number; specialty: string }) => ({
        topic: t.topic,
        errorRate: t.error_rate,
        specialty: t.specialty,
      })
    ),
    strongTopics: (strongRes.data ?? []).map(
      (t: { topic: string; mastery_score: number }) => ({
        topic: t.topic,
        masteryScore: t.mastery_score,
      })
    ),
    recentErrors,
    totalAttempts,
    overallAccuracy,
    currentStreak,
    tier,
    preferredDifficulty: profile.preferred_difficulty,
  };

  // Cache result
  profileCache.set(userId, { data: result, expiry: Date.now() + CACHE_TTL_MS });

  // Evict stale entries periodically (keep cache small)
  if (profileCache.size > 100) {
    const now = Date.now();
    for (const [key, val] of profileCache) {
      if (now > val.expiry) profileCache.delete(key);
    }
  }

  return result;
}
