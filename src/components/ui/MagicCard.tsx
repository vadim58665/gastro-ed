"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientSize?: number;
  spotlightColor?: string;
  style?: CSSProperties;
}

export default function MagicCard({
  children,
  className = "",
  gradientFrom = "var(--color-aurora-indigo)",
  gradientTo = "var(--color-aurora-violet)",
  gradientSize = 260,
  spotlightColor = "color-mix(in srgb, var(--color-aurora-indigo) 18%, transparent)",
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    el.style.setProperty("--opacity", "1");
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--opacity", "0");
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`magic-card ${className}`}
      style={
        {
          "--mx": "-100px",
          "--my": "-100px",
          "--opacity": "0",
          "--size": `${gradientSize}px`,
          "--from": gradientFrom,
          "--to": gradientTo,
          "--spot": spotlightColor,
          ...style,
        } as CSSProperties
      }
    >
      <div className="magic-card-border" aria-hidden />
      <div className="magic-card-spot" aria-hidden />
      <div className="magic-card-inner">{children}</div>
    </div>
  );
}
