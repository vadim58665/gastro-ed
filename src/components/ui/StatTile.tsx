"use client";

interface StatTileProps {
  value: string | number;
  label: string;
  accent?: boolean;
}

export default function StatTile({ value, label, accent = false }: StatTileProps) {
  return (
    <div
      className="rounded-2xl bg-white px-1.5 py-2.5 text-center"
      style={{
        border: "1px solid rgba(99,102,241,0.06)",
        boxShadow: "0 1px 2px rgba(17,24,39,0.03)",
      }}
    >
      <div
        data-stat-value
        data-accent={accent}
        className="text-[18px] font-light tracking-tight"
        style={{
          background: accent
            ? "linear-gradient(135deg, #6366F1, #EC4899)"
            : "linear-gradient(135deg, #1A1A2E, #6366F1)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {value}
      </div>
      <div className="text-[7.5px] tracking-[0.16em] uppercase text-foreground/60 mt-1 font-medium">
        {label}
      </div>
    </div>
  );
}
