"use client";

import { useMemo } from "react";
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

function DirectoryView() {
  const { setActiveSpecialty } = useSpecialty();

  const handleSelect = (specId: string, hasQuestions: boolean) => {
    if (!hasQuestions) return;
    setActiveSpecialty(specId);
  };

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-16 pb-20 overflow-y-auto">
        <div className="px-6 pt-8 pb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-3">
            Выберите направление
          </p>
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Подготовка к аккредитации
          </h1>
        </div>

        <div className="px-6 pb-8">
          {accreditationCategories.map((category, catIndex) => (
            <div key={category.id} className={catIndex > 0 ? "mt-10" : ""}>
              <h2 className="text-sm font-medium text-foreground mb-1">
                {category.name}
              </h2>
              <p className="text-xs text-muted mb-4">
                {category.description}
              </p>

              <div className="space-y-2">
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
                      subtitle={
                        hasQuestions ? `${qCount} вопросов` : undefined
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function BlocksView({ specialtyId }: { specialtyId: string }) {
  const { progress, totalLearned } = useAccreditation(specialtyId);

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
      return {
        number: num,
        total: blockQuestions.length,
        learned: blockProgress?.learned || 0,
      };
    });
  }, [blockCount, questions, progress.blocks]);

  if (questions.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar />
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

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        <div className="px-6 pt-4 pb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-3">
            Тестовые вопросы
          </p>
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Блоки
          </h1>
        </div>

        <div className="px-6 mb-8">
          <MagicCard
            className="rounded-3xl"
            gradientFrom="#6366f1"
            gradientTo="#a855f7"
            spotlightColor="rgba(99, 102, 241, 0.14)"
          >
            <div className="px-7 py-8 text-center">
              <div className="text-6xl font-extralight aurora-text tracking-tight leading-none">
                <NumberTicker value={totalLearned} />
              </div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted mt-3 font-medium">
                из {questions.length} вопросов изучено
              </p>
              <div className="w-full max-w-xs mx-auto mt-5">
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
          </MagicCard>
        </div>

        <div className="px-6 space-y-3">
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
                          {block.total} вопросов
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
      </main>
      <BottomNav />
    </div>
  );
}

export default function TestsPage() {
  const { activeSpecialty } = useSpecialty();

  if (!activeSpecialty) {
    return <DirectoryView />;
  }

  return <BlocksView specialtyId={activeSpecialty.id} />;
}
