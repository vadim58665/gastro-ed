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
  setActiveSpecialty: (id: string) => void;
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
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (!savedId) return null;
    return findSpecialtyById(savedId) ?? null;
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
  // React's SSR emits with useState's initial `false`, and client sync after
  // hydration flips it — this matches the contract consumers expect without
  // breaking SSR.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Re-read on mount in case SSR produced null but the client has the saved
    // id (SSR `typeof window === 'undefined'` branch).
    if (activeSpecialty === null) {
      const found = readSavedSpecialty();
      if (found) setActiveSpecialtyState(found);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveSpecialty = useCallback((id: string) => {
    const found = findSpecialtyById(id);
    if (found) {
      setActiveSpecialtyState(found);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {}
    }
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
