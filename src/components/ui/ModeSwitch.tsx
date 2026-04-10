"use client";

import { useMode, type AppMode } from "@/contexts/ModeContext";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useRouter } from "next/navigation";

export default function ModeSwitch() {
  const { mode, setMode } = useMode();
  const { clearSpecialty } = useSpecialty();
  const router = useRouter();

  const handleSwitch = (newMode: AppMode) => {
    setMode(newMode);
    if (newMode === "feed") {
      router.push("/topics");
    } else {
      clearSpecialty();
      router.push("/tests");
    }
  };

  return (
    <div className="flex w-full bg-surface rounded-2xl p-1 gap-1">
      <button
        onClick={() => handleSwitch("feed")}
        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all ${
          mode === "feed"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="7" rx="2" fill="currentColor" opacity="0.1" />
          <rect x="3" y="14" width="18" height="7" rx="2" fill="currentColor" opacity="0.1" />
          <line x1="8" y1="6.5" x2="18" y2="6.5" />
          <line x1="8" y1="17.5" x2="16" y2="17.5" />
          <circle cx="5.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="5.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        Лента
      </button>
      <button
        onClick={() => handleSwitch("prep")}
        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all ${
          mode === "prep"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 10l10-5 10 5-10 5z" fill="currentColor" opacity="0.1" />
          <path d="M6 12.5v4.5c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" fill="currentColor" opacity="0.08" />
          <path d="M22 10v6" />
          <circle cx="22" cy="16" r="1" fill="currentColor" stroke="none" />
        </svg>
        Подготовка
      </button>
    </div>
  );
}
