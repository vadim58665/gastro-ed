"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  totalSeconds: number;
  onTimeUp: () => void;
  paused?: boolean;
}

export default function ExamTimer({ totalSeconds, onTimeUp, paused = false }: Props) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => onTimeUpRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = remaining / totalSeconds;
  const isLow = remaining < 300;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isLow ? "bg-rose-400" : "bg-primary"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span
        className={`text-xs font-mono font-medium tabular-nums ${isLow ? "" : "text-muted"}`}
        style={isLow ? { color: "var(--color-aurora-pink)" } : undefined}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
