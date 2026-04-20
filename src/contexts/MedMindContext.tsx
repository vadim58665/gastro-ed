"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Card } from "@/types/card";
import type { TestQuestion } from "@/types/accreditation";

export type ScreenContext =
  | { kind: "feed_card"; card: Card }
  | {
      kind: "accred_question";
      question: TestQuestion;
      specialtyId: string;
      mode: "learn" | "test" | "exam" | "browse";
      isAnswered: boolean;
      selectedIndex?: number;
    }
  | {
      kind: "daily_case_step";
      caseId: string;
      caseTitle: string;
      stepIndex: number;
      totalSteps: number;
      stepType: string;
      stepTitle: string;
      stepDescription: string;
      options: string[];
    }
  | { kind: "profile" }
  | { kind: "topics" }
  | { kind: "tests_list" }
  | { kind: "other"; label: string };

interface MedMindState {
  /** Полный контекст текущего экрана */
  screen: ScreenContext;
  setScreen: (s: ScreenContext) => void;
  /** @deprecated Используй screen.card через useMedMindCard(). Оставлено для совместимости. */
  currentCard: Card | null;
  setCurrentCard: (card: Card | null) => void;
  /** Popup open/close */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const DEFAULT_SCREEN: ScreenContext = { kind: "other", label: "" };

const MedMindContext = createContext<MedMindState | null>(null);

export function MedMindProvider({ children }: { children: ReactNode }) {
  const [screen, setScreenState] = useState<ScreenContext>(DEFAULT_SCREEN);
  const [isOpen, setIsOpen] = useState(false);

  const setScreen = useCallback((s: ScreenContext) => setScreenState(s), []);

  // Legacy compatibility: setCurrentCard maps to setScreen with feed_card kind.
  const setCurrentCard = useCallback(
    (card: Card | null) => {
      if (card) setScreenState({ kind: "feed_card", card });
      else setScreenState(DEFAULT_SCREEN);
    },
    []
  );

  const currentCard = useMemo(
    () => (screen.kind === "feed_card" ? screen.card : null),
    [screen]
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <MedMindContext.Provider
      value={{
        screen,
        setScreen,
        currentCard,
        setCurrentCard,
        isOpen,
        open,
        close,
        toggle,
      }}
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

/**
 * Derives a user-friendly screen label and the top-level mode ('feed' | 'accreditation' | 'other')
 * for prompts and UI. Used by CompanionOverlay and API client code.
 */
export function deriveModeFromScreen(
  screen: ScreenContext
): "feed" | "accreditation" | "other" {
  if (screen.kind === "feed_card") return "feed";
  if (screen.kind === "accred_question") return "accreditation";
  return "other";
}

export function deriveScreenLabel(screen: ScreenContext): string {
  switch (screen.kind) {
    case "feed_card":
      return "лента карточек";
    case "accred_question":
      return screen.mode === "exam"
        ? "экзамен"
        : "подготовка к аккредитации";
    case "daily_case_step":
      return `диагноз дня · шаг ${screen.stepIndex + 1}/${screen.totalSteps}`;
    case "profile":
      return "профиль";
    case "topics":
      return "выбор темы";
    case "tests_list":
      return "список блоков";
    case "other":
      return screen.label || "экран";
  }
}
