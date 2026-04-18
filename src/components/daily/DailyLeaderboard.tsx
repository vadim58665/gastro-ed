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
    <section className="mt-6 relative rounded-2xl aurora-hairline-dark bg-white/[0.04] p-5">
      <div className="flex items-baseline justify-between mb-3 relative z-10">
        <h3
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "var(--color-aurora-violet)" }}
        >
          Рейтинг дня
        </h3>
        {rows && (
          <span className="text-[10px] text-white/50">
            {rows.length} {rows.length === 1 ? "участник" : "участников"}
          </span>
        )}
      </div>

      <div className="aurora-divider-dark mb-3 relative z-10" />

      {error && (
        <div
          className="text-[12px] relative z-10"
          style={{ color: "var(--color-aurora-pink)" }}
        >
          {error}
        </div>
      )}
      {!rows && !error && (
        <div className="text-[12px] text-white/50 relative z-10">Загружаем...</div>
      )}
      {rows && rows.length === 0 && (
        <div className="text-[12px] text-white/55 relative z-10">
          Вы первый сегодня. Список обновится, когда кто-то ещё пройдёт кейс.
        </div>
      )}
      {rows && rows.length > 0 && (
        <ol className="flex flex-col gap-1.5 relative z-10">
          {rows.map((r) => (
            <li
              key={`${r.position}-${r.nickname}`}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-[13px] ${
                r.isSelf
                  ? "relative aurora-hairline-dark bg-white/[0.06]"
                  : "bg-transparent"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 relative z-10">
                <span
                  className={`w-6 text-right font-medium tabular-nums ${
                    r.isSelf ? "" : "text-white/45"
                  }`}
                  style={r.isSelf ? { color: "var(--color-aurora-violet)" } : undefined}
                >
                  {r.position}
                </span>
                <span
                  className={`truncate ${
                    r.isSelf ? "aurora-text font-semibold" : "text-white/85"
                  }`}
                >
                  {r.isSelf ? "Вы" : r.nickname}
                </span>
              </div>
              <span
                className={`tabular-nums font-semibold relative z-10 ${
                  r.isSelf ? "aurora-text" : "text-white/85"
                }`}
              >
                {r.totalPoints}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
