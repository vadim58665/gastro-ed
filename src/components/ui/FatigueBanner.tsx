"use client";

interface FatigueBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function FatigueBanner({ message, onDismiss }: FatigueBannerProps) {
  return (
    <div className="fixed top-16 left-4 right-4 z-50 animate-bubble-in">
      <div className="bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-warning">Время отдохнуть</p>
          <p className="text-[11px] text-foreground mt-1 leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-muted hover:text-foreground transition-colors mt-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
