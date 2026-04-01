"use client";

import { useEffect, useState } from "react";

interface Props {
  dailyGoal: number;
  onClose: () => void;
}

export default function DailyGoalCelebration({ dailyGoal, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center px-8"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease-in-out",
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <p className="text-8xl font-extralight text-foreground">{dailyGoal}</p>

        <div className="w-12 h-px bg-border" />

        <p className="text-xs uppercase tracking-widest text-muted">
          ЦЕЛЬ ДНЯ ДОСТИГНУТА
        </p>
      </div>
    </div>
  );
}
