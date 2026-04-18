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
    bar: "linear-gradient(180deg, #6366F1, #A855F7)",
    glow: "rgba(99,102,241,0.4)",
    iconBg: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))",
    iconColor: "#6366F1",
  },
  "indigo-violet": {
    bar: "linear-gradient(180deg, #6366F1, #A855F7)",
    glow: "rgba(99,102,241,0.4)",
    iconBg: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.12))",
    iconColor: "#6366F1",
  },
  "violet-pink": {
    bar: "linear-gradient(180deg, #A855F7, #EC4899)",
    glow: "rgba(168,85,247,0.4)",
    iconBg: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.1))",
    iconColor: "#A855F7",
  },
  "pink-violet": {
    bar: "linear-gradient(180deg, #EC4899, #A855F7)",
    glow: "rgba(236,72,153,0.4)",
    iconBg: "linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.1))",
    iconColor: "#EC4899",
  },
};

const chipStyles: Record<ChipVariant, { color: string; background: string }> = {
  indigo: { color: "#6366F1", background: "rgba(99,102,241,0.08)" },
  violet: { color: "#A855F7", background: "rgba(168,85,247,0.1)" },
  pink: { color: "#EC4899", background: "rgba(236,72,153,0.1)" },
  dark: {
    color: "#fff",
    background:
      "linear-gradient(135deg, #1A1A2E 0%, #312E81 50%, #6366F1 100%)",
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
      className="relative rounded-2xl bg-white pl-3.5 pr-3.5 py-3 flex items-center gap-3 overflow-hidden btn-press"
      style={{
        border: "1px solid rgba(99,102,241,0.06)",
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
                ? "0 2px 6px -1px rgba(99,102,241,0.35)"
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
