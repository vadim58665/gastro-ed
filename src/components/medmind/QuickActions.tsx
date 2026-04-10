"use client";

export type QuickAction = "explain" | "mnemonic" | "poem" | "image" | "session" | "free_question";

interface QuickActionsProps {
  onAction: (action: QuickAction) => void;
  compact?: boolean;
}

const ACTIONS: { key: QuickAction; label: string; icon: React.ReactNode }[] = [
  {
    key: "free_question",
    label: "Свой вопрос",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: "explain",
    label: "Объяснить",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    key: "mnemonic",
    label: "Мнемоника",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
        <line x1="9" y1="21" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    key: "poem",
    label: "Стишок",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    key: "image",
    label: "Ассоциация",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    key: "session",
    label: "Анализ",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function QuickActions({ onAction, compact }: QuickActionsProps) {
  if (compact) {
    return (
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            onClick={() => onAction(a.key)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-[10px] uppercase tracking-widest text-muted hover:text-primary hover:border-primary/30 transition-colors"
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 w-full max-w-[320px]">
      {ACTIONS.map((a) => (
        <button
          key={a.key}
          onClick={() => onAction(a.key)}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border text-left hover:border-primary/30 hover:bg-primary/5 transition-colors ${
            a.key === "session" || a.key === "free_question" ? "col-span-2" : ""
          }`}
        >
          <span className="text-primary">{a.icon}</span>
          <span className="text-xs text-foreground font-medium">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
