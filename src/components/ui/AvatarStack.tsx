"use client";

import { CSSProperties } from "react";

interface AvatarStackProps {
  initial: string;
  size?: number;
  verified?: boolean;
  activityLabel?: string;
  /** Процент заполнения activity-ring (0-100). По умолчанию 0 (ring скрыт). */
  activityPercent?: number;
}

/**
 * Identity-стек аватара: внешний glow aura, dashed activity-ring,
 * aurora 2px ring, белое ядро с aurora-text буквой, verified-badge
 * в правом нижнем углу.
 */
export default function AvatarStack({
  initial,
  size = 128,
  verified = false,
  activityLabel,
  activityPercent = 0,
}: AvatarStackProps) {
  const clamped = Math.max(0, Math.min(100, activityPercent));
  const conicStyle: CSSProperties = {
    background: `conic-gradient(
      from -90deg,
      #6366F1 0%,
      #A855F7 ${clamped * 0.5}%,
      #EC4899 ${clamped}%,
      rgba(99, 102, 241, 0.08) ${clamped}%,
      rgba(99, 102, 241, 0.08) 100%
    )`,
    mask: "radial-gradient(circle, transparent 54%, black 54%, black 59%, transparent 59%)",
    WebkitMask: "radial-gradient(circle, transparent 54%, black 54%, black 59%, transparent 59%)",
  };

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      {/* Soft radial aura */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -16,
          background:
            "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.55), rgba(99,102,241,0.4) 40%, rgba(236,72,153,0.15) 65%, transparent 80%)",
          filter: "blur(24px)",
        }}
      />

      {/* Activity label chip */}
      {activityLabel && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-[8px] tracking-[0.22em] uppercase font-semibold whitespace-nowrap px-2.5 py-1 rounded-full"
          style={{
            top: -24,
            color: "#6366F1",
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
            boxShadow: "0 2px 8px -2px rgba(99,102,241,0.2)",
          }}
        >
          {activityLabel}
        </div>
      )}

      {/* Dashed activity progress ring */}
      {activityPercent > 0 && (
        <div
          className="absolute inset-0 rounded-full"
          style={conicStyle}
        />
      )}

      {/* Aurora gradient ring */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 9,
          padding: 2,
          background: "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          mask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* White core with aurora-text initial */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          inset: 11,
          background: "linear-gradient(180deg, #fff 0%, #f4f5fa 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(17,24,39,0.06), 0 10px 28px -10px rgba(99,102,241,0.4)",
        }}
      >
        <span
          className="font-extralight tracking-tight"
          style={{
            fontSize: Math.round(size * 0.375),
            background: "linear-gradient(135deg, #1A1A2E 0%, #6366F1 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {initial}
        </span>
      </div>

      {/* Verified badge */}
      {verified && (
        <div
          aria-label="PRO-подписчик"
          className="absolute rounded-full flex items-center justify-center text-white"
          style={{
            right: 2,
            bottom: 2,
            width: 28,
            height: 28,
            background: "linear-gradient(135deg, #1A1A2E 0%, #6366F1 60%, #A855F7 100%)",
            border: "3px solid #f8f9fc",
            boxShadow: "0 4px 12px -2px rgba(99,102,241,0.55)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
