"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { findSpecialtyById, type Specialty } from "@/data/specialties";

const STORAGE_KEY = "sd-specialty";

interface SpecialtyContextValue {
  activeSpecialty: Specialty | null;
  setActiveSpecialty: (id: string) => void;
  clearSpecialty: () => void;
}

const SpecialtyContext = createContext<SpecialtyContextValue>({
  activeSpecialty: null,
  setActiveSpecialty: () => {},
  clearSpecialty: () => {},
});

export function SpecialtyProvider({ children }: { children: ReactNode }) {
  const [activeSpecialty, setActiveSpecialtyState] = useState<Specialty | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      const found = findSpecialtyById(savedId);
      if (found) setActiveSpecialtyState(found);
    }
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
    <SpecialtyContext.Provider value={{ activeSpecialty, setActiveSpecialty, clearSpecialty }}>
      {children}
    </SpecialtyContext.Provider>
  );
}

export function useSpecialty() {
  return useContext(SpecialtyContext);
}
