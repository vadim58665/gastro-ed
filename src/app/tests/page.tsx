"use client";

import { useMemo, useState, type ReactElement } from "react";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import MagicCard from "@/components/ui/MagicCard";
import GradientRing from "@/components/ui/GradientRing";
import IconBadge from "@/components/ui/IconBadge";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { useSpecialties, useSpecialtyMeta } from "@/hooks/useTestQuestions";
import type { SpecialtyMeta } from "@/lib/accreditation-client";

// Порядок и человекочитаемые названия секций.
const SECTION_ORDER: { id: string; shortName: string; description: string }[] = [
  {
    id: "ПСА_ординатура",
    shortName: "Ординатура / ДПО",
    description: "Первичная специализированная аккредитация после ординатуры или профпереподготовки",
  },
  {
    id: "Первичная_аккредитация_специалитет",
    shortName: "Специалитет",
    description: "Первичная аккредитация для выпускников медицинских вузов",
  },
  {
    id: "Высшее_образование_профпереподготовка",
    shortName: "Высшее ПП",
    description: "Профессиональная переподготовка на другую специалитет-специальность",
  },
  {
    id: "ПСА_немедицинское",
    shortName: "Немедицинское",
    description: "Для специалистов с немедицинским высшим образованием",
  },
  {
    id: "Первичная_аккредитация_бакалавриат",
    shortName: "Бакалавриат",
    description: "Сестринское дело — бакалавриат",
  },
  {
    id: "Первичная_аккредитация_магистратура",
    shortName: "Магистратура",
    description: "Управление сестринской деятельностью",
  },
];

const CATEGORY_ICONS: Record<number, ReactElement> = {
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

function SpinnerFull() {
  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-24 pb-20 flex items-center justify-center">
        <div
          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--color-aurora-violet)", borderTopColor: "transparent" }}
        />
      </main>
      <BottomNav />
    </div>
  );
}

// Уровень 1: секция
function CategoryListView({
  specialtiesBySection,
  onSelect,
}: {
  specialtiesBySection: Record<string, SpecialtyMeta[]>;
  onSelect: (sectionId: string) => void;
}) {
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
          {SECTION_ORDER.map((cat, i) => {
            const specs = specialtiesBySection[cat.id] ?? [];
            const hasSpecs = specs.length > 0;
            const totalQs = specs.reduce((sum, s) => sum + s.total_questions, 0);
            const icon = CATEGORY_ICONS[i] ?? <FallbackIcon />;
            return (
              <button
                key={cat.id}
                onClick={() => hasSpecs ? onSelect(cat.id) : undefined}
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
                          {cat.shortName}
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
                      <p className="text-xs text-muted mt-1.5 leading-relaxed">
                        {cat.description}
                      </p>
                      {hasSpecs && (
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted mt-2 font-medium">
                          {specs.length} специальностей · {totalQs.toLocaleString("ru-RU")} вопросов
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

// Уровень 2: специальности внутри секции
function SpecialtyListView({
  sectionId,
  specialties,
  onBack,
}: {
  sectionId: string;
  specialties: SpecialtyMeta[];
  onBack: () => void;
}) {
  const { setActiveSpecialty } = useSpecialty();
  const sectionMeta = SECTION_ORDER.find((c) => c.id === sectionId);

  const sorted = useMemo(
    () => [...specialties].sort((a, b) => a.specialty_name.localeCompare(b.specialty_name, "ru")),
    [specialties]
  );

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack onBack={onBack} />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        <div className="aurora-welcome-band" />
        <div className="px-6 pt-6 pb-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3" style={{ color: "var(--color-aurora-violet)" }}>
            Выберите специальность
          </p>
          <h1 className="text-2xl font-extralight aurora-text tracking-tight leading-snug">
            {sectionMeta?.shortName ?? sectionId}
          </h1>
        </div>

        <div className="px-6 pb-8 space-y-2">
          {sorted.map((spec) => {
            const initial = spec.specialty_name.trim()[0]?.toUpperCase() ?? "";
            return (
              <button
                key={spec.specialty_id}
                onClick={() =>
                  setActiveSpecialty({
                    id: spec.specialty_id,
                    name: spec.specialty_name,
                  })
                }
                className="w-full text-left btn-press"
              >
                <MagicCard
                  className="rounded-2xl aurora-hairline"
                  gradientFrom="var(--color-aurora-violet)"
                  gradientTo="var(--color-aurora-pink)"
                  spotlightColor="color-mix(in srgb, var(--color-aurora-pink) 12%, transparent)"
                >
                  <div className="flex items-center gap-4 px-4 py-3.5">
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
                        {spec.specialty_name}
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 truncate">
                        {spec.total_questions.toLocaleString("ru-RU")} вопросов
                        {spec.block_count > 0 && ` · ${spec.block_count} блоков`}
                        {spec.picture_count > 0 && ` · ${spec.picture_count} с фото`}
                      </div>
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

// Уровень 3: список блоков одной специальности
function BlocksView({ specialtyId }: { specialtyId: string }) {
  const { progress, totalLearned } = useAccreditation(specialtyId);
  const { clearSpecialty } = useSpecialty();
  const { data: meta, isLoading } = useSpecialtyMeta(specialtyId);
  const [viewMode, setViewMode] = useState<"circles" | "list">("circles");

  const blocks = useMemo(() => {
    if (!meta) return [];
    const n = meta.block_count;
    const totalQs = meta.total_questions;
    return Array.from({ length: n }, (_, i) => {
      const num = i + 1;
      const firstQ = (num - 1) * 100 + 1;
      const isLast = num === n;
      const blockSize = isLast ? totalQs - (n - 1) * 100 : 100;
      const lastQ = firstQ + blockSize - 1;
      const blockProgress = progress.blocks.find((b) => b.blockNumber === num);
      return {
        number: num,
        total: blockSize,
        learned: blockProgress?.learned ?? 0,
        rangeStart: firstQ,
        rangeEnd: lastQ,
      };
    });
  }, [meta, progress.blocks]);

  if (isLoading || !meta) {
    return <SpinnerFull />;
  }

  if (meta.total_questions === 0) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack onBack={clearSpecialty } />
        <main className="flex-1 pt-20 pb-20 flex flex-col items-center justify-center">
          <div className="text-center px-6">
            <div className="text-6xl font-extralight aurora-text tracking-tight leading-none mb-3">0</div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-8">
              тестовых вопросов
            </p>
            <div className="w-12 h-px bg-border mx-auto mb-8" />
            <p className="text-sm text-muted leading-relaxed max-w-[260px] mx-auto">
              Тестовые вопросы для этой специальности пока не добавлены
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const learnedBlocks = blocks.filter((b) => b.total > 0 && b.learned === b.total).length;
  const overallPct = Math.round((totalLearned / Math.max(1, meta.total_questions)) * 100);

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack onBack={clearSpecialty} />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        <div className="aurora-welcome-band" />
        <div className="px-6 pt-4 pb-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2" style={{ color: "var(--color-aurora-violet)" }}>
            Подготовка
          </p>
          <h1 className="text-2xl font-extralight aurora-text tracking-tight">
            {meta.specialty_name}
          </h1>
        </div>

        {/* View mode toggle */}
        <div className="px-6 mt-5 mb-5 flex justify-center">
          <div className="inline-flex p-1 rounded-full aurora-hairline" style={{ background: "var(--color-card)" }}>
            <ViewModePill active={viewMode === "circles"} onClick={() => setViewMode("circles")} label="Блоки" />
            <ViewModePill active={viewMode === "list"} onClick={() => setViewMode("list")} label="Список" />
          </div>
        </div>

        <div className="px-6 mb-6 text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-extralight aurora-text tracking-tight tabular-nums">
              {overallPct}%
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium mt-1">
            изучено · {learnedBlocks} из {meta.block_count} блоков · {meta.total_questions} вопросов
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

        {viewMode === "circles" ? (
          <div className="px-4 pb-8">
            <div className="flex flex-wrap justify-center gap-3">
              {blocks.map((block) => {
                const pct = block.total > 0 ? Math.round((block.learned / block.total) * 100) : 0;
                const isComplete = pct === 100;
                return (
                  <Link key={block.number} href={`/tests/${block.number}`} className="btn-press">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <GradientRing value={pct} size={80} thickness={4} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                          className="text-[11px] font-semibold leading-none tabular-nums"
                          style={{
                            color: isComplete ? "var(--color-aurora-violet)" : "var(--color-foreground)",
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
          <div className="px-6 space-y-3 pb-8">
            {blocks.map((block) => {
              const pct = block.total > 0 ? Math.round((block.learned / block.total) * 100) : 0;
              return (
                <Link key={block.number} href={`/tests/${block.number}`} className="block btn-press">
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
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px -4px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent)",
            }
          : { color: "var(--color-muted)" }
      }
    >
      {label}
    </button>
  );
}

export default function TestsPage() {
  const { activeSpecialty, hydrated } = useSpecialty();
  const { data: specialties, isLoading: specLoading } = useSpecialties();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const specialtiesBySection = useMemo(() => {
    const map: Record<string, SpecialtyMeta[]> = {};
    if (specialties) {
      for (const s of specialties) {
        if (!map[s.section]) map[s.section] = [];
        map[s.section].push(s);
      }
    }
    return map;
  }, [specialties]);

  // Специальность выбрана — показать блоки
  if (hydrated && activeSpecialty) {
    return <BlocksView specialtyId={activeSpecialty.id} />;
  }

  // Загружается
  if (!hydrated || specLoading || !specialties) {
    return <SpinnerFull />;
  }

  // Секция выбрана — показать её специальности
  if (selectedSection) {
    return (
      <SpecialtyListView
        sectionId={selectedSection}
        specialties={specialtiesBySection[selectedSection] ?? []}
        onBack={() => setSelectedSection(null)}
      />
    );
  }

  // Верхний уровень — список секций
  return (
    <CategoryListView
      specialtiesBySection={specialtiesBySection}
      onSelect={setSelectedSection}
    />
  );
}
