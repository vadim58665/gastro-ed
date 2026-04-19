"use client";

import PatientAvatar from "./PatientAvatar";

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
}

export default function ConsiliumHero({
  eyebrow,
  title,
  description,
  ctaLabel,
  onCta,
}: Props) {
  return (
    <div className="flex flex-col items-center text-center max-w-sm mx-auto">
      <PatientAvatar size={96} />

      <p
        className="text-[10px] uppercase tracking-[0.28em] font-semibold mt-6 mb-3"
        style={{ color: "var(--color-aurora-violet)" }}
      >
        {eyebrow}
      </p>
      <h1 className="text-2xl font-extralight aurora-text tracking-tight mb-3">
        {title}
      </h1>
      <div className="w-10 h-px bg-border mb-5" />
      <p className="text-xs text-muted mb-8 leading-relaxed max-w-xs">
        {description}
      </p>
      <button
        onClick={onCta}
        className="px-8 py-3 rounded-xl btn-premium-dark text-sm font-medium"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
