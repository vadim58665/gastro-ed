"use client";

import { useState } from "react";
import type { CardHistoryEntry } from "@/types/user";
import { isStruggling } from "@/lib/adaptive";

interface Props {
  cardId: string;
  keyFact?: string;
  cardHistory?: CardHistoryEntry;
}

const STORAGE_KEY = "sd-mnemonics";

function loadUserNotes(): Record<string, string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveUserNote(cardId: string, note: string) {
  try {
    const notes = loadUserNotes();
    if (note.trim()) {
      notes[cardId] = note.trim();
    } else {
      delete notes[cardId];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore
  }
}

export default function MnemonicHint({ cardId, keyFact, cardHistory }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [userNote, setUserNote] = useState(() => loadUserNotes()[cardId] || "");
  const [editing, setEditing] = useState(false);

  const shouldShow = isStruggling(cardHistory) || !!keyFact || !!userNote;
  if (!shouldShow) return null;

  return (
    <div className="mt-3 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-surface/50 transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-warning shrink-0"
        >
          <path d="M9 21h6M12 3a6 6 0 014 10.5V17H8v-3.5A6 6 0 0112 3z" />
        </svg>
        <span className="text-xs uppercase tracking-wider text-muted font-medium">
          Мнемоника
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`ml-auto text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {keyFact && (
            <p className="text-sm text-foreground leading-relaxed">
              {keyFact}
            </p>
          )}

          {userNote && !editing && (
            <div className="bg-surface/50 rounded-md p-2">
              <p className="text-xs text-muted mb-0.5">Ваша заметка:</p>
              <p className="text-sm text-foreground">{userNote}</p>
            </div>
          )}

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Напишите свою мнемонику..."
                className="w-full text-sm border border-border rounded-md p-2 bg-background resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    saveUserNote(cardId, userNote);
                    setEditing(false);
                  }}
                  className="text-xs text-primary font-medium"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-muted"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-primary font-medium"
            >
              {userNote ? "Редактировать заметку" : "Добавить свою мнемонику"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
