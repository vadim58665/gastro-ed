import { authenticateRequest, errorResponse } from "../../_lib/auth";
import { getServiceSupabase } from "../../_lib/auth";

export async function GET(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "status, plan, tier, engagement_level, trial_ends_at, current_period_end"
      )
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return Response.json({
        status: "inactive",
        plan: "free",
        tier: "free",
        engagementLevel: "medium",
      });
    }

    // Check if trial expired
    if (
      data.status === "trial" &&
      data.trial_ends_at &&
      new Date(data.trial_ends_at) < new Date()
    ) {
      await supabase
        .from("subscriptions")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      return Response.json({
        status: "inactive",
        plan: "free",
        tier: "free",
        engagementLevel: data.engagement_level,
      });
    }

    return Response.json({
      status: data.status,
      plan: data.plan,
      tier: data.tier ?? "free",
      engagementLevel: data.engagement_level,
      trialEndsAt: data.trial_ends_at,
      currentPeriodEnd: data.current_period_end,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
