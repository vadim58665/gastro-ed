"use client";

export type ConfidenceLevel = "confident" | "unsure" | "guessing";

interface ConfidenceButtonsProps {
  onSelect: (level: ConfidenceLevel) => void;
  selected?: ConfidenceLevel | null;
  disabled?: boolean;
}

const LEVELS: { key: ConfidenceLevel; label: string; color: string }[] = [
  { key: "confident", label: "Уверен", color: "border-success/40 text-success hover:bg-success/5" },
  { key: "unsure", label: "Не уверен", color: "border-warning/40 text-warning hover:bg-warning/5" },
  { key: "guessing", label: "Угадываю", color: "border-danger/40 text-danger hover:bg-danger/5" },
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
            selected === l.key
              ? l.color.replace("hover:", "") + " bg-opacity-10"
              : "border-border text-muted hover:text-foreground"
          } ${disabled ? "opacity-40 pointer-events-none" : ""}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
