import type { StepResult } from "@/types/dailyCase";

export const SESSION_KEY = "sd-daily-case-session";

export interface StoredSession {
  dateStr: string;
  caseId: string;
  currentStep: number;
  stepStartTime: number;
  stepResults: StepResult[];
}

export function loadSession(dateStr: string, caseId: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.dateStr !== dateStr || parsed.caseId !== caseId) return null;
    if (typeof parsed.currentStep !== "number" || typeof parsed.stepStartTime !== "number") return null;
    if (!Array.isArray(parsed.stepResults)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // quota or privacy mode — silent ignore
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
