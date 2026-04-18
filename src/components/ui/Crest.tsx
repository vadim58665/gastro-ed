"use client";

import Link from "next/link";
import { ReactNode } from "react";

type CrestVariant = "indigo-violet" | "violet-pink" | "locked";

interface CrestProps {
  variant: CrestVariant;
  icon: ReactNode;
  title: string;
  sub?: string;
  href?: string;
}

const HEX_CLIP = "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)";

const variantColors: Record<
  Exclude<CrestVariant, "locked">,
  { from: string; to: string; shadow: string }
> = {
  "indigo-violet": {
    from: "var(--color-aurora-indigo)",
    to: "var(--color-aurora-violet)",
    shadow: "color-mix(in srgb, var(--color-aurora-indigo) 50%, transparent)",
  },
  "violet-pink": {
    from: "var(--color-aurora-violet)",
    to: "var(--color-aurora-pink)",
    shadow: "color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)",
  },
};

export default function Crest({ variant, icon, title, sub, href }: CrestProps) {
  const isLocked = variant === "locked";
  const colors = !isLocked ? variantColors[variant] : null;

  const inner = (
    <div
      className={`flex-shrink-0 w-[88px] rounded-2xl px-2 pt-3.5 pb-2.5 text-center relative overflow-hidden ${
        isLocked ? "crest-locked" : ""
      } ${href ? "btn-press cursor-pointer" : ""}`}
      style={{
        background: isLocked
          ? "linear-gradient(180deg, #f8f9fc 0%, #eef0f7 100%)"
          : "white",
        border: "1px solid var(--aurora-indigo-border)",
        boxShadow:
          "0 1px 2px rgba(17,24,39,0.03), 0 6px 16px -10px color-mix(in srgb, var(--color-aurora-indigo) 18%, transparent)",
      }}
    >
      <div
        className="w-11 h-11 mx-auto relative flex items-center justify-center"
      >
        {/* Background hexagon */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: HEX_CLIP,
            background: colors
              ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
              : "var(--aurora-indigo-soft)",
            border: isLocked ? "1px dashed var(--aurora-indigo-border)" : "none",
            boxShadow: colors
              ? `0 4px 10px -3px ${colors.shadow}`
              : "none",
          }}
        />
        {/* Shine highlight (unlocked only) */}
        {!isLocked && (
          <div
            className="absolute"
            style={{
              top: "10%",
              left: "10%",
              width: "40%",
              height: "25%",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.5), transparent)",
              clipPath: "polygon(0 0, 100% 0, 70% 100%, 0 100%)",
              zIndex: 1,
            }}
          />
        )}
        <div
          className="relative z-10"
          style={{ color: isLocked ? "#A3A6B8" : "#fff" }}
        >
          {icon}
        </div>
      </div>
      <div
        className={`text-[9px] mt-2 leading-tight ${
          isLocked ? "font-medium text-muted" : "font-semibold text-foreground"
        }`}
      >
        {title}
      </div>
      {sub && (
        <div className="text-[8px] text-muted mt-0.5 tracking-wide">{sub}</div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
