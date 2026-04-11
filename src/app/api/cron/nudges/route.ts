import { getServiceSupabase } from "../../_lib/auth";
import { generateNudgesForUser } from "../../_lib/nudge-generator";

/**
 * Cron: generate nudges for all active users.
 * Runs daily at 09:00 MSK via Vercel Cron.
 */
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  // Get active users (active in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: users } = await supabase
    .from("daily_activity")
    .select("user_id")
    .gte("date", sevenDaysAgo.slice(0, 10))
    .limit(500);

  if (!users || users.length === 0) {
    return Response.json({ processed: 0 });
  }

  const uniqueUserIds = [...new Set(users.map((u: { user_id: string }) => u.user_id))];
  let processed = 0;
  let errors = 0;

  for (const userId of uniqueUserIds) {
    try {
      await generateNudgesForUser(userId);
      processed++;
    } catch {
      errors++;
    }
  }

  return Response.json({ processed, errors, total: uniqueUserIds.length });
}
