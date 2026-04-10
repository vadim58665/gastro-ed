"use client";

import { CharacterBody } from "./CharacterAvatar";
import type { CompanionKind } from "@/contexts/ThemeContext";

interface Props {
  kind: CompanionKind;
  size?: number;
}

/**
 * Static, non-interactive preview of a character for pickers/menus.
 * Uses the shared CharacterBody renderer with no drag/position wrapper.
 */
export default function CharacterAvatarPreview({ kind, size = 56 }: Props) {
  return (
    <div
      className="relative pointer-events-none"
      style={{ width: size, height: size }}
    >
      <CharacterBody companion={kind} size={size} state="idle" />
    </div>
  );
}

