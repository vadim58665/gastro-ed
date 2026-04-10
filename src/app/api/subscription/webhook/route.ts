import { getServiceSupabase } from "../../_lib/auth";

export async function POST(req: Request) {
  // Safety guard: until YOOKASSA_WEBHOOK_SECRET is set and HMAC-SHA1 signature
  // verification is implemented, refuse all incoming webhooks. Without this,
  // anyone could POST a fake "payment.succeeded" event and grant Pro access
  // to any user_id. See: https://yookassa.ru/developers/using-api/webhooks
  if (!process.env.YOOKASSA_WEBHOOK_SECRET) {
    return Response.json(
      { error: "webhook disabled: signature verification not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const event = body.event;

    if (event !== "payment.succeeded") {
      return Response.json({ ok: true });
    }

    const payment = body.object;
    const userId = payment.metadata?.user_id;
    if (!userId) {
      return Response.json({ error: "No user_id in metadata" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      status: "active",
      plan: "pro",
      yookassa_payment_id: payment.id,
      yookassa_subscription_id: payment.payment_method?.id ?? null,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("yookassa webhook:", err);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
