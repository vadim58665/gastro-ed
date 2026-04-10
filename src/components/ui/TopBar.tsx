"use client";

import { useRouter } from "next/navigation";
import StreakBadge from "./StreakBadge";
import ModeSwitch from "./ModeSwitch";

interface TopBarProps {
  showBack?: boolean;
}

export default function TopBar({ showBack }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/85 backdrop-blur-xl border-b border-border/60 z-50 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_6px_24px_-12px_rgba(17,24,39,0.12)]">
      <div className="max-w-lg mx-auto px-4 py-2">
        {showBack ? (
          <>
            <div className="flex items-center mb-1.5">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-muted hover:text-foreground transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Назад
              </button>
            </div>
            <StreakBadge />
          </>
        ) : (
          <>
            <div className="mb-1.5">
              <ModeSwitch />
            </div>
            <StreakBadge />
          </>
        )}
      </div>
    </header>
  );
}
