import { getServiceSupabase } from "./auth";
import type { SubscriptionTier } from "@/types/medmind";

const TIER_DAILY_CAPS: Record<SubscriptionTier, number> = {
  free: 0,
  feed_helper: 0.20,
  accred_basic: 0.30,
  accred_mentor: 0.60,
  accred_tutor: 1.00,
  accred_extreme: 1.50,
};

const DEFAULT_DAILY_CAP_USD = 0.50;

export async function logApiUsage(
  userId: string,
  endpoint: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number
): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase.from("ai_usage_log").insert({
    user_id: userId,
    endpoint,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: costUsd,
  });
}

export async function checkDailyCap(userId: string, tier?: SubscriptionTier): Promise<boolean> {
  try {
    const cap = tier ? (TIER_DAILY_CAPS[tier] || DEFAULT_DAILY_CAP_USD) : DEFAULT_DAILY_CAP_USD;
    if (cap === 0) return false;

    const supabase = getServiceSupabase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("ai_usage_log")
      .select("cost_usd")
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString());

    if (!data) return true;
    const totalToday = data.reduce((sum, row) => sum + Number(row.cost_usd), 0);
    return totalToday < cap;
  } catch {
    // If DB is unavailable, allow request through
    return true;
  }
}

export function dailyCapResponse() {
  return Response.json(
    { error: "Daily AI usage limit reached. Try again tomorrow." },
    { status: 429 }
  );
}
