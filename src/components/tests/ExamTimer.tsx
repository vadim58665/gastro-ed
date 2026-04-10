"use client";

interface ExamTimerProps {
  seconds: number;
  onTimeUp?: () => void;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function ExamTimer({ seconds }: ExamTimerProps) {
  const isLow = seconds <= 300; // 5 minutes warning
  const isCritical = seconds <= 60;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono tracking-wider transition-colors ${
        isCritical
          ? "bg-danger-light text-danger"
          : isLow
            ? "bg-warning-light text-warning"
            : "bg-surface text-muted"
      }`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {formatTime(seconds)}
    </div>
  );
}
