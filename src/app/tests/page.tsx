"use client";

import { useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
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

                  return (
                    <button
                      key={spec.id}
                      onClick={() => handleSelect(spec.id, hasQuestions)}
                      disabled={!hasQuestions}
                      className={`w-full text-left px-5 py-4 rounded-2xl border transition-all ${
                        hasQuestions
                          ? "bg-card border-border hover:border-primary/30 hover:shadow-sm btn-press"
                          : "bg-surface border-border/50 opacity-60 cursor-default"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`text-base font-light ${hasQuestions ? "text-foreground" : "text-muted"}`}>
                            {spec.name}
                          </span>
                          {!hasQuestions && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted font-medium">
                              Скоро
                            </span>
                          )}
                        </div>
                        {qCount > 0 && (
                          <span className="text-xs text-muted">
                            {qCount} вопросов
                          </span>
                        )}
                      </div>
                    </button>
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

        <div className="text-center mb-8">
          <div className="text-5xl font-extralight text-foreground tracking-tight leading-none">
            {totalLearned}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted mt-2 font-medium">
            из {questions.length} изучено
          </p>
          <div className="w-full max-w-xs mx-auto mt-3">
            <div className="w-full h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${Math.round((totalLearned / questions.length) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="w-12 h-px bg-border mx-auto mt-6" />
        </div>

        <div className="px-6 space-y-2">
          {blocks.map((block) => {
            const pct =
              block.total > 0
                ? Math.round((block.learned / block.total) * 100)
                : 0;
            return (
              <Link
                key={block.number}
                href={`/tests/${block.number}`}
                className="block bg-card rounded-2xl border border-border px-5 py-4 hover:bg-surface transition-colors btn-press"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-light text-foreground">
                    Блок {block.number}
                  </span>
                  <span className="text-xs text-muted">
                    {block.total} вопросов
                  </span>
                </div>
                <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted mt-1">
                  {block.learned} / {block.total} изучено
                </p>
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
