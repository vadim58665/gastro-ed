"use client";

type Difficulty = "easy" | "medium" | "hard";

interface DailyCaseHeaderProps {
  title: string;
  /** Уже отформатированная дата для показа (например, «18 апр»). */
  dateLabel: string;
  difficulty: Difficulty;
}

const difficultyLabel: Record<Difficulty, string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
};

/**
 * Шапка для /daily-case (полупрозрачная ink-translucent, на premium-dark фоне).
 * Label «ДИАГНОЗ ДНЯ · дата» в aurora-violet, title в extralight,
 * difficulty-chip с aurora-mapped точкой (indigo/violet/pink).
 */
export default function DailyCaseHeader({ title, dateLabel, difficulty }: DailyCaseHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "color-mix(in srgb, var(--color-ink) 70%, transparent)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid transparent",
        backgroundImage:
          "linear-gradient(color-mix(in srgb, var(--color-ink) 70%, transparent), color-mix(in srgb, var(--color-ink) 70%, transparent)), linear-gradient(90deg, color-mix(in srgb, var(--color-aurora-indigo) 55%, transparent), color-mix(in srgb, var(--color-aurora-violet) 45%, transparent), color-mix(in srgb, var(--color-aurora-pink) 35%, transparent))",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Диагноз дня · {dateLabel}
          </div>
          <div className="text-[15px] font-extralight text-white truncate mt-0.5">
            {title}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
          <span className={`daily-difficulty-dot daily-difficulty-dot--${difficulty}`} />
          <span className="text-[10px] uppercase tracking-[0.15em] text-white font-semibold">
            {difficultyLabel[difficulty]}
          </span>
        </div>
      </div>
    </header>
  );
}
