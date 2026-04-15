"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

interface Row {
  position: number;
  nickname: string;
  totalPoints: number;
  maxPoints: number;
  isSelf: boolean;
}

interface Props {
  date: string;
}

export default function DailyLeaderboard({ date }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        const token =
          session?.access_token ??
          (process.env.NEXT_PUBLIC_DEV_MODE === "true" ? "dev-test-token" : null);
        if (!token) {
          setError("Нужен вход");
          return;
        }
        const res = await fetch(
          `/api/daily-case/leaderboard?date=${encodeURIComponent(date)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Не удалось загрузить");
          return;
        }
        setRows(data.rows);
      } catch {
        if (!cancelled) setError("Сетевая ошибка");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <section className="mt-6 rounded-2xl border border-border/60 bg-surface/70 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
          Рейтинг дня
        </h3>
        {rows && (
          <span className="text-[10px] text-muted">
            {rows.length} {rows.length === 1 ? "участник" : "участников"}
          </span>
        )}
      </div>

      <div className="divider-soft mb-3" />

      {error && <div className="text-[12px] text-rose-500">{error}</div>}
      {!rows && !error && (
        <div className="text-[12px] text-muted">Загружаем...</div>
      )}
      {rows && rows.length === 0 && (
        <div className="text-[12px] text-muted">
          Вы первый сегодня. Список обновится, когда кто-то ещё пройдёт кейс.
        </div>
      )}
      {rows && rows.length > 0 && (
        <ol className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li
              key={`${r.position}-${r.nickname}`}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-[13px] ${
                r.isSelf
                  ? "bg-foreground/5 border border-foreground/20"
                  : "bg-transparent"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-right text-muted font-medium tabular-nums">
                  {r.position}
                </span>
                <span className="truncate text-foreground">
                  {r.isSelf ? "Вы" : r.nickname}
                </span>
              </div>
              <span className="tabular-nums font-semibold text-foreground">
                {r.totalPoints}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
