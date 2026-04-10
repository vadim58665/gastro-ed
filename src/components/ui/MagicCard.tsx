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
  gradientFrom = "#6366f1",
  gradientTo = "#a855f7",
  gradientSize = 260,
  spotlightColor = "rgba(99, 102, 241, 0.18)",
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
