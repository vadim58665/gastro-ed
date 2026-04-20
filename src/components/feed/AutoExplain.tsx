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
  /**
   * Текст вопроса/карточки. Если задан, при cache-miss мы сгенерируем
   * короткое объяснение через Claude и засеем общий кэш — следующим
   * пользователям оно будет бесплатным.
   */
  context?: string;
  /** Короткая тема (для user_saved_content). */
  topic?: string;
  /**
   * Человекочитаемое имя специальности карточки/вопроса. Проставляется
   * в user_saved_content.specialty, чтобы /accreditation/notes мог
   * корректно отфильтровать материалы по активной специальности.
   */
  specialty?: string;
}

async function getAuthToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;
  return process.env.NEXT_PUBLIC_DEV_MODE === "true" ? "dev-test-token" : "";
}

function extractExplanation(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const candidate = parsed.explanation ?? parsed.content ?? parsed.tip;
      if (typeof candidate === "string") return candidate;
    }
  } catch {
    /* not JSON */
  }
  return trimmed;
}

/**
 * Auto-expands explain_short from prebuilt_content after an answer for
 * subscribers. При cache-miss с заданным `context` делаем один
 * on-demand запрос к Claude (type=`explanation`) и засеиваем общий
 * кэш. Без `context` — silent no-op (старое поведение).
 */
export default function AutoExplain({
  entityId,
  entityType = "card",
  trigger,
  context,
  topic,
  specialty,
}: Props) {
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
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setText(data.content);
          return;
        }
        // Cache miss: пытаемся on-demand генерацию только если нам
        // передали контекст. Без него тихо выходим — старое поведение.
        if (res.status !== 404 || !context) return;

        const topicForClaude = topic ?? context.slice(0, 60);
        const genRes = await fetch("/api/medmind/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "explanation",
            topic: topicForClaude,
            cardId: entityType === "card" ? entityId : undefined,
            context,
          }),
        });
        if (cancelled || !genRes.ok) return;
        const genData = await genRes.json();
        const explanation = extractExplanation(genData.contentRu);
        if (!explanation) return;
        setText(explanation);

        // Fire-and-forget: seed общий кэш. Claude вернул короткое
        // объяснение — кладём его как `explain_short`.
        void fetch("/api/medmind/content", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contentType: "explain_short",
            specialty,
            topic: topicForClaude,
            contentRu: explanation,
            entityType,
            entityId,
            questionContext: context,
            modelUsed: genData.model ?? "runtime",
          }),
        }).catch(() => undefined);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPro, trigger, entityId, entityType, text, context, topic, specialty]);

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
    <div
      className="mt-3 pl-3"
      style={{ borderLeft: "2px solid var(--aurora-violet-border)" }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.15em] mb-1"
        style={{ color: "var(--color-aurora-violet)" }}
      >
        Разбор
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}
