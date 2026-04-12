import { getServiceSupabase } from "./auth";

const DAILY_CAP_USD = 0.5;

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

export async function checkDailyCap(userId: string): Promise<boolean> {
  try {
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
    return totalToday < DAILY_CAP_USD;
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
