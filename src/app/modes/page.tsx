"use client";

import { useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { getTotalQuestionCount } from "@/data/accreditation/index";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ModesPage() {
  const { activeSpecialty } = useSpecialty();
  const router = useRouter();
  const specialtyId = activeSpecialty?.id || "";
  const { progress } = useAccreditation(specialtyId);

  useEffect(() => {
    if (!activeSpecialty) router.push("/topics");
  }, [activeSpecialty, router]);

  const totalQuestions = useMemo(
    () => getTotalQuestionCount(specialtyId),
    [specialtyId]
  );

  const hasQuestions = totalQuestions >= 80;
  const hasMistakes = progress.mistakes.length > 0;
  const hasLearned = progress.blocks.some((b) => b.learned > 0);

  if (!activeSpecialty) return null;

  const examModes = [
    {
      title: "Пробный",
      description: "80 случайных вопросов, сразу видите верный ответ",
      href: "/modes/exam?type=trial",
      available: hasQuestions,
    },
    {
      title: "По изученным",
      description: "Экзамен только по пройденным блокам",
      href: "/modes/exam?type=learned",
      available: hasLearned,
    },
    {
      title: "Аккредитация",
      description: "Как на настоящем экзамене: 80 вопросов, 60 минут",
      href: "/modes/exam?type=accreditation",
      available: hasQuestions,
    },
  ];

  const trainingModes = [
    {
      title: "Работа над ошибками",
      description: `Вопросы, в которых вы ошиблись (${progress.mistakes.length})`,
      href: "/modes/exam?type=mistakes",
      available: hasMistakes,
    },
    {
      title: "Случайные",
      description: "Вопросы, которые попадались вам реже всего",
      href: "/modes/exam?type=random",
      available: hasQuestions,
    },
    {
      title: "Марафон",
      description: "30 секунд на вопрос, решайте до первой ошибки",
      href: "/modes/exam?type=marathon",
      available: totalQuestions > 0,
    },
  ];

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        <div className="px-6 pt-4 pb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-3">
            Подготовка
          </p>
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Режимы
          </h1>
        </div>

        {/* Экзамен */}
        <div className="px-6 mb-8">
          <h2 className="text-sm font-medium text-foreground mb-3">Экзамен</h2>
          <div className="space-y-2">
            {examModes.map((mode) =>
              mode.available ? (
                <Link
                  key={mode.title}
                  href={mode.href}
                  className="block w-full text-left bg-card rounded-2xl border border-border px-5 py-4 hover:bg-surface transition-colors btn-press"
                >
                  <span className="text-base font-light text-foreground">
                    {mode.title}
                  </span>
                  <p className="text-xs text-muted mt-1">{mode.description}</p>
                </Link>
              ) : (
                <div
                  key={mode.title}
                  className="w-full text-left bg-card rounded-2xl border border-border px-5 py-4 opacity-40"
                >
                  <span className="text-base font-light text-foreground">
                    {mode.title}
                  </span>
                  <p className="text-xs text-muted mt-1">{mode.description}</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Тренировки */}
        <div className="px-6">
          <h2 className="text-sm font-medium text-foreground mb-3">
            Тренировки
          </h2>
          <div className="space-y-2">
            {trainingModes.map((mode) =>
              mode.available ? (
                <Link
                  key={mode.title}
                  href={mode.href}
                  className="block w-full text-left bg-card rounded-2xl border border-border px-5 py-4 hover:bg-surface transition-colors btn-press"
                >
                  <span className="text-base font-light text-foreground">
                    {mode.title}
                  </span>
                  <p className="text-xs text-muted mt-1">{mode.description}</p>
                </Link>
              ) : (
                <div
                  key={mode.title}
                  className="w-full text-left bg-card rounded-2xl border border-border px-5 py-4 opacity-40"
                >
                  <span className="text-base font-light text-foreground">
                    {mode.title}
                  </span>
                  <p className="text-xs text-muted mt-1">{mode.description}</p>
                </div>
              )
            )}
          </div>
        </div>

        {totalQuestions === 0 && (
          <div className="px-6 pt-8 pb-4 text-center">
            <p className="text-xs text-muted leading-relaxed max-w-[280px] mx-auto">
              Режимы станут доступны после добавления тестовых вопросов
            </p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
