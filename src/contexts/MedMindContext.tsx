"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Card } from "@/types/card";

interface MedMindState {
  /** Карточка, на которой сейчас стоит пользователь */
  currentCard: Card | null;
  setCurrentCard: (card: Card | null) => void;
  /** Popup открыт/закрыт */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MedMindContext = createContext<MedMindState | null>(null);

export function MedMindProvider({ children }: { children: ReactNode }) {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <MedMindContext.Provider
      value={{ currentCard, setCurrentCard, isOpen, open, close, toggle }}
    >
      {children}
    </MedMindContext.Provider>
  );
}

export function useMedMind() {
  const ctx = useContext(MedMindContext);
  if (!ctx) throw new Error("useMedMind must be used within MedMindProvider");
  return ctx;
}
