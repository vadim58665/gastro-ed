"use client";

import type { ReactNode } from "react";

interface SoftListRowProps {
  /** Icon content (SVG, letter, number, small element) rendered inside the tinted badge on the left. */
  icon: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing content — e.g., a count or chevron. Defaults to a right-chevron if omitted. */
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  active?: boolean;
  /** Visual size of the icon badge. Default 48px. */
  iconSize?: number;
  className?: string;
}

/**
 * Shared list-row primitive used across the app.
 *
 * Visual language (matching the Settings sheet rows the user approved):
 *   - Cream card with soft border and inset top-highlight
 *   - Tinted badge on the left for an icon / letter
 *   - Title + optional subtitle in the middle
 *   - Trailing element (chevron or count) on the right
 */
export default function SoftListRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  href,
  disabled,
  active,
  iconSize = 48,
  className = "",
}: SoftListRowProps) {
  const base =
    "btn-press w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left";
  const state = disabled
    ? "bg-surface border-border/50 opacity-55 cursor-not-allowed"
    : active
      ? "border-foreground/40 bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_-6px_rgba(17,24,39,0.18)]"
      : "bg-card border-border hover:border-foreground/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]";

  const content = (
    <>
      <div
        className="shrink-0 rounded-2xl bg-surface border border-border flex items-center justify-center text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
        style={{ width: iconSize, height: iconSize }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{title}</div>
        {subtitle !== undefined && subtitle !== null && subtitle !== "" && (
          <div className="text-[11px] text-muted mt-0.5 truncate">{subtitle}</div>
        )}
      </div>
      <div className="shrink-0 text-muted">
        {trailing ?? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} className={`${base} ${state} ${className}`}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${state} ${className}`}
    >
      {content}
    </button>
  );
}
