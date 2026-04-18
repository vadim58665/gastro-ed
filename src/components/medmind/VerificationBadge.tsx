"use client";

interface Props {
  isAccurate: boolean;
  confidence: number;
  corrections?: string[];
}

export default function VerificationBadge({
  isAccurate,
  confidence,
  corrections,
}: Props) {
  if (isAccurate && confidence > 0.7) {
    return (
      <div
        className="flex items-center gap-1.5"
        style={{ color: "var(--color-aurora-indigo)" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-[9px] uppercase tracking-widest font-medium">
          Проверено
        </span>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-1.5"
        style={{ color: "var(--color-aurora-violet)" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-[9px] uppercase tracking-widest font-medium">
          Требует уточнения
        </span>
      </div>
      {corrections && corrections.length > 0 && (
        <div className="mt-1 pl-4">
          {corrections.map((c, i) => (
            <p key={i} className="text-[10px] text-muted leading-relaxed">
              {c}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
