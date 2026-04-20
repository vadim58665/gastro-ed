"use client";

import type { ExtractedData } from "./ExtractedDataPanel";

export interface Evaluation {
  correct: boolean;
  actualDiagnosis: string;
  anamnesisScore: number;
  questionsScore: number;
  diagnosticsScore: number;
  missed: string[];
  advice: string;
  extracted?: ExtractedData;
}

interface Props {
  evaluation: Evaluation;
  userDiagnosis: string;
  onNewPatient: () => void;
  onGoToStudy: () => void;
}

function ScoreTile({ label, score }: { label: string; score: number }) {
  const pct = Math.max(0, Math.min(100, score * 10));
  const tone =
    score >= 8
      ? "var(--color-success)"
      : score >= 5
        ? "var(--color-aurora-violet)"
        : "var(--color-danger)";
  return (
    <div
      className="p-3 rounded-xl aurora-hairline"
      style={{ background: "var(--color-card)" }}
    >
      <p
        className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-1.5"
        style={{ color: "var(--color-aurora-violet)" }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-extralight tabular-nums text-foreground">
          {score}
        </span>
        <span className="text-[11px] text-muted">/10</span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: "color-mix(in srgb, var(--color-border) 60%, transparent)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: tone }}
        />
      </div>
    </div>
  );
}

export default function ConsiliumReview({
  evaluation,
  userDiagnosis,
  onNewPatient,
  onGoToStudy,
}: Props) {
  const verdictColor = evaluation.correct ? "var(--color-success)" : "var(--color-danger)";
  const verdictLabel = evaluation.correct ? "Диагноз верный" : "Диагноз неверный";

  return (
    <div className="px-5 pt-2 pb-8 max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-[0.22em] font-semibold"
          style={{
            background: `color-mix(in srgb, ${verdictColor} 14%, transparent)`,
            color: verdictColor,
            border: `1px solid color-mix(in srgb, ${verdictColor} 30%, transparent)`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: verdictColor }}
            aria-hidden
          />
          {verdictLabel}
        </div>
        <p
          className="text-[10px] uppercase tracking-[0.28em] font-semibold mt-5 mb-2"
          style={{ color: "var(--color-aurora-violet)" }}
        >
          Заболевание пациента
        </p>
        <h2 className="text-2xl font-extralight aurora-text tracking-tight leading-tight">
          {evaluation.actualDiagnosis || "Не определено"}
        </h2>
        {userDiagnosis && (
          <p className="mt-3 text-xs text-muted">
            Ваш диагноз: <span className="text-foreground">{userDiagnosis}</span>
          </p>
        )}
      </div>

      <div className="w-10 h-px bg-border mx-auto" />

      <div className="grid grid-cols-3 gap-2">
        <ScoreTile label="Анамнез" score={evaluation.anamnesisScore} />
        <ScoreTile label="Вопросы" score={evaluation.questionsScore} />
        <ScoreTile label="Диагностика" score={evaluation.diagnosticsScore} />
      </div>

      {evaluation.extracted &&
        (evaluation.extracted.symptoms.length > 0 ||
          evaluation.extracted.anamnesis.length > 0 ||
          evaluation.extracted.orders.length > 0) && (
          <section>
            <p
              className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-2.5"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              Что вы собрали
            </p>
            <div
              className="rounded-xl aurora-hairline p-3.5 space-y-3"
              style={{ background: "var(--color-card)" }}
            >
              {(
                [
                  { key: "symptoms", label: "Симптомы" },
                  { key: "anamnesis", label: "Анамнез" },
                  { key: "orders", label: "Назначения" },
                ] as const
              ).map(({ key, label }) => {
                const items = evaluation.extracted![key];
                return (
                  <div key={key}>
                    <p
                      className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-1.5"
                      style={{ color: "var(--color-aurora-violet)" }}
                    >
                      {label}
                      <span className="ml-1.5 text-muted font-normal normal-case tracking-normal">
                        {items.length}
                      </span>
                    </p>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted italic">не упомянуто</p>
                    ) : (
                      <ul className="space-y-1">
                        {items.map((item, i) => (
                          <li
                            key={i}
                            className="text-xs text-foreground leading-relaxed flex gap-2"
                          >
                            <span
                              className="shrink-0 mt-[7px] w-1 h-1 rounded-full"
                              style={{ background: "var(--color-aurora-violet)" }}
                              aria-hidden
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      {evaluation.missed.length > 0 && (
        <section>
          <p
            className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-2.5"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Что упустили
          </p>
          <ul
            className="rounded-xl aurora-hairline p-3.5 space-y-2"
            style={{ background: "var(--color-card)" }}
          >
            {evaluation.missed.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-foreground">
                <span
                  className="shrink-0 mt-[7px] w-1 h-1 rounded-full"
                  style={{ background: "var(--color-aurora-violet)" }}
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {evaluation.advice && (
        <section>
          <p
            className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-2.5"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Совет
          </p>
          <div
            className="rounded-xl aurora-hairline p-3.5"
            style={{
              background:
                "linear-gradient(180deg, var(--color-card) 0%, var(--aurora-violet-soft) 100%)",
            }}
          >
            <p className="text-xs leading-relaxed text-foreground">{evaluation.advice}</p>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={onNewPatient}
          className="w-full py-3 rounded-xl btn-premium-dark text-sm font-medium"
        >
          Новый пациент
        </button>
        <button
          onClick={onGoToStudy}
          className="w-full py-2 text-xs text-muted hover:text-foreground transition-colors"
        >
          К учёбе
        </button>
      </div>
    </div>
  );
}
