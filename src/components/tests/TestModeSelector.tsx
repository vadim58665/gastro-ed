"use client";

import { TEST_MODES, type TestMode, type TestModeInfo } from "@/hooks/useTestMode";
import MagicCard from "@/components/ui/MagicCard";

interface TestModeSelectorProps {
  onSelect: (mode: TestMode) => void;
  mistakeCount?: number;
}

const ICONS: Record<string, React.ReactNode> = {
  book: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
  timer: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  refresh: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  ),
  zap: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
};

function ModeCard({
  info,
  onSelect,
  disabled,
  featured,
}: {
  info: TestModeInfo;
  onSelect: () => void;
  disabled?: boolean;
  featured?: boolean;
}) {
  if (disabled) {
    return (
      <div className="w-full text-left px-5 py-4 rounded-2xl border border-border/30 opacity-50">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-surface flex items-center justify-center text-muted">
            {ICONS[info.icon]}
          </div>
          <div className="flex-1">
            <p className="text-sm font-light text-foreground">{info.label}</p>
            <p className="text-[11px] text-muted mt-0.5">{info.description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button onClick={onSelect} className="w-full text-left btn-press block">
      <MagicCard
        className="w-full rounded-2xl"
        gradientFrom={featured ? "#6366f1" : "#94a3b8"}
        gradientTo={featured ? "#a855f7" : "#cbd5e1"}
        gradientSize={260}
        spotlightColor={
          featured ? "rgba(168, 85, 247, 0.12)" : "rgba(100, 116, 139, 0.08)"
        }
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-11 h-11 rounded-xl bg-surface flex items-center justify-center text-foreground/70 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
            {ICONS[info.icon]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground tracking-tight truncate">
              {info.label}
            </p>
            <p className="text-[11px] text-muted mt-0.5 truncate">
              {info.description}
            </p>
          </div>
          <svg
            className="w-4 h-4 text-muted shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </MagicCard>
    </button>
  );
}

export default function TestModeSelector({ onSelect, mistakeCount = 0 }: TestModeSelectorProps) {
  return (
    <div className="px-6 py-4">
      <div className="text-center mb-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted font-semibold mb-3">
          Выберите режим
        </p>
        <h2 className="text-3xl font-extralight text-foreground tracking-tight">
          Тестирование
        </h2>
        <div className="w-10 h-px bg-border mx-auto mt-4" />
      </div>

      <div className="space-y-2.5 max-w-lg mx-auto">
        {TEST_MODES.map((modeInfo) => {
          const disabled = modeInfo.id === "mistakes" && mistakeCount === 0;
          return (
            <ModeCard
              key={modeInfo.id}
              info={modeInfo}
              onSelect={() => onSelect(modeInfo.id)}
              disabled={disabled}
              featured={modeInfo.id === "training"}
            />
          );
        })}
      </div>
    </div>
  );
}
