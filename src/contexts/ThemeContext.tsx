"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type ThemeId = "default" | "mocha" | "graphite";
export type LanguageId = "ru" | "en" | "uk" | "kk";
export type CompanionKind = "orb" | "doctor" | "mouse" | "owl";

const THEME_KEY = "gastro-ed-theme";
const LANG_KEY = "gastro-ed-language";
const COMPANION_KEY = "gastro-ed-companion";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  language: LanguageId;
  setLanguage: (l: LanguageId) => void;
  companion: CompanionKind;
  setCompanion: (c: CompanionKind) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "default",
  setTheme: () => {},
  language: "ru",
  setLanguage: () => {},
  companion: "orb",
  setCompanion: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("default");
  const [language, setLanguageState] = useState<LanguageId>("ru");
  const [companion, setCompanionState] = useState<CompanionKind>("orb");

  // Load persisted values after hydration to avoid SSR mismatch
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_KEY) as ThemeId | null;
      if (storedTheme === "mocha" || storedTheme === "graphite" || storedTheme === "default") {
        setThemeState(storedTheme);
      }
      const storedLang = localStorage.getItem(LANG_KEY) as LanguageId | null;
      if (storedLang === "ru" || storedLang === "en" || storedLang === "uk" || storedLang === "kk") {
        setLanguageState(storedLang);
      }
      const storedCompanion = localStorage.getItem(COMPANION_KEY) as CompanionKind | null;
      if (
        storedCompanion === "orb" ||
        storedCompanion === "doctor" ||
        storedCompanion === "mouse" ||
        storedCompanion === "owl"
      ) {
        setCompanionState(storedCompanion);
      }
    } catch {}
  }, []);

  // Apply data-theme attribute to <html>
  useEffect(() => {
    const el = document.documentElement;
    if (theme === "default") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }, []);

  const setLanguage = useCallback((l: LanguageId) => {
    setLanguageState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
  }, []);

  const setCompanion = useCallback((c: CompanionKind) => {
    setCompanionState(c);
    try {
      localStorage.setItem(COMPANION_KEY, c);
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, language, setLanguage, companion, setCompanion }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
