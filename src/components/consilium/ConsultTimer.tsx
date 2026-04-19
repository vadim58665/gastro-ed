"use client";

import { useEffect, useState } from "react";

interface Props {
  startedAt: number;
  running: boolean;
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Informational timer showing elapsed time since consultation start.
 * No sanctions, just helps the doctor pace themselves.
 */
export default function ConsultTimer({ startedAt, running }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <div
      className="inline-flex items-center gap-1.5 text-[11px] tabular-nums tracking-wider"
      style={{ color: "var(--color-muted)" }}
      aria-label="Время приёма"
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: running ? "var(--color-aurora-violet)" : "var(--color-muted)",
          boxShadow: running
            ? "0 0 8px color-mix(in srgb, var(--color-aurora-violet) 70%, transparent)"
            : "none",
        }}
        aria-hidden
      />
      {formatMs(now - startedAt)}
    </div>
  );
}
