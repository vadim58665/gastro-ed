// In-memory token bucket rate limiter with tier-based limits

import type { SubscriptionTier } from "@/types/medmind";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

interface RateLimitConfig {
  maxTokens: number;
  refillMs: number;
}

// Default limits (free tier / non-tier endpoints)
const CONFIGS: Record<string, RateLimitConfig> = {
  analyze: { maxTokens: 5, refillMs: 3600_000 },
  generate: { maxTokens: 20, refillMs: 3600_000 },
  chat: { maxTokens: 10, refillMs: 3600_000 },
  image: { maxTokens: 2, refillMs: 3600_000 },
  session: { maxTokens: 3, refillMs: 3600_000 },
  validate: { maxTokens: 10, refillMs: 3600_000 },
  // Prebuilt content lookup: no token cost, only anti-spam
  prebuilt: { maxTokens: 500, refillMs: 86400_000 },
  // Read-only counters and history: hourly cap against runaway clients.
  usage: { maxTokens: 60, refillMs: 3600_000 },
  history: { maxTokens: 30, refillMs: 3600_000 },
  "subscription/create": { maxTokens: 5, refillMs: 3600_000 },
  "subscription/status": { maxTokens: 30, refillMs: 3600_000 },
};

// Tier-based chat limits (per day = 86400_000ms)
// Adjusted for profitability after token optimization (-30% cost)
const TIER_CHAT_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,
  feed_helper: 10,
  accred_basic: 25,
  accred_mentor: 40,
  accred_tutor: 60,
  accred_extreme: 80,
};

const TIER_EXPLAIN_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,
  feed_helper: 5,
  accred_basic: 7,
  accred_mentor: 15,
  accred_tutor: 30,
  accred_extreme: 50,
};

const TIER_IMAGE_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,
  feed_helper: 1,
  accred_basic: 1,
  accred_mentor: 3,
  accred_tutor: 5,
  accred_extreme: 10,
};

export function checkRateLimit(
  userId: string,
  endpoint: string,
  tier?: SubscriptionTier
): { allowed: boolean; retryAfterMs?: number } {
  let config: RateLimitConfig;

  // Use tier-based limits for AI endpoints
  if (tier && endpoint === "chat") {
    config = { maxTokens: TIER_CHAT_LIMITS[tier] || 10, refillMs: 86400_000 };
  } else if (tier && (endpoint === "analyze" || endpoint === "generate")) {
    config = { maxTokens: TIER_EXPLAIN_LIMITS[tier] || 5, refillMs: 86400_000 };
  } else if (tier && endpoint === "image") {
    config = { maxTokens: TIER_IMAGE_LIMITS[tier] || 1, refillMs: 86400_000 };
  } else {
    config = CONFIGS[endpoint] ?? { maxTokens: 10, refillMs: 3600_000 };
  }

  if (config.maxTokens === 0) {
    return { allowed: false, retryAfterMs: 0 };
  }

  const key = `${userId}:${endpoint}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = (elapsed / config.refillMs) * config.maxTokens;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const timeToNext = ((1 - bucket.tokens) / config.maxTokens) * config.refillMs;
    return { allowed: false, retryAfterMs: Math.ceil(timeToNext) };
  }

  bucket.tokens -= 1;
  return { allowed: true };
}

export function rateLimitResponse(retryAfterMs: number) {
  return Response.json(
    { error: "Rate limit exceeded" },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
    }
  );
}
