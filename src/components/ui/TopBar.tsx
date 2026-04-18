"use client";

import { useRouter } from "next/navigation";
import StreakBadge from "./StreakBadge";
import ModeSwitch from "./ModeSwitch";

interface TopBarProps {
  showBack?: boolean;
  /** Если true - показывает aurora-welcome-band под topbar. Для premium-страниц (/profile, /subscription, etc). */
  premium?: boolean;
  /** Если true - показывает settings-btn справа. По умолчанию false. */
  showSettings?: boolean;
  /** Handler клика на settings-btn. */
  onSettingsClick?: () => void;
  /** На странице /feed - полупрозрачный фон для TikTok-вайба. */
  transparent?: boolean;
}

export default function TopBar({
  showBack = false,
  premium = false,
  showSettings = false,
  onSettingsClick,
  transparent = false,
}: TopBarProps) {
  const router = useRouter();

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 overflow-hidden"
        style={{
          background: transparent ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.82)",
          borderBottom: "1px solid rgba(99,102,241,0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {premium && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(240px 80px at 15% 100%, rgba(99,102,241,0.12), transparent 70%), radial-gradient(240px 80px at 85% 100%, rgba(236,72,153,0.08), transparent 70%)",
            }}
          />
        )}

        <div className="relative max-w-lg mx-auto px-4 py-2.5">
          <div className="flex justify-between items-center gap-2">
            {showBack ? (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-muted hover:text-foreground transition-colors"
                aria-label="Назад"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Назад
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-[2px]"
                  style={{
                    background: "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
                    boxShadow: "0 0 0 1px rgba(99,102,241,0.2)",
                  }}
                />
                <span className="text-[10px] tracking-[0.22em] uppercase text-foreground font-medium">
                  Умный Врач
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <StreakBadge />
              {showSettings && (
                <button
                  onClick={onSettingsClick}
                  aria-label="Настройки"
                  className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-muted"
                  style={{
                    borderColor: "rgba(99,102,241,0.08)",
                    boxShadow: "0 1px 2px rgba(17,24,39,0.04)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {!showBack && (
            <div className="flex justify-center mt-2">
              <ModeSwitch />
            </div>
          )}
        </div>
      </header>
      {premium && <div className="aurora-welcome-band fixed top-[88px] left-0 right-0 z-40" />}
    </>
  );
}
