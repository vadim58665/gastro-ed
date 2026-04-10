"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import MagicCard from "@/components/ui/MagicCard";
import NumberTicker from "@/components/ui/NumberTicker";
import GradientRing from "@/components/ui/GradientRing";
import SoftListRow from "@/components/ui/SoftListRow";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import {
  getQuestionsForSpecialty,
  getBlockCount,
  getTotalQuestionCount,
} from "@/data/accreditation/index";
import { accreditationCategories } from "@/data/specialties";

// Accent colors for category left-border
const CATEGORY_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#3b82f6", // blue
  "#14b8a6", // teal
];

// Level 1: pick accreditation category
function CategoryListView({ onSelect }: { onSelect: (catId: string) => void }) {
  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        <div className="px-6 pt-8 pb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-3">
            Выбор направления
          </p>
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Подготовка к аккредитации
          </h1>
        </div>

        <div className="px-4 pb-8 space-y-3">
          {accreditationCategories.map((category, i) => {
            const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
            const hasSpecs = category.specialties.length > 0;
            return (
              <button
                key={category.id}
                onClick={() => hasSpecs ? onSelect(category.id) : undefined}
                disabled={!hasSpecs}
                className="w-full text-left rounded-2xl bg-card border border-border/60 overflow-hidden transition-all btn-press disabled:opacity-50 disabled:cursor-default"
              >
                <div className="flex">
                  <div
                    className="w-1 shrink-0 rounded-l-2xl"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-sm font-semibold text-foreground leading-snug">
                        {category.name}
                      </h2>
                      {!hasSpecs && (
                        <span className="text-[9px] uppercase tracking-wider text-muted font-medium whitespace-nowrap mt-0.5">
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
                </div>
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
  onBack,
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
        <div className="px-6 pt-8 pb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-3">
            Выберите специальность
          </p>
          <h1 className="text-2xl font-light text-foreground tracking-tight leading-snug">
            {category.name}
          </h1>
        </div>

        <div className="px-6 pb-8 space-y-2">
          {category.specialties.map((spec) => {
            const qCount = getTotalQuestionCount(spec.id);
            const hasQuestions = qCount > 0;
            const initial = spec.name.trim()[0]?.toUpperCase() ?? "";

            return (
              <SoftListRow
                key={spec.id}
                onClick={() => handleSelect(spec.id, hasQuestions)}
                disabled={!hasQuestions}
                icon={
                  <span className="text-base font-semibold tracking-tight">
                    {initial}
                  </span>
                }
                title={
                  <>
                    {spec.name}
                    {!hasQuestions && (
                      <span className="ml-2 text-[9px] uppercase tracking-wider text-muted font-medium">
                        Скоро
                      </span>
                    )}
                  </>
                }
                subtitle={hasQuestions ? `${qCount} вопросов` : undefined}
              />
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

type BlocksViewMode = "circles" | "list";

function BlocksView({ specialtyId }: { specialtyId: string }) {
  const { progress, totalLearned } = useAccreditation(specialtyId);
  const [viewMode, setViewMode] = useState<BlocksViewMode>("circles");

  const questions = useMemo(
    () => getQuestionsForSpecialty(specialtyId),
    [specialtyId]
  );

  const blockCount = useMemo(() => getBlockCount(specialtyId), [specialtyId]);

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
            <div className="text-6xl font-extralight text-foreground tracking-tight leading-none mb-3">
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

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        <div className="px-6 pt-4 pb-2 text-center">
          <h1 className="text-2xl font-light text-foreground tracking-tight">
            Тесты
          </h1>
        </div>

        {/* View mode tabs */}
        <div className="px-6 mb-5">
          <div className="flex border-b border-border">
            <button
              onClick={() => setViewMode("circles")}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                viewMode === "circles"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted"
              }`}
            >
              Блоки
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                viewMode === "list"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted"
              }`}
            >
              Список
            </button>
          </div>
        </div>

        {/* Progress summary */}
        <div className="px-6 mb-6 text-center">
          <p className="text-xs text-muted">
            Изучено {learnedBlocks} из {blockCount} блоков
          </p>
          <div className="w-full max-w-xs mx-auto mt-3">
            <div className="w-full h-1.5 bg-border/70 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round((totalLearned / questions.length) * 100)}%`,
                  background: "linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
                  boxShadow: "0 0 12px rgba(168, 85, 247, 0.5)",
                }}
              />
            </div>
          </div>
        </div>

        {viewMode === "circles" ? (
          /* Circle grid view */
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
                    <div
                      className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
                        isComplete
                          ? "border-success bg-success/10 text-success"
                          : pct > 0
                          ? "border-primary/50 bg-primary/5 text-foreground"
                          : "border-border bg-surface text-foreground"
                      }`}
                    >
                      <span className="text-[11px] font-semibold leading-none">
                        {block.rangeStart}
                      </span>
                      <span className="text-[10px] text-muted leading-tight">
                        {block.rangeEnd}
                      </span>
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
                  <MagicCard className="rounded-2xl" gradientFrom="#6366f1" gradientTo="#a855f7">
                    <div className="flex items-center gap-5 px-5 py-4">
                      <GradientRing value={pct} size={56} thickness={4} label={`${pct}%`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-base font-light text-foreground">
                            Блок {block.number}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest text-muted">
                            {block.rangeStart}–{block.rangeEnd}
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
