import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { createPayment } from "../../_lib/yookassa";
import type { SubscriptionTier } from "@/types/medmind";

const VALID_TIERS: SubscriptionTier[] = [
  "feed_helper",
  "accred_basic",
  "accred_mentor",
  "accred_tutor",
  "accred_extreme",
];

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "subscription/create");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const body = await req.json().catch(() => ({}));
    const isTrial = body.trial === true;
    const tier = (body.tier as SubscriptionTier) || "accred_basic";
    const supabase = getServiceSupabase();

    if (isTrial) {
      const trialEndsAt = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString();

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        status: "trial",
        plan: "pro",
        tier: "accred_basic",
        trial_ends_at: trialEndsAt,
        updated_at: new Date().toISOString(),
      });

      return Response.json({ status: "trial", trialEndsAt });
    }

    if (!VALID_TIERS.includes(tier)) {
      return Response.json({ error: "Invalid tier" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? "";
    const result = await createPayment({
      userId,
      tier,
      returnUrl: `${origin}/subscription?status=success`,
    });

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      tier,
      plan: "pro",
      yookassa_payment_id: result.paymentId,
      updated_at: new Date().toISOString(),
    });

    return Response.json({
      paymentUrl: result.paymentUrl,
      paymentId: result.paymentId,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
