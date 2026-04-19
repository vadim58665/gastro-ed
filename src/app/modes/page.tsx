"use client";

import { useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import MagicCard from "@/components/ui/MagicCard";
import IconBadge from "@/components/ui/IconBadge";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { getTotalQuestionCount } from "@/data/accreditation/index";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ICON_TRIAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12h3.75M9 15h3.75M9 18h3.75M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192" />
    <path d="M11 4h2a2 2 0 0 1 2 2H9a2 2 0 0 1 2-2z" />
    <path d="M11 4h2v3h-2z" />
  </svg>
);
const ICON_LEARNED = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ICON_ACCRED = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);
const ICON_REFRESH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
const ICON_RANDOM = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8" cy="8" r="1" fill="currentColor" />
    <circle cx="16" cy="8" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="8" cy="16" r="1" fill="currentColor" />
    <circle cx="16" cy="16" r="1" fill="currentColor" />
  </svg>
);
const ICON_MARATHON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 L4 14 h7 l-1 8 9-12 h-7 z" />
  </svg>
);

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

  const examModes: ModeInfo[] = [
    {
      title: "Пробный",
      description: "80 случайных вопросов, разбор ошибок в конце",
      href: "/modes/exam?type=trial",
      available: hasQuestions,
      icon: ICON_TRIAL,
    },
    {
      title: "По изученным",
      description: "Экзамен по пройденным блокам, разбор в конце",
      href: "/modes/exam?type=learned",
      available: hasLearned,
      icon: ICON_LEARNED,
    },
    {
      title: "Аккредитация",
      description: "Как на настоящем экзамене: 80 вопросов, 60 минут",
      href: "/modes/exam?type=accreditation",
      available: hasQuestions,
      icon: ICON_ACCRED,
      featured: true,
    },
  ];

  const trainingModes: ModeInfo[] = [
    {
      title: "Работа над ошибками",
      description: `Ответы и разбор сразу · ${progress.mistakes.length} ${progress.mistakes.length === 1 ? "вопрос" : "вопросов"}`,
      href: "/modes/mistakes",
      available: hasMistakes,
      icon: ICON_REFRESH,
    },
    {
      title: "Случайные",
      description: "Редкие вопросы с ответом сразу",
      href: "/modes/exam?type=random",
      available: hasQuestions,
      icon: ICON_RANDOM,
    },
    {
      title: "Марафон",
      description: "До первой ошибки, разбор в конце",
      href: "/modes/exam?type=marathon",
      available: totalQuestions > 0,
      icon: ICON_MARATHON,
    },
  ];

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        <div className="aurora-welcome-band" />

        <div className="px-6 pt-4 pb-6 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Подготовка
          </p>
          <h1 className="text-3xl font-extralight aurora-text tracking-tight">
            Режимы
          </h1>
          <div className="w-10 h-px bg-border mx-auto mt-4" />
        </div>

        {/* Экзамен */}
        <ModeSection title="Экзамен" modes={examModes} />

        {/* Тренировки */}
        <ModeSection title="Тренировки" modes={trainingModes} />

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

interface ModeInfo {
  title: string;
  description: string;
  href: string;
  available: boolean;
  icon: JSX.Element;
  featured?: boolean;
}

function ModeSection({ title, modes }: { title: string; modes: ModeInfo[] }) {
  return (
    <div className="px-6 mb-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted font-medium mb-3 px-1">
        {title}
      </p>
      <div className="space-y-2.5">
        {modes.map((mode) => (
          <ModeCard key={mode.title} info={mode} />
        ))}
      </div>
    </div>
  );
}

function ModeCard({ info }: { info: ModeInfo }) {
  const inner = (
    <MagicCard
      className={`rounded-2xl ${info.available ? "aurora-hairline" : "border border-border"}`}
      gradientFrom={info.featured ? "var(--color-aurora-violet)" : "var(--color-aurora-indigo)"}
      gradientTo={info.featured ? "var(--color-aurora-pink)" : "var(--color-aurora-violet)"}
      spotlightColor={
        info.featured
          ? "color-mix(in srgb, var(--color-aurora-pink) 14%, transparent)"
          : "color-mix(in srgb, var(--color-aurora-violet) 12%, transparent)"
      }
    >
      <div className="flex items-center gap-4 px-5 py-4">
        <IconBadge icon={info.icon} size="md" variant={info.featured ? "soft" : "outline"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-light text-foreground">{info.title}</span>
            {info.featured && (
              <span
                className="text-[8px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded"
                style={{
                  color: "var(--color-aurora-pink)",
                  background: "var(--aurora-pink-soft)",
                }}
              >
                Экзамен
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1 truncate">{info.description}</p>
        </div>
        {info.available && (
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
        )}
      </div>
    </MagicCard>
  );

  if (info.available) {
    return (
      <Link href={info.href} className="block btn-press">
        {inner}
      </Link>
    );
  }
  return <div className="opacity-50 pointer-events-none">{inner}</div>;
}
