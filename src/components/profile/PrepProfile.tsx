"use client";

import { useState, useMemo } from "react";
import ProfileSheet from "@/components/profile/ProfileSheet";
import AuthSection from "@/components/profile/AuthSection";
import ErrorAnalytics from "@/components/profile/ErrorAnalytics";
import ExamCountdown from "@/components/analytics/ExamCountdown";
import MagicCard from "@/components/ui/MagicCard";
import NumberTicker from "@/components/ui/NumberTicker";
import GradientRing from "@/components/ui/GradientRing";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import {
  getTotalQuestionCount,
  getBlockCount,
  getQuestionsForSpecialty,
} from "@/data/accreditation/index";
import { accreditationCategories } from "@/data/specialties";
import { computeBlockReadiness, type BlockReadinessLevel } from "@/lib/accreditationErrors";

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} мин ${s} сек` : `${s} сек`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

const LEVEL_CONFIG: Record<BlockReadinessLevel, { label: string; colorClass?: string; colorVar?: string; bgClass?: string; bgVar?: string }> = {
  not_started: { label: "Не начат",  colorClass: "text-muted",       bgClass: "bg-border" },
  started:     { label: "Начат",     colorClass: "text-foreground",  bgClass: "bg-primary/40" },
  weak:        { label: "Слабый",    colorVar: "var(--color-aurora-pink)",   bgVar: "var(--aurora-pink-soft)" },
  ready:       { label: "Готов",     colorClass: "text-primary",     bgClass: "bg-primary" },
  strong:      { label: "Уверенно",  colorVar: "var(--color-aurora-indigo)", bgVar: "var(--aurora-indigo-soft)" },
};

export default function PrepProfile() {
  const { activeSpecialty, setActiveSpecialty } = useSpecialty();
  const [sheetKind, setSheetKind] = useState<"settings" | "styles" | "companion" | null>(null);
  const [showSpecPicker, setShowSpecPicker] = useState(false);

  const specialtyId = activeSpecialty?.id || "";
  const { progress, totalLearned } = useAccreditation(specialtyId);

  const totalQuestions = useMemo(
    () => (specialtyId ? getTotalQuestionCount(specialtyId) : 0),
    [specialtyId]
  );
  const blockCount = useMemo(
    () => (specialtyId ? getBlockCount(specialtyId) : 0),
    [specialtyId]
  );

  const questions = useMemo(
    () => (specialtyId ? getQuestionsForSpecialty(specialtyId) : []),
    [specialtyId]
  );

  const learnedPercent = totalQuestions > 0
    ? Math.round((totalLearned / totalQuestions) * 100)
    : 0;

  const completedBlocks = progress.blocks.filter(
    (b) => b.learned === b.total && b.total > 0
  ).length;

  const recentExams = useMemo(
    () => [...progress.examResults].reverse().slice(0, 5),
    [progress.examResults]
  );

  const avgExamScore = useMemo(() => {
    if (progress.examResults.length === 0) return 0;
    const sum = progress.examResults.reduce((s, r) => s + r.percentage, 0);
    return Math.round(sum / progress.examResults.length);
  }, [progress.examResults]);

  const lastExamScore = recentExams[0]?.percentage ?? null;

  const errorCount = progress.mistakes.length;

  const blockReadiness = useMemo(
    () => computeBlockReadiness(progress, questions),
    [progress, questions]
  );

  // Readiness verdict
  const overallAccuracy = useMemo(() => {
    const stats = progress.questionStats ?? {};
    let total = 0;
    let correct = 0;
    for (const s of Object.values(stats)) {
      total += s.attempts;
      correct += s.attempts - s.wrong;
    }
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }, [progress.questionStats]);

  // Specialties for picker
  const specsWithQuestions = useMemo(() => {
    const result: Array<{ id: string; name: string; qCount: number }> = [];
    for (const cat of accreditationCategories) {
      for (const spec of cat.specialties) {
        const qCount = getTotalQuestionCount(spec.id);
        if (qCount > 0) result.push({ id: spec.id, name: spec.name, qCount });
      }
    }
    return result;
  }, []);

  const weakBlocks = blockReadiness.filter((b) => b.level === "weak");
  const strongBlocks = blockReadiness.filter((b) => b.level === "strong");
  const notStartedBlocks = blockReadiness.filter((b) => b.level === "not_started");

  return (
    <>
      {/* Aurora welcome band (visible-premium polish) */}
      <div className="aurora-welcome-band" />

      {/* Settings gear */}
      <div className="px-6 pt-4 flex items-center justify-end">
        <SettingsButton onClick={() => setSheetKind("settings")} />
      </div>

      {/* Specialty picker */}
      <div className="px-6 pt-4 pb-2">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted font-medium mb-3 text-center">
          Готовность к аккредитации
        </p>
        <button
          onClick={() => setShowSpecPicker(!showSpecPicker)}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-card aurora-hairline btn-press"
        >
          <span className="text-sm font-semibold text-foreground truncate">
            {activeSpecialty ? activeSpecialty.name : "Выберите специальность"}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-muted shrink-0 transition-transform ${showSpecPicker ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showSpecPicker && (
          <div className="mt-2 flex flex-col bg-surface rounded-2xl border border-border/40 max-h-72 overflow-y-auto overscroll-contain">
            {specsWithQuestions.map((spec) => {
              const active = spec.id === activeSpecialty?.id;
              return (
                <button
                  key={spec.id}
                  onClick={() => {
                    setActiveSpecialty(spec.id);
                    setShowSpecPicker(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    active ? "bg-primary/10" : "hover:bg-card"
                  }`}
                >
                  <span className={`text-sm font-medium truncate ${active ? "text-primary" : "text-foreground"}`}>
                    {spec.name}
                  </span>
                  <span className="text-[10px] text-muted shrink-0 ml-2 tabular-nums">
                    {spec.qCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* No specialty selected */}
      {!activeSpecialty ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted leading-relaxed max-w-[280px] mx-auto">
            Выберите специальность выше, чтобы увидеть статистику готовности
          </p>
        </div>
      ) : (
        <>
          {/* Exam Countdown */}
          <div className="px-6 mt-4 mb-6">
            <ExamCountdown />
          </div>

          {/* Readiness overview */}
          <div className="px-6 mb-6">
            <MagicCard
              className="rounded-3xl aurora-hairline"
              gradientFrom="var(--color-aurora-indigo)"
              gradientTo="var(--color-aurora-violet)"
              spotlightColor="color-mix(in srgb, var(--color-aurora-violet) 14%, transparent)"
            >
              <div className="px-6 py-8">
                <div className="flex items-center justify-center gap-8">
                  <div className="relative shrink-0">
                    <GradientRing value={learnedPercent} size={120} thickness={5} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extralight tracking-tight leading-none aurora-text tabular-nums">
                        <NumberTicker value={learnedPercent} />%
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.15em] text-muted mt-1 font-medium">
                        покрытие
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <StatRow value={`${totalLearned}/${totalQuestions}`} label="вопросов изучено" />
                    <StatRow value={`${completedBlocks}/${blockCount}`} label="блоков пройдено" />
                    <StatRow value={overallAccuracy > 0 ? `${overallAccuracy}%` : "-"} label="общая точность" highlight={overallAccuracy >= 70 ? "success" : overallAccuracy > 0 ? "danger" : undefined} />
                    {errorCount > 0 && (
                      <StatRow value={`${errorCount}`} label={pluralize(errorCount, "активная ошибка", "активных ошибки", "активных ошибок")} highlight="danger" />
                    )}
                  </div>
                </div>
              </div>
            </MagicCard>
          </div>

          {/* Key metrics row */}
          <div className="px-6 mb-6">
            <div className="grid grid-cols-3 gap-2">
              <MetricCell
                value={lastExamScore !== null ? `${lastExamScore}%` : "-"}
                label="последний экзамен"
                sub={lastExamScore !== null ? (lastExamScore >= 70 ? "сдан" : "не сдан") : undefined}
                subColor={lastExamScore !== null ? (lastExamScore >= 70 ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)") : undefined}
              />
              <MetricCell
                value={avgExamScore > 0 ? `${avgExamScore}%` : "-"}
                label="средний балл"
                sub={recentExams.length > 0 ? `${recentExams.length} ${pluralize(recentExams.length, "попытка", "попытки", "попыток")}` : undefined}
              />
              <MetricCell
                value={`${strongBlocks.length}/${blockCount}`}
                label="блоков уверенно"
              />
            </div>
          </div>

          {/* Block readiness map */}
          <div className="px-6 mb-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium mb-3">
              Готовность по блокам
            </p>
            <div className="space-y-1.5">
              {blockReadiness.map((b) => {
                const cfg = LEVEL_CONFIG[b.level];
                const accPct = Math.round(b.accuracy * 100);
                const covPct = Math.round(b.coverage * 100);
                return (
                  <div
                    key={b.blockNumber}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-surface"
                  >
                    <span className="text-xs font-semibold text-foreground w-14 shrink-0 tabular-nums">
                      Блок {b.blockNumber}
                    </span>

                    {/* Coverage bar */}
                    <div className="flex-1 h-2 rounded-full bg-border/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all${cfg.bgClass ? ` ${cfg.bgClass}` : ""}`}
                        style={{
                          width: `${Math.max(covPct, b.level !== "not_started" ? 4 : 0)}%`,
                          ...(cfg.bgVar ? { background: cfg.bgVar } : {}),
                        }}
                      />
                    </div>

                    {/* Accuracy + level */}
                    <div className="flex items-center gap-2 shrink-0">
                      {b.answered > 0 && (
                        <span
                          className="text-[10px] font-semibold tabular-nums"
                          style={{ color: accPct >= 70 ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)" }}
                        >
                          {accPct}%
                        </span>
                      )}
                      <span
                        className={`text-[9px] uppercase tracking-wider font-bold${cfg.colorClass ? ` ${cfg.colorClass}` : ""}`}
                        style={cfg.colorVar ? { color: cfg.colorVar } : undefined}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weak blocks alert */}
          {weakBlocks.length > 0 && (
            <div className="px-6 mb-6">
              <div
                className="rounded-2xl p-4 border"
                style={{
                  background: "var(--aurora-pink-soft)",
                  borderColor: "var(--aurora-pink-border)",
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-medium mb-2"
                  style={{ color: "var(--color-aurora-pink)" }}
                >
                  Требуют внимания
                </p>
                <p className="text-xs text-foreground leading-relaxed">
                  {weakBlocks.length === 1 ? "Блок" : "Блоки"}{" "}
                  {weakBlocks.map((b) => b.blockNumber).join(", ")} -
                  точность ниже 60%. Рекомендуется проработать заново.
                </p>
              </div>
            </div>
          )}

          {/* Not started blocks hint */}
          {notStartedBlocks.length > 0 && (
            <div className="px-6 mb-6">
              <div className="rounded-2xl bg-surface border border-border p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium mb-2">
                  Не начаты
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  {notStartedBlocks.length === 1 ? "Блок" : "Блоки"}{" "}
                  {notStartedBlocks.map((b) => b.blockNumber).join(", ")} -
                  ещё не затронуты. {notStartedBlocks.length} из {blockCount} не начаты.
                </p>
              </div>
            </div>
          )}

          {/* Exam history */}
          {recentExams.length > 0 && (
            <div className="px-6 mb-6">
              <div className="w-full divider-soft mb-6" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium mb-3">
                История пробных экзаменов
              </p>
              <div className="space-y-1.5">
                {recentExams.map((result, i) => {
                  const trend = i === 0 && progress.examResults.length > 1
                    ? result.percentage > avgExamScore ? "up" : result.percentage < avgExamScore ? "down" : null
                    : null;
                  return (
                    <div
                      key={result.timestamp}
                      className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-surface"
                    >
                      <GradientRing value={result.percentage} size={40} thickness={3} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {result.percentage}%
                          </span>
                          {result.passed ? (
                            <span
                              className="text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                              style={{ color: "var(--color-aurora-indigo)", background: "var(--aurora-indigo-soft)" }}
                            >
                              сдан
                            </span>
                          ) : (
                            <span
                              className="text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                              style={{ color: "var(--color-aurora-pink)", background: "var(--aurora-pink-soft)" }}
                            >
                              не сдан
                            </span>
                          )}
                          {trend === "up" && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--color-aurora-indigo)" }}>
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                          )}
                          {trend === "down" && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--color-aurora-pink)" }}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          )}
                        </div>
                        <p className="text-[10px] text-muted mt-0.5">
                          {result.correct}/{result.total} · {formatDuration(result.duration)} · {formatDate(result.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error analytics */}
          <div className="px-6">
            <div className="w-full divider-soft mb-6" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium mb-4">
              Аналитика ошибок
            </p>
            <ErrorAnalytics specialtyId={specialtyId} />
          </div>

          {/* Auth section */}
          <div className="px-6">
            <AuthSection />
          </div>
        </>
      )}

      <ProfileSheet
        open={sheetKind !== null}
        kind={sheetKind}
        onClose={() => setSheetKind(null)}
      />
    </>
  );
}

function StatRow({
  value,
  label,
  highlight,
}: {
  value: string;
  label: string;
  highlight?: "success" | "danger";
}) {
  const valueColorVar = highlight === "success"
    ? "var(--color-aurora-indigo)"
    : highlight === "danger"
      ? "var(--color-aurora-pink)"
      : undefined;
  return (
    <div>
      <div
        className="text-lg font-extralight tracking-tight tabular-nums leading-none text-foreground"
        style={valueColorVar ? { color: valueColorVar } : undefined}
      >
        {value}
      </div>
      <p className="text-[9px] uppercase tracking-[0.12em] text-muted mt-1 font-medium">
        {label}
      </p>
    </div>
  );
}

function MetricCell({
  value,
  label,
  sub,
  subColor,
}: {
  value: string;
  label: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="text-center py-3.5 rounded-xl bg-surface">
      <div className="text-lg font-extralight tracking-tight leading-none text-foreground tabular-nums">
        {value}
      </div>
      <p className="text-[8px] uppercase tracking-[0.1em] text-muted mt-1.5 font-medium leading-tight px-1">
        {label}
      </p>
      {sub && (
        <p
          className="text-[8px] mt-0.5 font-semibold text-muted"
          style={subColor ? { color: subColor } : undefined}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn-press aurora-hairline w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted hover:text-foreground transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      aria-label="Настройки"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );
}
