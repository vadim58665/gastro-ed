"use client";

interface MedMindCardProps {
  title: string;
  tier: string;
  stats: Array<{ label: string; value: string }>;
}

export default function MedMindCard({ title, tier, stats }: MedMindCardProps) {
  return (
    <div
      className="aurora-hairline relative rounded-2xl bg-card p-3.5 overflow-hidden"
      style={{
        boxShadow:
          "0 1px 2px rgba(17,24,39,0.03), 0 14px 30px -16px color-mix(in srgb, var(--color-aurora-indigo) 30%, transparent)",
      }}
    >
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          right: 0,
          width: 160,
          height: 160,
          background:
            "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-aurora-pink) 16%, transparent), color-mix(in srgb, var(--color-aurora-violet) 12%, transparent) 40%, transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-2.5 mb-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 aurora-grad-bg"
          style={{
            boxShadow:
              "0 4px 12px -2px color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>
          </svg>
        </div>
        <div>
          <div className="text-xs text-foreground font-medium">{title}</div>
          <div
            className="text-[9px] tracking-wide mt-0.5 font-medium"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            {tier}
          </div>
        </div>
      </div>

      <div
        className="relative grid grid-cols-2 gap-2.5 pt-2.5"
        style={{ borderTop: "1px solid var(--aurora-indigo-border)" }}
      >
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[8px] tracking-[0.15em] uppercase text-muted font-medium">
              {s.label}
            </div>
            <div className="text-[11px] text-foreground mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
