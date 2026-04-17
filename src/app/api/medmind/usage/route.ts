import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { TIER_CONFIGS } from "@/types/medmind";
import type { SubscriptionTier } from "@/types/medmind";

/**
 * Вычисляет начало сегодняшнего дня в указанной IANA-таймзоне (UTC при невалидной).
 * Нужно, чтобы счётчик в UI сбрасывался в 00:00 по часам пользователя,
 * а не в 00:00 UTC (иначе для МСК ресет падает на 03:00 МСК).
 */
function startOfTodayInTz(tz: string): Date {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (!y || !m || !d) return startOfTodayInTz("UTC");
    // Сконструируем полночь в tz через оффсет: Date.parse локальной строки +
    // оффсет зоны. Проще — через `toLocaleString` с той же зоной.
    const midnightUtc = new Date(`${y}-${m}-${d}T00:00:00Z`);
    // Сдвиг: сколько показывает часы в tz для этой UTC-точки.
    const asInTz = new Date(
      midnightUtc.toLocaleString("en-US", { timeZone: tz })
    );
    const offsetMs = asInTz.getTime() - midnightUtc.getTime();
    return new Date(midnightUtc.getTime() - offsetMs);
  } catch {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
  }
}

/**
 * GET /api/medmind/usage?tz=Europe/Moscow
 * Returns today's chat/explain/image counts + the current tier's daily limits,
 * so the Companion can display "8/40 chat · 2/15 explain" and degrade before
 * the user hits a 429. Граница «сегодня» — в таймзоне клиента (fallback UTC).
 */
export async function GET(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const rl = checkRateLimit(userId, "usage");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);
    const supabase = getServiceSupabase();

    const url = new URL(req.url);
    const tz = url.searchParams.get("tz") ?? "UTC";
    const todayStart = startOfTodayInTz(tz);
    const dateLabel = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

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
      date: dateLabel,
      tz,
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
