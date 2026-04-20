"use client";

interface Props {
  size?: number;
  initials?: string;
}

/**
 * Circular aurora-gradient avatar with patient initials.
 * Smaller-footprint sibling to GlowAvatar - used inline in chat (24/32px)
 * and as hero avatar on idle screen (96px).
 */
export default function PatientAvatar({ size = 32, initials = "АП" }: Props) {
  const fontSize = Math.max(10, Math.round(size * 0.38));
  const isLarge = size >= 64;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-label="AI-пациент"
    >
      {isLarge && (
        <div
          className="absolute pointer-events-none"
          aria-hidden
          style={{
            inset: -12,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-aurora-violet) 45%, transparent), color-mix(in srgb, var(--color-aurora-indigo) 25%, transparent) 45%, transparent 70%)",
            filter: "blur(8px)",
          }}
        />
      )}
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center"
        style={{
          background: "var(--aurora-gradient-primary)",
          boxShadow: isLarge
            ? "inset 0 1px 0 rgba(255,255,255,0.22), 0 10px 28px -10px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent)"
            : "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        <span
          className="text-white font-light tracking-tight select-none"
          style={{ fontSize, letterSpacing: "-0.02em" }}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}
