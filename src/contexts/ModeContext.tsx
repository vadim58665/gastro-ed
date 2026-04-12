"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type AppMode = "feed" | "prep";

const STORAGE_KEY = "sd-mode";

interface ModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextValue>({
  mode: "feed",
  setMode: () => {},
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window === "undefined") return "feed";
    return (localStorage.getItem(STORAGE_KEY) as AppMode) || "feed";
  });

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {}
  }, []);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
