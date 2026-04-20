"use client";

import { getFactOfTheDay } from "@/data/dailyFacts";

export default function FactOfTheDay() {
  const today = new Date();
  const fact = getFactOfTheDay(today);
  const dateLabel = today.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  return (
    <div
      className="relative rounded-3xl overflow-hidden px-5 py-4 aurora-hairline bg-card"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(17,24,39,0.04), 0 20px 40px -18px color-mix(in srgb, var(--color-aurora-pink) 25%, transparent)",
      }}
    >
      <div
        className="absolute pointer-events-none"
        style={{
          right: -40,
          top: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-aurora-violet) 18%, transparent), transparent 70%)",
        }}
      />
      <div className="relative flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background:
              "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
            color: "#fff",
            boxShadow:
              "0 4px 10px -3px color-mix(in srgb, var(--color-aurora-violet) 40%, transparent)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M5 17l.8 2.4L8 20l-2.2.6L5 23l-.8-2.4L2 20l2.2-.6L5 17z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[9px] tracking-[0.22em] uppercase font-medium"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Факт дня · {dateLabel}
          </div>
          <div className="text-[14px] font-medium text-foreground mt-1 leading-snug">
            {fact.title}
          </div>
          <p className="text-[12px] text-muted mt-1 leading-relaxed">{fact.body}</p>
        </div>
      </div>
    </div>
  );
}
