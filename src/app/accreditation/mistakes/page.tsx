"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import {
  getQuestionsForSpecialty,
  getBlockCount,
} from "@/data/accreditation/index";
import { computeFrequentErrors } from "@/lib/accreditationErrors";
import { clusterMistakesByTopic } from "@/lib/accreditationTopics";

type SessionMode = "training" | "exam" | "browse";

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

const LIGHTNING_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const FLAME_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
const TARGET_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AccreditationMistakesPage() {
  const router = useRouter();
  const { activeSpecialty } = useSpecialty();
  const specialtyId = activeSpecialty?.id || "";
  const { progress } = useAccreditation(specialtyId);

  const [sessionMode, setSessionMode] = useState<SessionMode>("training");

  const allQuestions = useMemo(
    () => (specialtyId ? getQuestionsForSpecialty(specialtyId) : []),
    [specialtyId]
  );
  const blockCount = useMemo(
    () => (specialtyId ? getBlockCount(specialtyId) : 0),
    [specialtyId]
  );

  const mistakeSet = useMemo(
    () => new Set(progress.mistakes),
    [progress.mistakes]
  );

  // Счётчики по режимам проработки
  const stuckCount = useMemo(() => {
    let count = 0;
    for (const id of progress.mistakes) {
      const s = progress.questionStats[id];
      if (s && s.wrong >= 3) count++;
    }
    return count;
  }, [progress.mistakes, progress.questionStats]);

  const freshCount = useMemo(() => {
    const cutoff = Date.now() - DAY_MS;
    let count = 0;
    for (const id of progress.mistakes) {
      const s = progress.questionStats[id];
      if (s && s.lastSeen >= cutoff && !s.wasEverCorrect) count++;
    }
    return count;
  }, [progress.mistakes, progress.questionStats]);

  const painPoints = useMemo(
    () => computeFrequentErrors(progress, allQuestions, 3),
    [progress, allQuestions]
  );

  // Счётчики ошибок по блокам
  const mistakesByBlock = useMemo(() => {
    const counts = new Map<number, number>();
    for (const q of allQuestions) {
      if (mistakeSet.has(q.id)) {
        counts.set(q.blockNumber, (counts.get(q.blockNumber) ?? 0) + 1);
      }
    }
    return counts;
  }, [allQuestions, mistakeSet]);

  const totalMistakes = progress.mistakes.length;

  // Кластеризация ошибок по ключевым словам из текста вопросов. Используем
  // для секции «По темам» — чтобы врач видел, в каких медицинских темах
  // больше проблем, и мог прорешать конкретную тему.
  const mistakeTopics = useMemo(
    () => clusterMistakesByTopic(progress.mistakes, allQuestions, { maxClusters: 10, minClusterSize: 2 }),
    [progress.mistakes, allQuestions]
  );

  function launchSession(opts: { block?: number; ids?: string[] } = {}) {
    const params = new URLSearchParams();
    params.set("type", "mistakes");
    if (sessionMode === "exam") params.set("strict", "1");
    if (sessionMode === "browse") params.set("mode", "browse");
    if (opts.block) params.set("block", String(opts.block));
    if (opts.ids && opts.ids.length > 0) params.set("ids", opts.ids.join(","));
    router.push(`/modes/exam?${params.toString()}`);
  }

  if (!activeSpecialty) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-24 flex items-center justify-center px-6">
          <p className="text-sm text-muted text-center">
            Выберите специальность в профиле, чтобы увидеть ошибки
          </p>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (totalMistakes === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-24 flex items-center justify-center px-6">
          <div className="text-center max-w-xs">
            <p
              className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              Ошибки
            </p>
            <h2 className="text-xl font-extralight aurora-text tracking-tight mb-3">
              Ошибок нет
            </h2>
            <p className="text-xs text-muted mb-6 leading-relaxed">
              Решайте пробный экзамен — вопросы, на которые ответите неверно,
              появятся здесь для проработки.
            </p>
            <button
              onClick={() => router.push("/modes")}
              className="px-8 py-3 rounded-xl btn-premium-dark text-sm font-medium"
            >
              К режимам
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-24 overflow-y-auto">
        <div className="px-6 max-w-lg mx-auto">
          {/* Hero */}
          <div className="text-center pt-2 pb-6">
            <p
              className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              Ошибки
            </p>
            <div className="text-[64px] font-extralight tracking-tight leading-none aurora-text tabular-nums">
              {totalMistakes}
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] mt-2 font-medium text-muted">
              {pluralize(totalMistakes, "вопрос", "вопроса", "вопросов")} · {activeSpecialty.name}
            </p>
          </div>

          {/* Session mode toggle — 3 опции */}
          <div className="flex justify-center mb-6">
            <div
              className="inline-flex rounded-full p-0.5 aurora-hairline text-[10px] uppercase tracking-[0.2em] font-semibold"
              style={{ background: "var(--color-card)" }}
              role="tablist"
            >
              {(
                [
                  { key: "training", label: "Тренировка" },
                  { key: "exam", label: "Экзамен" },
                  { key: "browse", label: "Просмотр" },
                ] as { key: SessionMode; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={sessionMode === key}
                  onClick={() => setSessionMode(key)}
                  className="px-4 py-1.5 rounded-full transition-colors"
                  style={{
                    background:
                      sessionMode === key
                        ? "var(--aurora-gradient-primary)"
                        : "transparent",
                    color: sessionMode === key ? "#fff" : "var(--color-muted)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p
            className="text-[10px] text-muted text-center mb-4 leading-relaxed"
            style={{ maxWidth: 320, margin: "0 auto 16px" }}
          >
            {sessionMode === "training"
              ? "Ответ и разбор показываются сразу после каждого вопроса"
              : sessionMode === "exam"
                ? "Ответы скрыты до конца сессии, разбор в финале"
                : "Лента всех вопросов с подсвеченными правильными ответами"}
          </p>

          <p className="text-[9px] uppercase tracking-[0.25em] font-semibold mb-3 text-muted">
            Режимы проработки
          </p>

          <div className="flex flex-col gap-2.5 mb-6">
            {/* Все ошибки */}
            <button
              onClick={() => launchSession()}
              className="btn-press relative rounded-2xl px-5 py-4 text-white overflow-hidden text-left"
              style={{
                background: "var(--aurora-gradient-dark-bg)",
                boxShadow:
                  "0 2px 6px color-mix(in srgb, var(--color-aurora-indigo) 30%, transparent), 0 18px 40px -12px color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)",
              }}
            >
              <div
                className="absolute pointer-events-none"
                style={{
                  right: -40,
                  top: -40,
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, color-mix(in srgb, var(--color-aurora-pink) 28%, transparent), transparent 70%)",
                }}
              />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium tracking-tight">
                    Все ошибки
                  </div>
                  <div className="text-[11px] text-white/60 mt-0.5">
                    Подряд одной сессией
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[28px] font-extralight tabular-nums leading-none">
                    {totalMistakes}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Застрявшие */}
            <ModeCard
              title="Застрявшие"
              sub="3+ неверных ответа"
              icon={FLAME_SVG}
              count={stuckCount}
              accent="pink-violet"
              onClick={() => {
                if (stuckCount === 0) return;
                launchSession();
              }}
              disabled={stuckCount === 0}
            />

            {/* Свежие */}
            <ModeCard
              title="Свежие"
              sub="За последние 24 часа"
              icon={LIGHTNING_SVG}
              count={freshCount}
              accent="indigo-violet"
              onClick={() => {
                if (freshCount === 0) return;
                launchSession();
              }}
              disabled={freshCount === 0}
            />

            {/* Боль-точки */}
            <ModeCard
              title="Боль-точки"
              sub="Самые частые ошибки"
              icon={TARGET_SVG}
              count={painPoints.length}
              accent="indigo-pink"
              onClick={() => {
                if (painPoints.length === 0) return;
                launchSession();
              }}
              disabled={painPoints.length === 0}
            />
          </div>

          {/* По блокам */}
          {blockCount > 0 && (
            <>
              <p className="text-[9px] uppercase tracking-[0.25em] font-semibold mb-3 text-muted">
                По блокам
              </p>
              <div className="flex flex-col gap-2 mb-6">
                {Array.from({ length: blockCount }, (_, i) => i + 1).map((block) => {
                  const count = mistakesByBlock.get(block) ?? 0;
                  const disabled = count === 0;
                  return (
                    <button
                      key={block}
                      onClick={() => {
                        if (disabled) return;
                        launchSession({ block });
                      }}
                      disabled={disabled}
                      className="btn-press rounded-2xl aurora-hairline px-4 py-3 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "var(--color-card)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[8px] uppercase tracking-[0.2em] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              color: "var(--color-aurora-violet)",
                              background: "var(--aurora-violet-soft)",
                            }}
                          >
                            Блок {block}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[14px] font-light tabular-nums"
                            style={{
                              color:
                                count > 0
                                  ? "var(--color-aurora-pink)"
                                  : "var(--color-muted)",
                            }}
                          >
                            {count}
                          </span>
                          {count > 0 && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-muted"
                            >
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* По темам */}
          {mistakeTopics.length > 0 && (
            <>
              <p className="text-[9px] uppercase tracking-[0.25em] font-semibold mb-3 text-muted">
                По темам
              </p>
              <div className="flex flex-col gap-2 mb-6">
                {mistakeTopics.map((t) => (
                  <button
                    key={t.topic}
                    onClick={() => launchSession({ ids: t.questionIds })}
                    className="btn-press rounded-2xl aurora-hairline px-4 py-3 text-left"
                    style={{ background: "var(--color-card)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate pr-3">
                        {t.label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[14px] font-light tabular-nums"
                          style={{ color: "var(--color-aurora-pink)" }}
                        >
                          {t.count}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

type Accent = "pink-violet" | "indigo-violet" | "indigo-pink";

function ModeCard({
  title,
  sub,
  icon,
  count,
  accent,
  onClick,
  disabled,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
  count: number;
  accent: Accent;
  onClick: () => void;
  disabled?: boolean;
}) {
  const iconGradient =
    accent === "pink-violet"
      ? "linear-gradient(135deg, var(--color-aurora-violet), var(--color-aurora-pink))"
      : accent === "indigo-violet"
        ? "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet))"
        : "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-pink))";
  const glow =
    accent === "pink-violet"
      ? "var(--color-aurora-pink)"
      : accent === "indigo-violet"
        ? "var(--color-aurora-indigo)"
        : "var(--color-aurora-violet)";
  const countColor =
    accent === "pink-violet"
      ? "var(--color-aurora-pink)"
      : accent === "indigo-violet"
        ? "var(--color-aurora-indigo)"
        : "var(--color-aurora-violet)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-press relative rounded-2xl px-5 py-4 aurora-hairline overflow-hidden text-left disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: "var(--color-card)",
        boxShadow: "0 1px 2px rgba(17,24,39,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: iconGradient,
              color: "#fff",
              boxShadow: `0 4px 10px -3px color-mix(in srgb, ${glow} 40%, transparent)`,
            }}
          >
            {icon}
          </div>
          <div>
            <div className="text-[15px] font-medium text-foreground">{title}</div>
            <div className="text-[11px] text-muted mt-0.5">{sub}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="text-[20px] font-light tabular-nums leading-none"
            style={{ color: countColor }}
          >
            {count}
          </div>
          {!disabled && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}
