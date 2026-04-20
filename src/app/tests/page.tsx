"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import MagicCard from "@/components/ui/MagicCard";
import GradientRing from "@/components/ui/GradientRing";
import IconBadge from "@/components/ui/IconBadge";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import {
  getQuestionsForSpecialty,
  getBlockCount,
  getTotalQuestionCount,
} from "@/data/accreditation/index";
import { accreditationCategories } from "@/data/specialties";
import { clusterQuestionsByTopic } from "@/lib/accreditationTopics";

// Per-category SVG icons (gradient stroke via parent .icon-aurora-stroke)
const CATEGORY_ICONS: Record<number, JSX.Element> = {
  0: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v6a5 5 0 0 0 10 0V4" />
      <path d="M4 4h3" />
      <path d="M11 4h3" />
      <circle cx="19" cy="14" r="2" />
      <path d="M9 15v2a4 4 0 0 0 8 0v-1" />
    </svg>
  ),
  1: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.5-1.5 3-4 3-6.5A4.5 4.5 0 0 0 17.5 3c-1.7 0-3 1-5.5 3.5C9.5 4 8.2 3 6.5 3A4.5 4.5 0 0 0 2 7.5C2 10 3.5 12.5 5 14l7 7 7-7z" />
    </svg>
  ),
  2: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

function FallbackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L2 7 l10 5 10-5 z" />
      <path d="M2 17 l10 5 10-5" />
      <path d="M2 12 l10 5 10-5" />
    </svg>
  );
}

// Level 1: pick accreditation category
function CategoryListView({ onSelect }: { onSelect: (catId: string) => void }) {
  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        <div className="aurora-welcome-band" />
        <div className="px-6 pt-6 pb-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3" style={{ color: "var(--color-aurora-violet)" }}>
            Выбор направления
          </p>
          <h1 className="text-3xl font-extralight tracking-tight aurora-text">
            Подготовка к аккредитации
          </h1>
          <div className="w-10 h-px bg-border mx-auto mt-4" />
        </div>

        <div className="px-4 pb-8 space-y-3">
          {accreditationCategories.map((category, i) => {
            const hasSpecs = category.specialties.length > 0;
            const icon = CATEGORY_ICONS[i] ?? <FallbackIcon />;
            return (
              <button
                key={category.id}
                onClick={() => hasSpecs ? onSelect(category.id) : undefined}
                disabled={!hasSpecs}
                className="w-full text-left btn-press disabled:opacity-50 disabled:cursor-default"
              >
                <MagicCard
                  className="rounded-2xl aurora-hairline"
                  gradientFrom="var(--color-aurora-indigo)"
                  gradientTo="var(--color-aurora-violet)"
                  spotlightColor="color-mix(in srgb, var(--color-aurora-violet) 14%, transparent)"
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <IconBadge icon={icon} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-sm font-semibold text-foreground leading-snug">
                          {category.name}
                        </h2>
                        {!hasSpecs && (
                          <span
                            className="text-[9px] uppercase tracking-wider font-medium whitespace-nowrap mt-0.5 px-2 py-0.5 rounded-full"
                            style={{
                              color: "var(--color-aurora-violet)",
                              background: "var(--aurora-violet-soft)",
                            }}
                          >
                            Скоро
                          </span>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-xs text-muted mt-1.5 leading-relaxed">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted shrink-0"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </MagicCard>
              </button>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

// Level 2: pick specialty within a category
function SpecialtyListView({
  categoryId,
  onBack: _onBack,
}: {
  categoryId: string;
  onBack: () => void;
}) {
  const { setActiveSpecialty } = useSpecialty();
  const category = accreditationCategories.find((c) => c.id === categoryId)!;

  const handleSelect = (specId: string, hasQuestions: boolean) => {
    if (!hasQuestions) return;
    setActiveSpecialty(specId);
  };

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        <div className="aurora-welcome-band" />
        <div className="px-6 pt-6 pb-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3" style={{ color: "var(--color-aurora-violet)" }}>
            Выберите специальность
          </p>
          <h1 className="text-2xl font-extralight aurora-text tracking-tight leading-snug">
            {category.name}
          </h1>
        </div>

        <div className="px-6 pb-8 space-y-2">
          {category.specialties.map((spec) => {
            const qCount = getTotalQuestionCount(spec.id);
            const hasQuestions = qCount > 0;
            const initial = spec.name.trim()[0]?.toUpperCase() ?? "";

            return (
              <button
                key={spec.id}
                onClick={() => handleSelect(spec.id, hasQuestions)}
                disabled={!hasQuestions}
                className="w-full text-left btn-press disabled:opacity-50 disabled:cursor-default"
              >
                <MagicCard
                  className="rounded-2xl aurora-hairline"
                  gradientFrom="var(--color-aurora-violet)"
                  gradientTo="var(--color-aurora-pink)"
                  spotlightColor="color-mix(in srgb, var(--color-aurora-pink) 12%, transparent)"
                >
                  <div className="flex items-center gap-4 px-4 py-3.5">
                    {/* Aurora-glow initial badge */}
                    <div
                      className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-base font-semibold tracking-tight aurora-hairline"
                      style={{
                        background: "linear-gradient(180deg, var(--color-card) 0%, var(--aurora-violet-soft) 100%)",
                        color: "var(--color-aurora-violet)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.85), 0 4px 14px -8px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent)",
                      }}
                    >
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {spec.name}
                        {!hasQuestions && (
                          <span
                            className="ml-2 text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded"
                            style={{
                              color: "var(--color-aurora-violet)",
                              background: "var(--aurora-violet-soft)",
                            }}
                          >
                            Скоро
                          </span>
                        )}
                      </div>
                      {hasQuestions && (
                        <div className="text-[11px] text-muted mt-0.5 truncate">
                          {qCount} вопросов
                        </div>
                      )}
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-muted shrink-0"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </MagicCard>
              </button>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

type BlocksViewMode = "circles" | "list" | "topics";

function BlocksView({ specialtyId }: { specialtyId: string }) {
  const router = useRouter();
  const { progress, totalLearned } = useAccreditation(specialtyId);
  const [viewMode, setViewMode] = useState<BlocksViewMode>("circles");

  const questions = useMemo(
    () => getQuestionsForSpecialty(specialtyId),
    [specialtyId]
  );

  const blockCount = useMemo(() => getBlockCount(specialtyId), [specialtyId]);

  // Кластеризация вопросов по темам (ключевые слова из текста вопросов),
  // поскольку в TestQuestion нет явного поля topic. Считается один раз
  // на основе всех вопросов специальности.
  const topics = useMemo(
    () =>
      clusterQuestionsByTopic(questions, {
        maxClusters: 20,
        minClusterSize: 3,
      }),
    [questions]
  );

  // Для каждой темы — сколько изучено (хоть раз правильно).
  const topicProgress = useMemo(() => {
    const learnedSet = new Set<string>();
    for (const [qId, stats] of Object.entries(progress.questionStats)) {
      if (stats.wasEverCorrect) learnedSet.add(qId);
    }
    return topics.map((t) => {
      const learned = t.questionIds.filter((id) => learnedSet.has(id)).length;
      return {
        ...t,
        learned,
        pct: t.count > 0 ? Math.round((learned / t.count) * 100) : 0,
      };
    });
  }, [topics, progress.questionStats]);

  function launchTopic(questionIds: string[]) {
    const params = new URLSearchParams();
    params.set("type", "topic");
    params.set("ids", questionIds.join(","));
    router.push(`/modes/exam?${params.toString()}`);
  }

  const blocks = useMemo(() => {
    return Array.from({ length: blockCount }, (_, i) => {
      const num = i + 1;
      const blockQuestions = questions.filter((q) => q.blockNumber === num);
      const blockProgress = progress.blocks.find((b) => b.blockNumber === num);
      const firstQ = (num - 1) * 100 + 1;
      const lastQ = firstQ + blockQuestions.length - 1;
      return {
        number: num,
        total: blockQuestions.length,
        learned: blockProgress?.learned || 0,
        rangeStart: firstQ,
        rangeEnd: lastQ,
      };
    });
  }, [blockCount, questions, progress.blocks]);

  if (questions.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-20 pb-20 flex flex-col items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl font-extralight aurora-text tracking-tight leading-none mb-3">
              0
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-8">
              тестовых вопросов
            </p>
            <div className="w-12 h-px bg-border mx-auto mb-8" />
            <p className="text-sm text-muted leading-relaxed max-w-[260px] mx-auto">
              Тестовые вопросы для этой специальности будут добавлены в ближайшее
              время
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const learnedBlocks = blocks.filter((b) => b.learned === b.total && b.total > 0).length;
  const overallPct = Math.round((totalLearned / questions.length) * 100);

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        <div className="aurora-welcome-band" />
        <div className="px-6 pt-4 pb-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2" style={{ color: "var(--color-aurora-violet)" }}>
            Подготовка
          </p>
          <h1 className="text-2xl font-extralight aurora-text tracking-tight">
            Тесты
          </h1>
        </div>

        {/* View mode aurora-pill toggle */}
        <div className="px-6 mt-5 mb-5 flex justify-center">
          <div
            className="inline-flex p-1 rounded-full aurora-hairline"
            style={{ background: "var(--color-card)" }}
          >
            <ViewModePill
              active={viewMode === "circles"}
              onClick={() => setViewMode("circles")}
              label="Блоки"
            />
            <ViewModePill
              active={viewMode === "topics"}
              onClick={() => setViewMode("topics")}
              label="Темы"
            />
            <ViewModePill
              active={viewMode === "list"}
              onClick={() => setViewMode("list")}
              label="Список"
            />
          </div>
        </div>

        {/* Progress summary */}
        <div className="px-6 mb-6 text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-extralight aurora-text tracking-tight tabular-nums">
              {overallPct}%
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium mt-1">
            изучено · {learnedBlocks} из {blockCount} блоков
          </p>
          <div className="w-full max-w-xs mx-auto mt-3">
            <div className="w-full h-1.5 bg-border/70 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 aurora-grad-bg"
                style={{
                  width: `${overallPct}%`,
                  boxShadow: "0 0 12px color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)",
                }}
              />
            </div>
          </div>
        </div>

        {viewMode === "topics" ? (
          /* Topics view — clusters of related questions */
          <div className="px-6 pb-8">
            {topicProgress.length === 0 ? (
              <p className="text-xs text-muted text-center max-w-[280px] mx-auto leading-relaxed">
                Тем пока недостаточно для группировки. Начните с блоков.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {topicProgress.map((t) => (
                  <button
                    key={t.topic}
                    onClick={() => launchTopic(t.questionIds)}
                    className="btn-press text-left rounded-2xl aurora-hairline px-4 py-3 transition-colors"
                    style={{ background: "var(--color-card)" }}
                  >
                    <div className="flex items-center gap-4">
                      <GradientRing value={t.pct} size={40} thickness={3} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-medium text-foreground truncate pr-3">
                            {t.label}
                          </span>
                          <span
                            className="text-[10px] tabular-nums shrink-0"
                            style={{
                              color:
                                t.pct >= 70
                                  ? "var(--color-aurora-indigo)"
                                  : t.pct > 0
                                    ? "var(--color-aurora-violet)"
                                    : "var(--color-muted)",
                            }}
                          >
                            {t.learned}/{t.count}
                          </span>
                        </div>
                        <div
                          className="h-1 rounded-full overflow-hidden"
                          style={{
                            background:
                              "color-mix(in srgb, var(--color-border) 60%, transparent)",
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${t.pct}%`,
                              background:
                                "linear-gradient(90deg, var(--color-aurora-indigo), var(--color-aurora-violet), var(--color-aurora-pink))",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : viewMode === "circles" ? (
          /* Circle grid view - aurora GradientRing per block */
          <div className="px-4 pb-8">
            <div className="flex flex-wrap justify-center gap-3">
              {blocks.map((block) => {
                const pct =
                  block.total > 0
                    ? Math.round((block.learned / block.total) * 100)
                    : 0;
                const isComplete = pct === 100;
                return (
                  <Link
                    key={block.number}
                    href={`/tests/${block.number}`}
                    className="btn-press"
                  >
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <GradientRing value={pct} size={80} thickness={4} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                          className="text-[11px] font-semibold leading-none tabular-nums"
                          style={{
                            color: isComplete
                              ? "var(--color-aurora-violet)"
                              : "var(--color-foreground)",
                          }}
                        >
                          {block.rangeStart}
                        </span>
                        <span className="text-[9px] text-muted leading-tight tabular-nums mt-0.5">
                          {block.rangeEnd}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          /* List view */
          <div className="px-6 space-y-3 pb-8">
            {blocks.map((block) => {
              const pct =
                block.total > 0
                  ? Math.round((block.learned / block.total) * 100)
                  : 0;
              return (
                <Link
                  key={block.number}
                  href={`/tests/${block.number}`}
                  className="block btn-press"
                >
                  <MagicCard
                    className="rounded-2xl aurora-hairline"
                    gradientFrom="var(--color-aurora-indigo)"
                    gradientTo="var(--color-aurora-violet)"
                  >
                    <div className="flex items-center gap-5 px-5 py-4">
                      <GradientRing value={pct} size={56} thickness={4} label={`${pct}%`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-base font-light text-foreground">
                            Блок {block.number}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest text-muted">
                            {block.rangeStart}-{block.rangeEnd}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted">
                          {block.learned} / {block.total} изучено
                        </p>
                      </div>
                    </div>
                  </MagicCard>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function ViewModePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all"
      style={
        active
          ? {
              background: "var(--aurora-gradient-primary)",
              color: "#fff",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px -4px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent)",
            }
          : { color: "var(--color-muted)" }
      }
    >
      {label}
    </button>
  );
}

export default function TestsPage() {
  const { activeSpecialty } = useSpecialty();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // If specialty is already selected, show blocks
  if (activeSpecialty) {
    return <BlocksView specialtyId={activeSpecialty.id} />;
  }

  // If category is selected, show specialties within it
  if (selectedCategory) {
    return (
      <SpecialtyListView
        categoryId={selectedCategory}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  // Top level: show accreditation categories
  return <CategoryListView onSelect={setSelectedCategory} />;
}
