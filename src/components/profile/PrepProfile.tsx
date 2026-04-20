"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AvatarStack from "@/components/ui/AvatarStack";
import StatTile from "@/components/ui/StatTile";
import AccuracyRing from "@/components/ui/AccuracyRing";
import ToolRow from "@/components/ui/ToolRow";
import ProfileSheet from "@/components/profile/ProfileSheet";
import AuthSection from "@/components/profile/AuthSection";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import {
  accreditationCategories,
  findCategoryBySpecialtyId,
} from "@/data/specialties";
import {
  getTotalQuestionCount,
  getBlockCount,
  getQuestionsForSpecialty,
} from "@/data/accreditation/index";
import {
  computeBlockReadiness,
  computeFrequentErrors,
  type BlockReadinessLevel,
} from "@/lib/accreditationErrors";

const TIER_LABELS: Record<string, string> = {
  feed_helper: "Помощник ленты",
  accred_basic: "Базовый",
  accred_mentor: "Наставник",
  accred_tutor: "Репетитор",
  accred_extreme: "Максимальное вовлечение",
};

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (24 * 60 * 60 * 1000)));
}

// SVG icons
const CALENDAR_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
  </svg>
);
const EYE_OFF_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const NOTES_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="9" y1="7" x2="16" y2="7" />
    <line x1="9" y1="11" x2="15" y2="11" />
  </svg>
);
const HISTORY_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <polyline points="3 4 3 10 9 10" />
    <polyline points="12 7 12 12 16 14" />
  </svg>
);
const CAP_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const EXAM_DATE_KEY = "sd-exam-date";

interface Props {
  examDateIso?: string; // опциональная дата аккредитации (читается из localStorage на странице)
}

export default function PrepProfile() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { isPro, tier } = useSubscription();
  const { activeSpecialty, setActiveSpecialty } = useSpecialty();
  const [sheetKind, setSheetKind] = useState<"settings" | "styles" | "companion" | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  // Exam date (optional)
  const [examDate, setExamDate] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(EXAM_DATE_KEY) ?? "";
  });
  const [editingDate, setEditingDate] = useState(false);

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

  const blockReadiness = useMemo(
    () => computeBlockReadiness(progress, questions),
    [progress, questions]
  );

  const problemQuestions = useMemo(
    () => computeFrequentErrors(progress, questions, 5),
    [progress, questions]
  );

  const category = useMemo(
    () => (specialtyId ? findCategoryBySpecialtyId(specialtyId) : null),
    [specialtyId]
  );

  // Readiness = questions answered correctly at least once / total
  const readinessPct = totalQuestions > 0
    ? Math.round((totalLearned / totalQuestions) * 100)
    : 0;

  const readinessLabel =
    readinessPct >= 85 ? "Отличная готовность"
      : readinessPct >= 70 ? "Готов к экзамену"
        : readinessPct >= 40 ? "Хороший темп"
          : "Нужно наверстать";

  const toGreenZone = Math.max(0, Math.ceil(totalQuestions * 0.7) - totalLearned);

  // Accuracy across all stats
  const { correctAll, answeredAll, accuracyPct } = useMemo(() => {
    const stats = progress.questionStats ?? {};
    let correct = 0;
    let answered = 0;
    for (const s of Object.values(stats)) {
      answered += s.attempts;
      correct += s.attempts - s.wrong;
    }
    return {
      correctAll: correct,
      answeredAll: answered,
      accuracyPct: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    };
  }, [progress.questionStats]);

  const strongCount = blockReadiness.filter((b) => b.level === "strong").length;
  const readyCount = blockReadiness.filter((b) => b.level === "ready").length;
  const completedBlocks = strongCount + readyCount;
  const errorCount = progress.mistakes.length;
  const daysLeft = examDate ? daysUntil(examDate) : null;

  const weakBlocks = blockReadiness.filter((b) => b.level === "weak").slice(0, 3);
  const strongBlocks = blockReadiness
    .filter((b) => b.level === "strong" || b.level === "ready")
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3);

  const specsWithQuestions = useMemo(() => {
    const result: Array<{ id: string; name: string; catShort: string; qCount: number }> = [];
    for (const cat of accreditationCategories) {
      const catShort =
        cat.id === "ordinatura" ? "Ординатура"
          : cat.id === "specialitet" ? "Специалитет"
            : cat.id === "spo-special" ? "СПО спец."
              : cat.id === "spo-primary" ? "СПО"
                : cat.id === "profperepodgotovka" ? "Переподгот."
                  : cat.name;
      for (const spec of cat.specialties) {
        const qCount = getTotalQuestionCount(spec.id);
        if (qCount > 0) result.push({ id: spec.id, name: spec.name, catShort, qCount });
      }
    }
    return result;
  }, []);

  const todayAnsweredPct = Math.min(100, (answeredAll / 15) * 20); // rough activity ring filler

  const nickname = profile?.nickname || user?.email?.split("@")[0] || "Доктор";
  const avatarLetter = nickname[0]?.toUpperCase() ?? "Д";
  const tierLabel = tier ? TIER_LABELS[tier] ?? String(tier) : "Pro";

  function saveExamDate(d: string) {
    setExamDate(d);
    try {
      localStorage.setItem(EXAM_DATE_KEY, d);
    } catch {}
    setEditingDate(false);
  }

  function clearExamDate() {
    setExamDate("");
    try {
      localStorage.removeItem(EXAM_DATE_KEY);
    } catch {}
    setEditingDate(false);
  }

  return (
    <>
      {/* Settings gear */}
      <div className="px-6 pt-2 flex justify-end">
        <button
          onClick={() => setSheetKind("settings")}
          aria-label="Настройки"
          className="w-9 h-9 rounded-full bg-card aurora-hairline flex items-center justify-center text-muted btn-press"
          style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Identity */}
      <div className="px-6 pt-2 pb-4 flex flex-col items-center">
        <AvatarStack
          initial={avatarLetter}
          size={128}
          verified={isPro}
          activityPercent={todayAnsweredPct}
        />
        <div className="text-[22px] font-light tracking-tight text-foreground mt-5">
          {nickname}
        </div>
        <div className="text-[10px] text-muted mt-1 tracking-wide">
          {user?.email}
        </div>
        {isPro && (
          <div className="flex gap-1.5 mt-3.5 flex-wrap justify-center">
            <span
              className="text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full text-white font-medium"
              style={{
                background: "var(--aurora-gradient-premium)",
                boxShadow: "0 2px 6px color-mix(in srgb, var(--color-aurora-indigo) 35%, transparent), 0 8px 18px -6px color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)",
              }}
            >
              PRO · {tierLabel}
            </span>
          </div>
        )}
      </div>

      {/* Specialty selector — PRIMARY anchor */}
      <div className="px-6 mb-4">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl aurora-hairline btn-press text-left"
          style={{
            background: "linear-gradient(180deg, var(--color-card) 0%, color-mix(in srgb, var(--aurora-violet-soft) 45%, transparent) 100%)",
            boxShadow: "0 1px 2px rgba(17,24,39,0.03), 0 8px 20px -12px color-mix(in srgb, var(--color-aurora-indigo) 35%, transparent)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "var(--aurora-gradient-primary)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          >
            {CAP_SVG}
          </div>
          <div className="flex-1 min-w-0">
            {activeSpecialty && category ? (
              <>
                <p
                  className="text-[9px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: "var(--color-aurora-violet)" }}
                >
                  {category.shortName}
                </p>
                <p className="text-base font-medium text-foreground tracking-tight leading-tight mt-0.5 truncate">
                  {activeSpecialty.name}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {totalQuestions} вопросов · {blockCount} блоков
                </p>
              </>
            ) : (
              <>
                <p
                  className="text-[9px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: "var(--color-aurora-violet)" }}
                >
                  Аккредитация
                </p>
                <p className="text-base font-medium text-foreground tracking-tight leading-tight mt-0.5">
                  Выберите специальность
                </p>
              </>
            )}
          </div>
          <svg
            className="text-muted shrink-0"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: showPicker ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showPicker && (
          <div className="mt-2 flex flex-col bg-surface rounded-2xl border border-border/40 max-h-72 overflow-y-auto overscroll-contain">
            {specsWithQuestions.map((spec) => {
              const active = spec.id === activeSpecialty?.id;
              return (
                <button
                  key={spec.id}
                  onClick={() => {
                    setActiveSpecialty(spec.id);
                    setShowPicker(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 text-left transition-colors ${active ? "bg-primary/10" : "hover:bg-card"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-muted">
                      {spec.catShort}
                    </p>
                    <p className={`text-sm font-medium truncate mt-0.5 ${active ? "text-primary" : "text-foreground"}`}>
                      {spec.name}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted shrink-0 ml-2 tabular-nums">
                    {spec.qCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!activeSpecialty ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted leading-relaxed max-w-[280px] mx-auto">
            Выберите специальность выше, чтобы увидеть готовность к аккредитации
          </p>
        </div>
      ) : (
        <>
          {/* Readiness progress */}
          <div className="px-6 mb-4">
            <div
              className="rounded-2xl aurora-hairline p-4"
              style={{ background: "var(--color-card)" }}
            >
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
                  Готовность к аккредитации
                </span>
                <span className="text-[9px] tabular-nums text-muted">
                  {readinessPct}% / 70%
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "color-mix(in srgb, var(--color-border) 60%, transparent)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${readinessPct}%`,
                    background: "linear-gradient(90deg, var(--color-aurora-indigo), var(--color-aurora-violet), var(--color-aurora-pink))",
                    boxShadow: "0 0 10px color-mix(in srgb, var(--color-aurora-violet) 60%, transparent)",
                  }}
                />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-[9px] tracking-wider text-muted">
                  {readinessLabel}
                </span>
                {readinessPct < 70 && toGreenZone > 0 && (
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: "var(--color-aurora-indigo)" }}
                  >
                    до зелёной зоны {toGreenZone} {pluralize(toGreenZone, "вопрос", "вопроса", "вопросов")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Countdown + Accuracy */}
          <div className="px-6 grid grid-cols-[1.3fr_1fr] gap-2.5 mb-3">
            <div
              className="rounded-2xl aurora-hairline p-4 flex flex-col justify-between"
              style={{
                background: "var(--color-card)",
                boxShadow: "0 1px 2px rgba(17,24,39,0.03)",
              }}
            >
              <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
                До аккредитации
              </span>
              {editingDate ? (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="px-2 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-primary/40"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => examDate && saveExamDate(examDate)}
                      className="flex-1 py-1.5 rounded-lg btn-premium-dark text-[9px] uppercase tracking-widest"
                    >
                      Сохранить
                    </button>
                    {examDate && (
                      <button
                        onClick={clearExamDate}
                        className="px-2 py-1.5 rounded-lg border border-border text-[9px] uppercase tracking-widest text-muted"
                      >
                        Очистить
                      </button>
                    )}
                  </div>
                </div>
              ) : daysLeft !== null ? (
                <>
                  <div className="mt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extralight aurora-text tabular-nums leading-none">
                        {daysLeft}
                      </span>
                      <span className="text-xs text-muted">
                        {pluralize(daysLeft, "день", "дня", "дней")}
                      </span>
                    </div>
                    <div className="text-[9px] text-muted mt-2 tracking-wide">
                      Экзамен {new Date(examDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingDate(true)}
                    className="mt-3 text-[9px] tracking-[0.15em] uppercase font-medium text-left"
                    style={{ color: "var(--color-aurora-indigo)" }}
                  >
                    Изменить
                  </button>
                </>
              ) : (
                <>
                  <div className="mt-2 text-[11px] text-muted leading-relaxed">
                    Дата не установлена
                  </div>
                  <button
                    onClick={() => setEditingDate(true)}
                    className="mt-3 text-[9px] tracking-[0.15em] uppercase font-medium text-left"
                    style={{ color: "var(--color-aurora-indigo)" }}
                  >
                    Указать дату
                  </button>
                </>
              )}
            </div>

            <AccuracyRing
              percent={accuracyPct}
              fraction={`${correctAll}/${answeredAll}`}
            />
          </div>

          {/* 4 stat tiles */}
          <div className="px-6 grid grid-cols-4 gap-1.5 mb-4">
            <StatTile value={`${totalLearned}/${totalQuestions}`} label="Вопросов" />
            <StatTile value={`${completedBlocks}/${blockCount}`} label="Блоков" />
            <StatTile value={errorCount} label="Ошибок" accent />
            <StatTile value={daysLeft !== null ? `${daysLeft}д` : "-"} label="До цели" />
          </div>

          {/* Blocks digest */}
          {(weakBlocks.length > 0 || strongBlocks.length > 0) && (
            <>
              <div className="px-6 flex justify-between items-baseline mb-2.5">
                <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
                  Блоки · сильные и слабые
                </span>
                <button
                  onClick={() => router.push("/accreditation/plan")}
                  className="text-[9px] text-primary font-medium"
                >
                  Все →
                </button>
              </div>
              <div className="pl-6 pr-0 flex gap-2 overflow-x-auto mb-5 no-scrollbar">
                {weakBlocks.map((b) => (
                  <BlockChip
                    key={`w${b.blockNumber}`}
                    n={b.blockNumber}
                    acc={Math.round(b.accuracy * 100)}
                    level={b.level}
                  />
                ))}
                {weakBlocks.length > 0 && strongBlocks.length > 0 && (
                  <div className="shrink-0 w-px my-2" style={{ background: "var(--color-border)" }} />
                )}
                {strongBlocks.map((b) => (
                  <BlockChip
                    key={`s${b.blockNumber}`}
                    n={b.blockNumber}
                    acc={Math.round(b.accuracy * 100)}
                    level={b.level}
                  />
                ))}
                <div className="shrink-0 w-6" />
              </div>
            </>
          )}

          {/* Problem questions */}
          {problemQuestions.length > 0 && (
            <>
              <div className="px-6 flex justify-between items-baseline mb-2.5">
                <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
                  Проблемные вопросы
                </span>
                <button
                  onClick={() => router.push("/mistakes")}
                  className="text-[9px] text-primary font-medium"
                >
                  Все →
                </button>
              </div>
              <div className="px-6 flex flex-col gap-1.5 mb-5">
                {problemQuestions.map((q) => {
                  const errRate =
                    q.totalAttempts > 0 ? Math.round((q.wrongCount / q.totalAttempts) * 100) : 0;
                  return (
                    <ProblemQuestionRow
                      key={q.questionId}
                      block={q.blockNumber}
                      title={q.question}
                      errorRate={errRate}
                      attempts={q.totalAttempts}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* Tools */}
          <div className="px-6 mb-2.5">
            <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
              Инструменты
            </span>
          </div>
          <div className="px-6 flex flex-col gap-2 mb-5">
            <ToolRow
              accent="indigo"
              icon={CALENDAR_SVG}
              title="План подготовки"
              sub={blockCount > 0 ? `${blockCount} блоков · система ведёт по маршруту` : "Выберите специальность"}
              href="/accreditation/plan"
            />
            <ToolRow
              accent="pink-violet"
              icon={EYE_OFF_SVG}
              title="Слепые зоны"
              sub="Вопросы, которые вы ещё не видели"
              chip={
                totalQuestions > 0
                  ? { label: totalQuestions - totalLearned, variant: "pink" }
                  : undefined
              }
              href="/accreditation/blind-spots"
            />
            <ToolRow
              accent="violet-pink"
              icon={NOTES_SVG}
              title="Конспекты"
              sub="Ваши AI-объяснения и мнемоники"
              href="/accreditation/notes"
            />
            <ToolRow
              accent="indigo-violet"
              icon={HISTORY_SVG}
              title="История экзаменов"
              sub={
                progress.examResults.length > 0
                  ? `${progress.examResults.length} ${pluralize(progress.examResults.length, "попытка", "попытки", "попыток")}`
                  : "Ещё не было пробных попыток"
              }
              href="/accreditation/exam-history"
            />
          </div>

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

function BlockChip({
  n,
  acc,
  level,
}: {
  n: number;
  acc: number;
  level: BlockReadinessLevel;
}) {
  const strong = level === "strong" || level === "ready";
  const color = strong ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)";
  const bg = strong ? "var(--aurora-indigo-soft)" : "var(--aurora-pink-soft)";
  const label =
    level === "strong" ? "Уверенно"
      : level === "ready" ? "Готов"
        : level === "weak" ? "Слабый"
          : level === "started" ? "Начат"
            : "Не начат";
  return (
    <div
      className="shrink-0 rounded-2xl px-3.5 py-2.5 flex flex-col items-start gap-0.5 aurora-hairline"
      style={{ background: bg, minWidth: 110 }}
    >
      <span className="text-[8px] uppercase tracking-[0.2em] font-semibold" style={{ color }}>
        Блок {n} · {acc}%
      </span>
      <span className="text-[8px] uppercase tracking-wider text-muted mt-0.5">
        {label}
      </span>
    </div>
  );
}

function ProblemQuestionRow({
  block,
  title,
  errorRate,
  attempts,
}: {
  block: number;
  title: string;
  errorRate: number;
  attempts: number;
}) {
  const tone =
    errorRate >= 70 ? "var(--color-aurora-pink)"
      : errorRate >= 55 ? "var(--color-aurora-violet)"
        : "var(--color-aurora-indigo)";
  const attemptsLabel =
    attempts === 1 ? "попытка" : attempts < 5 ? "попытки" : "попыток";
  return (
    <div
      className="rounded-2xl bg-card aurora-hairline px-3.5 py-3 flex items-center gap-3"
      style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.02)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[8px] uppercase tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded"
            style={{
              color: "var(--color-aurora-violet)",
              background: "var(--aurora-violet-soft)",
            }}
          >
            Блок {block}
          </span>
          <span className="text-[9px] text-muted tracking-wide">
            {attempts} {attemptsLabel}
          </span>
        </div>
        <p className="text-xs text-foreground leading-snug line-clamp-2">
          {title}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end">
        <span className="text-lg font-extralight tabular-nums leading-none" style={{ color: tone }}>
          {errorRate}%
        </span>
        <span className="text-[8px] uppercase tracking-wider text-muted mt-1">
          ошибок
        </span>
      </div>
    </div>
  );
}
