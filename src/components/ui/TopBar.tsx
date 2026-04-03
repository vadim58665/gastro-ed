"use client";

import StreakBadge from "./StreakBadge";
import ModeSwitch from "./ModeSwitch";

export default function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-b border-border z-50">
      <div className="max-w-lg mx-auto px-4 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <ModeSwitch />
        </div>
        <StreakBadge />
      </div>
    </header>
  );
}
