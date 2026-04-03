import type { CardHistoryEntry } from "@/types/user";

export function isStruggling(entry: CardHistoryEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.consecutiveFails >= 2) return true;
  if (entry.attempts >= 3 && entry.correct / entry.attempts < 0.4) return true;
  return false;
}

export function isChronic(entry: CardHistoryEntry | undefined): boolean {
  if (!entry) return false;
  return entry.attempts >= 5 && entry.correct / entry.attempts < 0.5;
}

export function getDifficultyLevel(
  entry: CardHistoryEntry | undefined
): "normal" | "struggling" | "chronic" {
  if (isChronic(entry)) return "chronic";
  if (isStruggling(entry)) return "struggling";
  return "normal";
}
