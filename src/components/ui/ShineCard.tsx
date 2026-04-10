"use client";

import type { ReactNode, CSSProperties } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  colorFrom?: string;
  colorTo?: string;
  duration?: number;
  borderWidth?: number;
  innerClassName?: string;
  style?: CSSProperties;
}

/**
 * Static card with a rotating conic-gradient border beam.
 * No JS animation, pure CSS. Produces a visibly premium ring of light.
 */
export default function ShineCard({
  children,
  className = "",
  colorFrom = "#6366f1",
  colorTo = "#a855f7",
  duration = 8,
  borderWidth = 1.5,
  innerClassName = "",
  style,
}: Props) {
  return (
    <div
      className={`shine-card ${className}`}
      style={
        {
          "--shine-from": colorFrom,
          "--shine-to": colorTo,
          "--shine-duration": `${duration}s`,
          "--shine-border": `${borderWidth}px`,
          ...style,
        } as CSSProperties
      }
    >
      <div className="shine-card-ring" aria-hidden />
      <div className={`shine-card-body ${innerClassName}`}>{children}</div>
    </div>
  );
}
