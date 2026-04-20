"use client";

export default function AuroraIconDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
      aria-hidden
      focusable={false}
    >
      <defs>
        <linearGradient id="aurora-grad-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-aurora-indigo)" />
          <stop offset="55%" stopColor="var(--color-aurora-violet)" />
          <stop offset="100%" stopColor="var(--color-aurora-pink)" />
        </linearGradient>
        <linearGradient id="aurora-grad-stroke-soft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-aurora-indigo)" stopOpacity="0.85" />
          <stop offset="55%" stopColor="var(--color-aurora-violet)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--color-aurora-pink)" stopOpacity="0.85" />
        </linearGradient>
      </defs>
    </svg>
  );
}
