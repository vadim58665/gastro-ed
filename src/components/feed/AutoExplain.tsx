"use client";

import { useEffect, useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { getSupabase } from "@/lib/supabase/client";

type EntityType = "card" | "accreditation_question";

interface Props {
  entityId: string;
  entityType?: EntityType;
  /** Only load when this flips true. */
  trigger: boolean;
}

async function getAuthToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;
  return process.env.NEXT_PUBLIC_DEV_MODE === "true" ? "dev-test-token" : "";
}

/**
 * Auto-expands explain_short from prebuilt_content after a wrong answer
 * for subscribers. Silently no-ops if:
 *   - user is free tier (hide entirely),
 *   - prebuilt content doesn't exist yet (404 → hide, don't spend tokens),
 *   - network error (hide).
 */
export default function AutoExplain({ entityId, entityType = "card", trigger }: Props) {
  const { isPro } = useSubscription();
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPro || !trigger || text !== null) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = await getAuthToken();
        const params = new URLSearchParams({
          entityType,
          entityId,
          contentType: "explain_short",
        });
        const res = await fetch(`/api/medmind/prebuilt?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setText(data.content);
        }
      } catch {
        /* silent */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isPro, trigger, entityId, entityType, text]);

  if (!isPro || !trigger) return null;
  if (loading) {
    return (
      <div className="mt-3 text-[10px] uppercase tracking-[0.15em] text-muted">
        Разбираю ответ...
      </div>
    );
  }
  if (!text) return null;

  return (
    <div className="mt-3 border-l-2 border-primary/30 pl-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-primary mb-1">
        Разбор
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}
