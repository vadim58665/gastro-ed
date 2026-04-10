"use client";

import type { DifficultyLevel } from "@/types/card";

const LEVELS: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: 1, label: "СТУДЕНТ", description: "Базовые факты" },
  { value: 2, label: "ОРДИНАТОР", description: "Дифференциальная диагностика" },
  { value: 3, label: "ВРАЧ", description: "Клинические сценарии" },
  { value: 4, label: "ПРОФЕССОР", description: "Редкие состояния" },
  { value: 5, label: "АКАДЕМИК", description: "Экспертный уровень" },
];

interface DifficultySelectorProps {
  value: DifficultyLevel;
  onChange: (level: DifficultyLevel) => void;
  compact?: boolean;
}

export default function DifficultySelector({
  value,
  onChange,
  compact = false,
}: DifficultySelectorProps) {
  if (compact) {
    return (
      <div className="flex gap-1">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-md transition-all ${
              value === level.value
                ? "bg-primary text-white"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium">
        Уровень сложности
      </p>
      <div className="space-y-1">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
              value === level.value
                ? "border-primary/50 bg-primary/5"
                : "border-border/30 hover:border-border/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-light ${
                  value === level.value
                    ? "bg-primary text-white"
                    : "bg-surface text-muted"
                }`}
              >
                {level.value}
              </div>
              <div className="text-left">
                <p className={`text-xs uppercase tracking-widest ${
                  value === level.value ? "text-foreground" : "text-muted"
                }`}>
                  {level.label}
                </p>
                <p className="text-[10px] text-muted">{level.description}</p>
              </div>
            </div>
            {value === level.value && (
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export { LEVELS as DIFFICULTY_LEVELS };
