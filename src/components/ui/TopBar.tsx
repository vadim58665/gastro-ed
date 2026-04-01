"use client";

import StreakBadge from "./StreakBadge";

export default function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-b border-border z-50 px-4 py-3">
      <div className="max-w-lg mx-auto">
        <StreakBadge />
      </div>
    </header>
  );
}
