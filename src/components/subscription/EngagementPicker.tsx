"use client";

import { useSubscription } from "@/hooks/useSubscription";
import type { EngagementLevel } from "@/types/medmind";

const LEVELS: { value: EngagementLevel; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "maximum", label: "Maximum" },
];

export default function EngagementPicker() {
  const { isPro, engagementLevel, setEngagementLevel } = useSubscription();

  if (!isPro) return null;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-3">
        УРОВЕНЬ MEDMIND
      </p>
      <div className="flex gap-2">
        {LEVELS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setEngagementLevel(value)}
            className={`flex-1 py-2 rounded-full text-xs font-medium transition-colors btn-press ${
              engagementLevel === value
                ? "bg-primary text-white"
                : "border border-border text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
