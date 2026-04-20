"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import { getSupabase } from "@/lib/supabase/client";

type EntityType = "card" | "accreditation_question";

interface Props {
  entityId: string;
  entityType?: EntityType;
  /**
   * Текст вопроса/карточки. Используется как контекст для Claude
   * при on-demand генерации подсказки, если в общем кэше (prebuilt_content)
   * её ещё нет. Без контекста fallback не делается — показываем
   * сообщение «подсказка скоро появится».
   */
  context?: string;
  /**
   * Короткая тема (раздел / специальность) — попадает в user_saved_content
   * после успешной генерации. Нужна, чтобы подсказка была сгруппирована
   * в библиотеке пользователя.
   */
  topic?: string;
  /**
   * Человекочитаемое имя специальности (как оно у карточки/вопроса).
   * Необходимо, чтобы конспект на /accreditation/notes фильтровался по
   * активной специальности пользователя.
   */
  specialty?: string;
}

async function getAuthToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (token) return token;
  return process.env.NEXT_PUBLIC_DEV_MODE === "true" ? "dev-test-token" : "";
}

/**
 * Достаёт из результата /api/medmind/generate полезную строку подсказки.
 * Промпт типа `tip` просит JSON `{ tip: "..." }`, но Claude иногда
 * возвращает plain-text или весь объект JSON в `content_ru`. Аккуратно
 * вытаскиваем строку; если не получилось — возвращаем исходник.
 */
function extractTip(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const candidate = parsed.tip ?? parsed.hint ?? parsed.explanation ?? parsed.content;
      if (typeof candidate === "string") return candidate;
    }
  } catch {
    /* not JSON, fall through */
  }
  return trimmed;
}

export default function HintButton({ entityId, entityType = "card", context, topic, specialty }: Props) {
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
      const cacheRes = await fetch(`/api/medmind/prebuilt?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cacheRes.ok) {
        const data = await cacheRes.json();
        setHint(data.content);
        setLoading(false);
        return;
      }
      if (cacheRes.status === 403) {
        setShowPaywall(true);
        setLoading(false);
        return;
      }
      if (cacheRes.status !== 404) {
        setError("Не удалось загрузить подсказку");
        setLoading(false);
        return;
      }

      // Cache miss. Если мы знаем контекст вопроса/карточки — просим
      // Claude сгенерировать подсказку и одновременно засеиваем общий
      // кэш, чтобы следующие пользователи получили её бесплатно.
      if (!context) {
        setError("Подсказка скоро появится");
        setLoading(false);
        return;
      }

      const topicForClaude = topic ?? context.slice(0, 60);
      const genRes = await fetch("/api/medmind/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "tip",
          topic: topicForClaude,
          cardId: entityType === "card" ? entityId : undefined,
          context,
        }),
      });

      if (genRes.status === 403) {
        setShowPaywall(true);
        setLoading(false);
        return;
      }
      if (genRes.status === 429) {
        setError("Слишком много запросов, попробуйте позже");
        setLoading(false);
        return;
      }
      if (!genRes.ok) {
        setError("Не удалось сгенерировать подсказку");
        setLoading(false);
        return;
      }

      const genData = await genRes.json();
      const tip = extractTip(genData.contentRu);
      if (!tip) {
        setError("Пустой ответ, попробуйте ещё раз");
        setLoading(false);
        return;
      }

      setHint(tip);

      // Fire-and-forget: сохраняем в общий кэш, чтобы следующие
      // пользователи не тратили токены. Ошибку глушим — для пользователя
      // подсказка уже показана.
      void fetch("/api/medmind/content", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentType: "hint",
          specialty,
          topic: topicForClaude,
          contentRu: tip,
          entityType,
          entityId,
          questionContext: context,
          modelUsed: genData.model ?? "runtime",
        }),
      }).catch(() => undefined);
    } catch {
      setError("Ошибка соединения");
    }
    setLoading(false);
  }, [isPro, hint, loading, entityId, entityType, context, topic, specialty]);

  if (showPaywall) {
    return (
      <div
        className="mt-3 rounded-xl px-4 py-3"
        style={{
          border: "1px solid var(--aurora-violet-border)",
          background: "var(--aurora-violet-soft)",
        }}
      >
        <p className="text-xs text-foreground mb-1 font-medium">
          Подсказка доступна в подписке
        </p>
        <p className="text-[11px] text-muted mb-3 leading-relaxed">
          Получайте наводящие подсказки к каждому вопросу, не раскрывая ответ.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowPaywall(false);
              router.push("/subscription");
            }}
            className="text-[10px] uppercase tracking-[0.15em] font-semibold btn-press"
            style={{ color: "var(--color-aurora-violet)" }}
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
      <div
        className="mt-3 pl-3"
        style={{ borderLeft: "2px solid var(--aurora-violet-border)" }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.15em] mb-1"
          style={{ color: "var(--color-aurora-violet)" }}
        >
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
      className="mt-3 inline-flex items-center gap-1.5 text-xs btn-press disabled:opacity-50"
      style={{ color: "var(--color-aurora-violet)" }}
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
      <span>{loading ? "Генерирую подсказку..." : error ?? "Подсказка"}</span>
    </button>
  );
}
