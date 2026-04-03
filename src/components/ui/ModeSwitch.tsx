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
    <div className="flex bg-surface rounded-xl p-0.5">
      <button
        onClick={() => handleSwitch("feed")}
        className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${
          mode === "feed"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        Лента
      </button>
      <button
        onClick={() => handleSwitch("prep")}
        className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${
          mode === "prep"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted hover:text-foreground"
        }`}
      >
        Подготовка
      </button>
    </div>
  );
}
