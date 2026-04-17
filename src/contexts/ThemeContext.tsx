"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type ThemeId = "default" | "mocha" | "graphite" | "bordeaux";
export type LanguageId = "ru" | "en" | "uz" | "kk" | "tk" | "zh" | "hi" | "ar" | "fa" | "tg" | "fr";
export type CompanionKind = "orb" | "doctor" | "mouse" | "owl";
export type CompanionVisibility = "visible" | "half" | "hidden";
export type CompanionSize = "small" | "medium" | "large";

const THEME_KEY = "sd-theme";
const LANG_KEY = "sd-language";
const COMPANION_KEY = "sd-companion";
const COMPANION_VIS_KEY = "sd-companion-visibility";
const COMPANION_SIZE_KEY = "sd-companion-size";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  language: LanguageId;
  setLanguage: (l: LanguageId) => void;
  companion: CompanionKind;
  setCompanion: (c: CompanionKind) => void;
  companionVisibility: CompanionVisibility;
  setCompanionVisibility: (v: CompanionVisibility) => void;
  companionSize: CompanionSize;
  setCompanionSize: (s: CompanionSize) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "default",
  setTheme: () => {},
  language: "ru",
  setLanguage: () => {},
  companion: "orb",
  setCompanion: () => {},
  companionVisibility: "visible",
  setCompanionVisibility: () => {},
  companionSize: "medium",
  setCompanionSize: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("default");
  const [language, setLanguageState] = useState<LanguageId>("ru");
  const [companion, setCompanionState] = useState<CompanionKind>("orb");
  const [companionVisibility, setCompanionVisibilityState] = useState<CompanionVisibility>("visible");
  const [companionSize, setCompanionSizeState] = useState<CompanionSize>("medium");

  // Load persisted values after hydration to avoid SSR mismatch
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_KEY) as ThemeId | null;
      if (storedTheme === "mocha" || storedTheme === "graphite" || storedTheme === "bordeaux" || storedTheme === "default") {
        setThemeState(storedTheme);
      }
      const storedLang = localStorage.getItem(LANG_KEY) as LanguageId | null;
      if (storedLang === "ru" || storedLang === "en" || storedLang === "uz" || storedLang === "kk" || storedLang === "tk" || storedLang === "zh" || storedLang === "hi" || storedLang === "ar" || storedLang === "fa" || storedLang === "tg" || storedLang === "fr") {
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
      const storedVis = localStorage.getItem(COMPANION_VIS_KEY) as CompanionVisibility | null;
      if (storedVis === "visible" || storedVis === "half" || storedVis === "hidden") {
        setCompanionVisibilityState(storedVis);
      }
      const storedSize = localStorage.getItem(COMPANION_SIZE_KEY) as CompanionSize | null;
      if (storedSize === "small" || storedSize === "medium" || storedSize === "large") {
        setCompanionSizeState(storedSize);
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

  const setCompanionVisibility = useCallback((v: CompanionVisibility) => {
    setCompanionVisibilityState(v);
    try {
      localStorage.setItem(COMPANION_VIS_KEY, v);
    } catch {}
  }, []);

  const setCompanionSize = useCallback((s: CompanionSize) => {
    setCompanionSizeState(s);
    try {
      localStorage.setItem(COMPANION_SIZE_KEY, s);
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, language, setLanguage, companion, setCompanion, companionVisibility, setCompanionVisibility, companionSize, setCompanionSize }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
