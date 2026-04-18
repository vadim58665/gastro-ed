"use client";

import { type ReactNode } from "react";

type Variant = "outline" | "soft" | "solid";
type Size = "sm" | "md" | "lg";

interface Props {
  icon: ReactNode;
  variant?: Variant;
  size?: Size;
  gradient?: boolean;
  className?: string;
}

const SIZE_MAP: Record<Size, { box: string; svg: number }> = {
  sm: { box: "w-9 h-9 rounded-xl", svg: 16 },
  md: { box: "w-11 h-11 rounded-2xl", svg: 18 },
  lg: { box: "w-14 h-14 rounded-2xl", svg: 22 },
};

export default function IconBadge({
  icon,
  variant = "outline",
  size = "md",
  gradient = true,
  className = "",
}: Props) {
  const s = SIZE_MAP[size];
  const gradClass = gradient ? "icon-aurora-stroke" : "";

  if (variant === "solid") {
    return (
      <div
        className={`shrink-0 ${s.box} flex items-center justify-center text-white aurora-grad-bg ${className}`}
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 18px -8px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent)",
        }}
      >
        <div style={{ width: s.svg, height: s.svg }} className="text-white">
          {icon}
        </div>
      </div>
    );
  }

  if (variant === "soft") {
    return (
      <div
        className={`shrink-0 ${s.box} flex items-center justify-center ${gradClass} ${className}`}
        style={{
          background: "var(--aurora-indigo-soft)",
          border: "1px solid var(--aurora-indigo-border)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
          color: "var(--color-aurora-violet)",
        }}
      >
        <div style={{ width: s.svg, height: s.svg }}>{icon}</div>
      </div>
    );
  }

  // outline (default) - aurora-hairline ring + bg-card
  return (
    <div
      className={`shrink-0 relative ${s.box} bg-card aurora-hairline flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ${gradClass} ${className}`}
      style={{ color: "var(--color-aurora-violet)" }}
    >
      <div style={{ width: s.svg, height: s.svg }}>{icon}</div>
    </div>
  );
}
