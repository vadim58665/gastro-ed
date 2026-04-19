"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "@/contexts/ModeContext";
import { useProgress } from "@/hooks/useProgress";
import { getFeedMistakes } from "@/lib/mistakes";
import { demoCards } from "@/data/cards";
import { useMemo, type ReactNode } from "react";

interface TabDef {
  href: string;
  label: string;
  icon: ReactNode;
  /** Доп. префиксы pathname, на которых таб тоже должен быть активен. */
  matches?: string[];
}

const gridIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const errorIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9l-6 6" />
    <path d="M9 9l6 6" />
  </svg>
);

const listIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const stationIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

const userIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const checkIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const caseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const feedTabs: TabDef[] = [
  { href: "/topics", label: "Лента", icon: gridIcon, matches: ["/feed"] },
  { href: "/daily-case", label: "Диагноз", icon: caseIcon },
  { href: "/mistakes", label: "Ошибки", icon: errorIcon },
  { href: "/profile", label: "Профиль", icon: userIcon },
];

const prepTabs: TabDef[] = [
  { href: "/tests", label: "Тесты", icon: listIcon },
  { href: "/cases", label: "Задачи", icon: checkIcon },
  { href: "/mistakes", label: "Ошибки", icon: errorIcon },
  { href: "/stations", label: "Станции", icon: stationIcon },
  { href: "/profile", label: "Профиль", icon: userIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { progress } = useProgress();
  const { mode } = useMode();
  const mistakeCount = useMemo(
    () => getFeedMistakes(progress, demoCards).length,
    [progress]
  );

  const tabs = mode === "feed" ? feedTabs : prepTabs;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/85"
      style={{
        borderTop: "1px solid var(--aurora-indigo-border)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = [tab.href, ...(tab.matches ?? [])].some((p) =>
            pathname.startsWith(p)
          );
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 px-2 py-1 btn-press relative"
            >
              {/* Top indicator line for active tab */}
              {isActive && (
                <span
                  className="absolute top-[-1px] left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                  style={{
                    width: 22,
                    background: "var(--aurora-gradient-primary)",
                    boxShadow: "0 0 8px color-mix(in srgb, var(--color-aurora-violet) 60%, transparent)",
                  }}
                />
              )}
              <span
                className="relative flex items-center justify-center rounded-[9px]"
                style={{
                  width: 34,
                  height: 26,
                  background: isActive ? "var(--aurora-gradient-primary)" : "transparent",
                  color: isActive ? "#fff" : "var(--color-muted)",
                  boxShadow: isActive
                    ? "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px color-mix(in srgb, var(--color-aurora-indigo) 40%, transparent), 0 8px 18px -6px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent)"
                    : "none",
                }}
              >
                {tab.icon}
                {tab.href === "/mistakes" && mistakeCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center text-white text-[8px] font-bold rounded-full px-0.5"
                    style={{
                      background: "var(--color-aurora-pink)",
                      boxShadow: "0 0 8px color-mix(in srgb, var(--color-aurora-pink) 60%, transparent)",
                    }}
                  >
                    {mistakeCount > 99 ? "99+" : mistakeCount}
                  </span>
                )}
              </span>
              <span
                className="text-[8.5px] font-semibold tracking-wide"
                style={{
                  color: isActive ? "var(--color-aurora-violet)" : "var(--color-muted)",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
