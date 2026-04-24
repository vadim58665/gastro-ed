"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { findSpecialtyById, type Specialty } from "@/data/specialties";

const STORAGE_KEY = "sd-specialty";

interface SpecialtyContextValue {
  activeSpecialty: Specialty | null;
  /**
   * False on the server render and the very first client render, true once
   * localStorage has been read. Consumers that render a redirect while
   * `activeSpecialty` is null must wait for `hydrated` to be true, otherwise
   * a user landing on a deep link (e.g. /tests/1) gets bounced to /tests
   * before the saved specialty is restored.
   */
  hydrated: boolean;
  /**
   * Установить активную специальность. Принимает либо строку-id (тогда
   * ищем в локальном реестре `accreditationCategories`), либо полный объект
   * Specialty (для специальностей из Supabase, которых нет в статическом
   * списке).
   */
  setActiveSpecialty: (idOrSpec: string | Specialty) => void;
  clearSpecialty: () => void;
}

const SpecialtyContext = createContext<SpecialtyContextValue>({
  activeSpecialty: null,
  hydrated: false,
  setActiveSpecialty: () => {},
  clearSpecialty: () => {},
});

function readSavedSpecialty(): Specialty | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    // Новый формат — JSON {id, name}. Старый — голая строка-id.
    if (saved.startsWith("{")) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") {
        return { id: parsed.id, name: parsed.name };
      }
      return null;
    }
    // Legacy: строка-id, ищем в статическом реестре.
    return findSpecialtyById(saved) ?? null;
  } catch {
    return null;
  }
}

export function SpecialtyProvider({ children }: { children: ReactNode }) {
  // Lazy init so the value is correct on the first client render — no
  // null→saved flicker that used to trigger redirects in consumers.
  const [activeSpecialty, setActiveSpecialtyState] = useState<Specialty | null>(
    () => readSavedSpecialty()
  );
  // `hydrated` starts false during SSR/first paint and flips true on mount.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (activeSpecialty === null) {
      const found = readSavedSpecialty();
      if (found) setActiveSpecialtyState(found);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveSpecialty = useCallback((idOrSpec: string | Specialty) => {
    let spec: Specialty | null = null;
    if (typeof idOrSpec === "string") {
      spec = findSpecialtyById(idOrSpec) ?? null;
    } else {
      spec = { id: idOrSpec.id, name: idOrSpec.name };
    }
    if (!spec) return;
    setActiveSpecialtyState(spec);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(spec));
    } catch {}
  }, []);

  const clearSpecialty = useCallback(() => {
    setActiveSpecialtyState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return (
    <SpecialtyContext.Provider
      value={{ activeSpecialty, hydrated, setActiveSpecialty, clearSpecialty }}
    >
      {children}
    </SpecialtyContext.Provider>
  );
}

export function useSpecialty() {
  return useContext(SpecialtyContext);
}
