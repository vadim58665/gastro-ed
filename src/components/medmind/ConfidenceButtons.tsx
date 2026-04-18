"use client";

export type ConfidenceLevel = "confident" | "unsure" | "guessing";

interface ConfidenceButtonsProps {
  onSelect: (level: ConfidenceLevel) => void;
  selected?: ConfidenceLevel | null;
  disabled?: boolean;
}

const LEVELS: {
  key: ConfidenceLevel;
  label: string;
  color: string;
  borderColor: string;
  hoverBg: string;
}[] = [
  {
    key: "confident",
    label: "Уверен",
    color: "var(--color-aurora-indigo)",
    borderColor: "var(--aurora-indigo-border)",
    hoverBg: "var(--aurora-indigo-soft)",
  },
  {
    key: "unsure",
    label: "Не уверен",
    color: "var(--color-aurora-violet)",
    borderColor: "var(--aurora-violet-border)",
    hoverBg: "var(--aurora-violet-soft)",
  },
  {
    key: "guessing",
    label: "Угадываю",
    color: "var(--color-aurora-pink)",
    borderColor: "var(--aurora-pink-border)",
    hoverBg: "var(--aurora-pink-soft)",
  },
];

export default function ConfidenceButtons({
  onSelect,
  selected,
  disabled,
}: ConfidenceButtonsProps) {
  return (
    <div className="flex gap-2 justify-center py-2">
      {LEVELS.map((l) => (
        <button
          key={l.key}
          onClick={() => onSelect(l.key)}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-widest transition-all ${
            disabled ? "opacity-40 pointer-events-none" : ""
          }`}
          style={
            selected === l.key
              ? {
                  color: l.color,
                  borderColor: l.borderColor,
                  background: l.hoverBg,
                }
              : {
                  color: undefined,
                  borderColor: undefined,
                }
          }
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
