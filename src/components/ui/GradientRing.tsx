"use client";

interface Props {
  value: number;
  size?: number;
  thickness?: number;
  label?: string;
}

/**
 * Premium progress ring with rainbow gradient stroke and soft glow.
 * Accepts a percentage 0-100 and renders an animated arc.
 */
export default function GradientRing({
  value,
  size = 56,
  thickness = 4,
  label,
}: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const uid = `gr-${size}-${thickness}`;

  return (
    <div
      className="progress-ring"
      style={{
        ["--ring-size" as string]: `${size}px`,
        ["--ring-thickness" as string]: `${thickness}px`,
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle
          className="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${uid})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.2, 0.9, 0.3, 1.2)",
            filter: "drop-shadow(0 0 6px rgba(168, 85, 247, 0.45))",
          }}
        />
      </svg>
      {label !== undefined && <div className="progress-ring-label">{label}</div>}
    </div>
  );
}
