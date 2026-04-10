"use client";

import { useCallback } from "react";
import { useSubscriptionContext } from "@/contexts/SubscriptionContext";
import { useRouter } from "next/navigation";

export function useSubscription() {
  const ctx = useSubscriptionContext();
  const router = useRouter();

  const gate = useCallback(
    (callback: () => void) => {
      if (ctx.isPro) {
        callback();
      } else {
        router.push("/subscription");
      }
    },
    [ctx.isPro, router]
  );

  return {
    isPro: ctx.isPro,
    tier: ctx.tier,
    engagementLevel: ctx.engagementLevel,
    subscription: ctx.subscription,
    setEngagementLevel: ctx.setEngagementLevel,
    startTrial: ctx.startTrial,
    createPayment: ctx.createPayment,
    refreshSubscription: ctx.refreshSubscription,
    gate,
  };
}
