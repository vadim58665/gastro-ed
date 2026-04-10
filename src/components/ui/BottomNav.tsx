"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReview } from "@/hooks/useReview";
import { useMode } from "@/contexts/ModeContext";

const gridIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const refreshIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Back card (peeking) */}
    <path d="M8 3h11a2 2 0 0 1 2 2v13" opacity="0.55" />
    {/* Front card */}
    <rect x="3" y="7" width="14" height="14" rx="2" />
    {/* Rewind arrow inside front card */}
    <path d="M7 14a3 3 0 1 0 1-2.2" />
    <polyline points="7 10 7 13 10 13" />
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
  { href: "/review", label: "Повтор", icon: refreshIcon },
  { href: "/profile", label: "Профиль", icon: userIcon },
];

const prepTabs = [
  { href: "/tests", label: "Тесты", icon: listIcon },
  { href: "/daily-case", label: "Диагноз", icon: caseIcon },
  { href: "/cases", label: "Задачи", icon: checkIcon },
  { href: "/profile", label: "Профиль", icon: userIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { dueCount } = useReview();
  const { mode } = useMode();

  const tabs = mode === "feed" ? feedTabs : prepTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-xl border-t border-border/60 z-50 shadow-[0_-1px_0_rgba(255,255,255,0.9)_inset,0_-8px_28px_-12px_rgba(17,24,39,0.14)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all ${
                isActive
                  ? "text-primary bg-primary-light shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(99,102,241,0.12),0_2px_8px_-2px_rgba(99,102,241,0.2)]"
                  : "text-muted hover:text-foreground/80"
              }`}
            >
              <span className="relative">
                {tab.icon}
                {tab.href === "/review" && dueCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full px-0.5">
                    {dueCount > 99 ? "99+" : dueCount}
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
