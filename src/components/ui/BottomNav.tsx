"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "@/contexts/ModeContext";
import { useProgress } from "@/hooks/useProgress";
import { getFeedMistakes } from "@/lib/mistakes";
import { demoCards } from "@/data/cards";
import { useMemo } from "react";

const gridIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const errorIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9l-6 6" />
    <path d="M9 9l6 6" />
  </svg>
);

const stationIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-6h6v6" />
    <path d="M10 10h4" />
    <path d="M12 8v4" />
  </svg>
);

const listIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const userIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const checkIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const caseIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const feedTabs = [
  { href: "/feed", label: "Лента", icon: gridIcon },
  { href: "/daily-case", label: "Диагноз", icon: caseIcon },
  { href: "/mistakes", label: "Ошибки", icon: errorIcon },
  { href: "/profile", label: "Профиль", icon: userIcon },
];

const prepTabs = [
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
    <nav className="fixed bottom-0 left-0 right-0 bg-background/85 backdrop-blur-xl border-t border-border/60 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-colors ${
                isActive
                  ? "text-primary bg-primary-light shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(99,102,241,0.12),0_2px_8px_-2px_rgba(99,102,241,0.2)]"
                  : "text-muted hover:text-foreground/80"
              }`}
            >
              <span className="relative">
                {tab.icon}
                {tab.href === "/mistakes" && mistakeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full px-0.5">
                    {mistakeCount > 99 ? "99+" : mistakeCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
