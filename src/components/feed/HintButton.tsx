"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { getSupabase } from "@/lib/supabase/client";

type EntityType = "card" | "accreditation_question";

interface Props {
  entityId: string;
  entityType?: EntityType;
}

async function getAuthToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;
  return process.env.NEXT_PUBLIC_DEV_MODE === "true" ? "dev-test-token" : "";
}

export default function HintButton({ entityId, entityType = "card" }: Props) {
  const { isPro } = useSubscription();
  const router = useRouter();
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleClick = useCallback(async () => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    if (hint || loading) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams({
        entityType,
        entityId,
        contentType: "hint",
      });
      const res = await fetch(`/api/medmind/prebuilt?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHint(data.content);
      } else if (res.status === 404) {
        setError("Подсказка скоро появится");
      } else if (res.status === 403) {
        setShowPaywall(true);
      } else {
        setError("Не удалось загрузить подсказку");
      }
    } catch {
      setError("Ошибка соединения");
    }
    setLoading(false);
  }, [isPro, hint, loading, entityId, entityType]);

  if (showPaywall) {
    return (
      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-xs text-foreground mb-1 font-medium">
          Подсказка доступна в подписке
        </p>
        <p className="text-[11px] text-muted mb-3 leading-relaxed">
          Получайте наводящие подсказки к каждому вопросу — не раскрывая ответ.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowPaywall(false);
              router.push("/subscription");
            }}
            className="text-[10px] uppercase tracking-[0.15em] font-semibold text-primary btn-press"
          >
            Подключить
          </button>
          <button
            onClick={() => setShowPaywall(false)}
            className="text-[10px] uppercase tracking-[0.15em] text-muted btn-press"
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  if (hint) {
    return (
      <div className="mt-3 border-l-2 border-primary/30 pl-3">
        <p className="text-[10px] uppercase tracking-[0.15em] text-primary mb-1">
          Подсказка
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">{hint}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary btn-press disabled:opacity-50"
      aria-label="Показать подсказку"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
        <line x1="9" y1="21" x2="15" y2="21" />
      </svg>
      <span>{loading ? "Загружаю..." : error ?? "Подсказка"}</span>
    </button>
  );
}
