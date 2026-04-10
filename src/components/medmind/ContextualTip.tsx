"use client";

import { useState, useCallback } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import type { CardHistoryEntry } from "@/types/user";

interface Props {
  cardId: string;
  topic: string;
  cardHistory?: CardHistoryEntry;
}

async function getToken(): Promise<string | null> {
  const { getSupabase } = await import("@/lib/supabase/client");
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export default function ContextualTip({ cardId, topic, cardHistory }: Props) {
  const { isPro, engagementLevel } = useSubscription();
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only show for Pro users on medium/maximum, when struggling
  const isStruggling =
    cardHistory &&
    (cardHistory.consecutiveFails >= 2 ||
      (cardHistory.attempts >= 3 &&
        cardHistory.correct / cardHistory.attempts < 0.4));

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/medmind/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "tip", topic, cardId }),
      });

      if (res.ok) {
        const data = await res.json();
        setTip(data.contentRu);
      }
    } catch {
      // Ignore
    }
    setLoading(false);
  }, [topic, cardId]);

  if (!isPro || engagementLevel === "light") return null;
  if (!isStruggling && !tip) return null;

  if (tip) {
    return (
      <div className="mt-3 border-l-2 border-primary/20 pl-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-primary mb-1">
          MEDMIND
        </p>
        <p className="text-sm text-foreground/70 leading-relaxed">{tip}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="mt-3 text-xs text-primary btn-press disabled:opacity-50"
    >
      {loading ? "Генерирую подсказку..." : "MedMind: получить подсказку"}
    </button>
  );
}
