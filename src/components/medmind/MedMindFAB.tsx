"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import MedMindDrawer from "./MedMindDrawer";

export default function MedMindFAB() {
  const { isPro, engagementLevel } = useSubscription();
  const [open, setOpen] = useState(false);

  // No FAB for free users or light engagement
  if (!isPro || engagementLevel === "light") return null;

  const size = engagementLevel === "maximum" ? "w-14 h-14" : "w-12 h-12";

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/10"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <MedMindDrawer open={open} onClose={() => setOpen(false)} />

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-20 right-4 z-50 ${size} rounded-full flex items-center justify-center transition-all duration-200 btn-press card-shadow ${
          open
            ? "bg-primary text-white"
            : "bg-card border border-primary/30 text-primary"
        }`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {open ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <>
              <path d="M12 3v2m0 14v2M5.636 5.636l1.414 1.414m9.9 9.9l1.414 1.414M3 12h2m14 0h2M5.636 18.364l1.414-1.414m9.9-9.9l1.414-1.414" />
              <circle cx="12" cy="12" r="4" />
            </>
          )}
        </svg>
      </button>
    </>
  );
}
