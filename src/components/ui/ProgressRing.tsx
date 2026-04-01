"use client";

interface Props {
  current: number;
  total: number;
  size?: number;
}

export default function ProgressRing({ current, total, size = 32 }: Props) {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / total, 1);
  const offset = circumference * (1 - progress);
  const isComplete = current >= total;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-500 ${isComplete ? "text-emerald-500" : "text-foreground/40"}`}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-foreground/70">
        {current}
      </span>
    </div>
  );
}
