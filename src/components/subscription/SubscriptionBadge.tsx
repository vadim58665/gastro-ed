"use client";

import { useSubscription } from "@/hooks/useSubscription";

export default function SubscriptionBadge() {
  const { isPro, subscription } = useSubscription();

  if (!isPro) return null;

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-[0.15em] font-medium bg-primary-light text-primary">
      PRO
      {subscription.status === "trial" && (
        <span className="ml-1 text-muted">TRIAL</span>
      )}
    </span>
  );
}
