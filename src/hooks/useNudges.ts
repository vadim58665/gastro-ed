"use client";

import { useState, useCallback, useEffect } from "react";
import type { Nudge } from "@/types/medmind";

async function getToken(): Promise<string | null> {
  const { getSupabase } = await import("@/lib/supabase/client");
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export function useNudges() {
  const [nudges, setNudges] = useState<Nudge[]>([]);

  const fetchNudges = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const res = await fetch("/api/medmind/nudge", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNudges(
          (data.nudges ?? []).map((n: any) => ({
            id: n.id,
            type: n.type,
            titleRu: n.title_ru,
            bodyRu: n.body_ru,
            actionUrl: n.action_url,
            isRead: n.is_read,
            createdAt: n.created_at,
          }))
        );
      }
    } catch {
      // Network error
    }
  }, []);

  useEffect(() => {
    fetchNudges();
  }, [fetchNudges]);

  const dismissNudge = useCallback(async (id: string) => {
    const token = await getToken();
    if (!token) return;

    try {
      await fetch("/api/medmind/nudge", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      setNudges((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Network error
    }
  }, []);

  return { nudges, dismissNudge, refresh: fetchNudges };
}
