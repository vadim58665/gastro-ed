"use client";

import { useEffect, useState } from "react";

interface CharacterBubbleProps {
  message: string | null;
  duration?: number;
}

export default function CharacterBubble({ message, duration = 3000 }: CharacterBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (message) {
      setText(message);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [message, duration]);

  if (!visible || !text) return null;

  return (
    <div className="fixed bottom-[7.5rem] right-4 z-40 animate-bubble-in">
      <div className="bg-card border border-border/50 rounded-xl px-3 py-1.5 shadow-sm max-w-[160px]">
        <p className="text-[11px] text-foreground leading-snug">{text}</p>
      </div>
      {/* Triangle pointing down */}
      <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-card border-r border-b border-border/50 transform rotate-45" />
    </div>
  );
}
