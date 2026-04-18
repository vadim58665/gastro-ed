"use client";

import { useState, useCallback } from "react";
import type { StudySession } from "@/types/medmind";

async function getToken(): Promise<string | null> {
  const { getSupabase } = await import("@/lib/supabase/client");
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export default function MedMindSession() {
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(false);

  const buildSession = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/medmind/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch {
      // Network error
    }
    setLoading(false);
  }, []);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-3xl font-extralight text-foreground mb-2">
          DAILY SESSION
        </p>
        <div className="w-12 h-px bg-border my-4" />
        <p className="text-sm text-muted text-center mb-6">
          Персональная подборка карточек на основе ваших слабых мест и расписания
          повторений
        </p>
        <button
          onClick={buildSession}
          disabled={loading}
          className="px-8 py-3 rounded-full bg-primary text-white text-sm font-medium btn-press disabled:opacity-50"
        >
          {loading ? "Собираю..." : "Собрать сессию"}
        </button>
      </div>
    );
  }

  const totalCards =
    session.weakCards.length +
    session.reviewCards.length +
    session.newCards.length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-4xl font-extralight text-foreground">{totalCards}</p>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted mt-1">
          КАРТОЧЕК
        </p>
        <p className="text-xs text-muted mt-2">
          ~{session.estimatedMinutes} мин
        </p>
      </div>

      <div className="w-full h-px bg-border" />

      {session.focusTopic && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-1">
            ФОКУС
          </p>
          <p className="text-sm text-foreground">{session.focusTopic}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xl font-extralight" style={{ color: "var(--color-aurora-pink)" }}>
            {session.weakCards.length}
          </p>
          <p className="text-[9px] uppercase tracking-[0.15em] text-muted">
            СЛАБЫЕ
          </p>
        </div>
        <div>
          <p className="text-xl font-extralight" style={{ color: "var(--color-aurora-violet)" }}>
            {session.reviewCards.length}
          </p>
          <p className="text-[9px] uppercase tracking-[0.15em] text-muted">
            ПОВТОР
          </p>
        </div>
        <div>
          <p className="text-xl font-extralight" style={{ color: "var(--color-aurora-indigo)" }}>
            {session.newCards.length}
          </p>
          <p className="text-[9px] uppercase tracking-[0.15em] text-muted">
            НОВЫЕ
          </p>
        </div>
      </div>

      <div className="w-full h-px bg-border" />

      <button
        onClick={() => {
          // Navigate to feed with session cards
          const ids = [
            ...session.weakCards,
            ...session.reviewCards,
            ...session.newCards,
          ];
          window.location.href = `/feed?session=${ids.join(",")}`;
        }}
        className="w-full py-3 rounded-full bg-primary text-white text-sm font-medium btn-press"
      >
        Начать сессию
      </button>
    </div>
  );
}
