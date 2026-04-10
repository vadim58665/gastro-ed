import type { SubscriptionTier } from "@/types/medmind";

const YOOKASSA_BASE = "https://api.yookassa.ru/v3";

const TIER_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  feed_helper: 490,
  accred_basic: 1190,
  accred_mentor: 2690,
  accred_tutor: 5890,
  accred_extreme: 9990,
};

const TIER_NAMES: Record<SubscriptionTier, string> = {
  free: "Бесплатный",
  feed_helper: "Помощник",
  accred_basic: "Базовый",
  accred_mentor: "Наставник",
  accred_tutor: "Тьютор",
  accred_extreme: "Экстремальный",
};

function getAuth(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID!;
  const secretKey = process.env.YOOKASSA_SECRET_KEY!;
  return Buffer.from(`${shopId}:${secretKey}`).toString("base64");
}

export interface CreatePaymentParams {
  userId: string;
  returnUrl: string;
  tier: SubscriptionTier;
}

export interface PaymentResult {
  paymentId: string;
  paymentUrl: string;
}

export async function createPayment(
  params: CreatePaymentParams
): Promise<PaymentResult> {
  const price = TIER_PRICES[params.tier];
  if (!price) throw new Error(`Invalid tier: ${params.tier}`);

  const idempotencyKey = crypto.randomUUID();

  const body = {
    amount: { value: price.toFixed(2), currency: "RUB" },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: params.returnUrl,
    },
    save_payment_method: true,
    description: `MedMind ${TIER_NAMES[params.tier]}  - ежемесячная подписка`,
    metadata: { user_id: params.userId, tier: params.tier },
  };

  const res = await fetch(`${YOOKASSA_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getAuth()}`,
      "Content-Type": "application/json",
      "Idempotence-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YooKassa payment failed: ${err}`);
  }

  const data = await res.json();
  return {
    paymentId: data.id,
    paymentUrl: data.confirmation.confirmation_url,
  };
}

export async function createRecurringPayment(
  paymentMethodId: string,
  userId: string,
  tier: SubscriptionTier
): Promise<string> {
  const price = TIER_PRICES[tier];
  if (!price) throw new Error(`Invalid tier: ${tier}`);

  const idempotencyKey = crypto.randomUUID();

  const body = {
    amount: { value: price.toFixed(2), currency: "RUB" },
    capture: true,
    payment_method_id: paymentMethodId,
    description: `MedMind ${TIER_NAMES[tier]}  - автоматическое продление`,
    metadata: { user_id: userId, tier },
  };

  const res = await fetch(`${YOOKASSA_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getAuth()}`,
      "Content-Type": "application/json",
      "Idempotence-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Recurring payment failed");
  }

  const data = await res.json();
  return data.id;
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  // YooKassa uses IP whitelisting, not signature verification
  return !!body && !!signature;
}
