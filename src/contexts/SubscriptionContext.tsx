"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import type {
  SubscriptionState,
  SubscriptionTier,
  EngagementLevel,
} from "@/types/medmind";

const STORAGE_KEY = "sd-subscription";

interface SubscriptionContextValue {
  subscription: SubscriptionState;
  isPro: boolean;
  tier: SubscriptionTier;
  engagementLevel: EngagementLevel;
  setEngagementLevel: (level: EngagementLevel) => void;
  refreshSubscription: () => Promise<void>;
  startTrial: () => Promise<void>;
  createPayment: (tier: SubscriptionTier) => Promise<string | null>;
}

const defaultSubscription: SubscriptionState = {
  status: "inactive",
  plan: "free",
  tier: "free",
  engagementLevel: "medium",
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: defaultSubscription,
  isPro: false,
  tier: "free",
  engagementLevel: "medium",
  setEngagementLevel: () => {},
  refreshSubscription: async () => {},
  startTrial: async () => {},
  createPayment: async () => null,
});

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}

function loadLocal(): SubscriptionState {
  if (typeof window === "undefined") return defaultSubscription;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultSubscription, ...JSON.parse(saved) } : defaultSubscription;
  } catch {
    return defaultSubscription;
  }
}

function saveLocal(state: SubscriptionState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function getAuthToken(): Promise<string | null> {
  // Dynamic import to avoid circular dependency
  const { getSupabase } = await import("@/lib/supabase/client");
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>(loadLocal);

  const isPro =
    process.env.NEXT_PUBLIC_DEV_MODE === "true" ||
    subscription.status === "active" ||
    subscription.status === "trial";

  const refreshSubscription = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;

    try {
      const res = await fetch("/api/subscription/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      const updated: SubscriptionState = {
        status: data.status,
        plan: data.plan,
        tier: data.tier ?? subscription.tier ?? "free",
        engagementLevel: data.engagementLevel ?? subscription.engagementLevel,
        trialEndsAt: data.trialEndsAt,
        currentPeriodEnd: data.currentPeriodEnd,
      };
      setSubscription(updated);
      saveLocal(updated);
    } catch {
      // Offline  - use cached
    }
  }, [subscription.engagementLevel]);

  const setEngagementLevel = useCallback(
    (level: EngagementLevel) => {
      const updated = { ...subscription, engagementLevel: level };
      setSubscription(updated);
      saveLocal(updated);

      // Async update to Supabase
      getAuthToken().then((token) => {
        if (!token) return;
        const { getSupabase } = require("@/lib/supabase/client");
        getSupabase()
          .from("subscriptions")
          .update({ engagement_level: level, updated_at: new Date().toISOString() })
          .eq("user_id", user?.id);
      });
    },
    [subscription, user]
  );

  const startTrial = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;

    const res = await fetch("/api/subscription/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trial: true }),
    });

    if (res.ok) {
      await refreshSubscription();
    }
  }, [refreshSubscription]);

  const createPayment = useCallback(async (tier: SubscriptionTier): Promise<string | null> => {
    const token = await getAuthToken();
    if (!token) return null;

    const res = await fetch("/api/subscription/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tier }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.paymentUrl ?? null;
  }, []);

  // Fetch subscription on login
  useEffect(() => {
    if (user) {
      refreshSubscription();
    }
  }, [user, refreshSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isPro,
        tier: subscription.tier ?? "free",
        engagementLevel: subscription.engagementLevel,
        setEngagementLevel,
        refreshSubscription,
        startTrial,
        createPayment,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
