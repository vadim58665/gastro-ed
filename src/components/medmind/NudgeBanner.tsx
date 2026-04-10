"use client";

import { useState, useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import type { Nudge } from "@/types/medmind";

interface Props {
  nudge: Nudge;
  onDismiss: (id: string) => void;
}

export default function NudgeBanner({ nudge, onDismiss }: Props) {
  const { engagementLevel } = useSubscription();
  const [visible, setVisible] = useState(true);

  // Only show in maximum engagement
  if (engagementLevel !== "maximum") return null;

  // Auto-dismiss after 5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss(nudge.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [nudge.id, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 px-4 animate-result">
      <div className="max-w-lg mx-auto bg-card border border-border rounded-xl px-4 py-3 card-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-primary mb-0.5">
              MEDMIND
            </p>
            <p className="text-sm text-foreground">{nudge.titleRu}</p>
            <p className="text-xs text-muted mt-0.5">{nudge.bodyRu}</p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              onDismiss(nudge.id);
            }}
            className="text-muted text-lg leading-none"
          >
            x
          </button>
        </div>
      </div>
    </div>
  );
}
