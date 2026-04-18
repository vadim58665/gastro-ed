"use client";

import Link from "next/link";
import { ReactNode } from "react";

type AccentVariant = "indigo" | "indigo-violet" | "violet-pink" | "pink-violet";
type ChipVariant = "indigo" | "violet" | "pink" | "dark";

interface ToolRowProps {
  accent: AccentVariant;
  icon: ReactNode;
  title: string;
  sub?: string;
  chip?: {
    label: string | number;
    variant: ChipVariant;
  };
  href?: string;
  onClick?: () => void;
}

const accentGradients: Record<
  AccentVariant,
  { bar: string; glow: string; iconBg: string; iconColor: string }
> = {
  indigo: {
    bar: "linear-gradient(180deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
    glow: "color-mix(in srgb, var(--color-aurora-indigo) 40%, transparent)",
    iconBg:
      "linear-gradient(135deg, var(--aurora-indigo-soft), var(--aurora-violet-soft))",
    iconColor: "var(--color-aurora-indigo)",
  },
  "indigo-violet": {
    bar: "linear-gradient(180deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
    glow: "color-mix(in srgb, var(--color-aurora-indigo) 40%, transparent)",
    iconBg:
      "linear-gradient(135deg, var(--aurora-indigo-soft), var(--aurora-violet-soft))",
    iconColor: "var(--color-aurora-indigo)",
  },
  "violet-pink": {
    bar: "linear-gradient(180deg, var(--color-aurora-violet), var(--color-aurora-pink))",
    glow: "color-mix(in srgb, var(--color-aurora-violet) 40%, transparent)",
    iconBg:
      "linear-gradient(135deg, var(--aurora-violet-soft), var(--aurora-pink-soft))",
    iconColor: "var(--color-aurora-violet)",
  },
  "pink-violet": {
    bar: "linear-gradient(180deg, var(--color-aurora-pink), var(--color-aurora-violet))",
    glow: "color-mix(in srgb, var(--color-aurora-pink) 40%, transparent)",
    iconBg:
      "linear-gradient(135deg, var(--aurora-pink-soft), var(--aurora-violet-soft))",
    iconColor: "var(--color-aurora-pink)",
  },
};

const chipStyles: Record<ChipVariant, { color: string; background: string }> = {
  indigo: {
    color: "var(--color-aurora-indigo)",
    background: "var(--aurora-indigo-soft)",
  },
  violet: {
    color: "var(--color-aurora-violet)",
    background: "var(--aurora-violet-soft)",
  },
  pink: {
    color: "var(--color-aurora-pink)",
    background: "var(--aurora-pink-soft)",
  },
  dark: {
    color: "#fff",
    background: "var(--aurora-gradient-premium)",
  },
};

export default function ToolRow({
  accent,
  icon,
  title,
  sub,
  chip,
  href,
  onClick,
}: ToolRowProps) {
  const a = accentGradients[accent];

  const inner = (
    <div
      className="relative rounded-2xl bg-card aurora-hairline pl-3.5 pr-3.5 py-3 flex items-center gap-3 overflow-hidden btn-press"
      style={{
        boxShadow: "0 1px 2px rgba(17,24,39,0.02)",
      }}
    >
      <div
        className="absolute rounded-sm"
        style={{
          left: 0,
          top: 10,
          bottom: 10,
          width: 3,
          background: a.bar,
          boxShadow: `0 0 8px ${a.glow}`,
        }}
      />
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: a.iconBg, color: a.iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground font-normal tracking-tight">
          {title}
        </div>
        {sub && (
          <div className="text-[9px] text-muted tracking-wide mt-0.5">{sub}</div>
        )}
      </div>
      {chip && (
        <div
          className="text-[9px] font-semibold tracking-wide rounded-full px-2 py-[3px]"
          style={{
            color: chipStyles[chip.variant].color,
            background: chipStyles[chip.variant].background,
            boxShadow:
              chip.variant === "dark"
                ? "0 2px 6px -1px color-mix(in srgb, var(--color-aurora-indigo) 35%, transparent)"
                : undefined,
          }}
        >
          {chip.label}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left"
        type="button"
      >
        {inner}
      </button>
    );
  }
  return inner;
}
