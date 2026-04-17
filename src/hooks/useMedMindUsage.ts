"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export interface UsageSlot {
  used: number;
  limit: number;
}

export interface UsageData {
  tier: string;
  date: string;
  usage: {
    chat: UsageSlot;
    explain: UsageSlot;
    image: UsageSlot;
  };
}

async function getToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;
  return process.env.NEXT_PUBLIC_DEV_MODE === "true" ? "dev-test-token" : "";
}

/**
 * Fetches today's AI usage counters for the current user. Refetches on-demand
 * (e.g. after a streaming chat completes) and when `openKey` changes — pass
 * the Companion open/close state so counters refresh when the panel opens.
 */
export function useMedMindUsage(openKey: boolean) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setData(null);
        return;
      }
      const tz = (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        } catch {
          return "UTC";
        }
      })();
      const res = await fetch(
        `/api/medmind/usage?tz=${encodeURIComponent(tz)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setData((await res.json()) as UsageData);
      } else {
        // Non-ok (401 из-за истёкшего токена, 429, 500) — очищаем
        // счётчики, чтобы не показывать устаревшие данные.
        setData(null);
      }
    } catch {
      /* swallow — counters are decorative */
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openKey) refetch();
  }, [openKey, refetch]);

  return { data, loading, refetch };
}
