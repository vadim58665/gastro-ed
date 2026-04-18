"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import Greeting from "@/components/ui/Greeting";
import DailyCaseCTA from "@/components/ui/DailyCaseCTA";
import ToolRow from "@/components/ui/ToolRow";
import SpecialtyCard from "@/components/ui/SpecialtyCard";
import { demoCards } from "@/data/cards";
import { allSpecialties, getCardCount, isSpecialtyAvailable } from "@/data/specialties";
import { useReview } from "@/hooks/useReview";
import { useProgress } from "@/hooks/useProgress";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAuth } from "@/contexts/AuthContext";
import { getWeakTopics } from "@/lib/weakTopics";

function getLevel(xp: number): { current: string; next: string } {
  if (xp >= 3000) return { current: "Врач", next: "Профессор" };
  if (xp >= 500) return { current: "Ординатор II", next: "Врач" };
  return { current: "Студент", next: "Ординатор" };
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-6 pb-2.5 pt-1 flex justify-between items-baseline">
      <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">{title}</span>
      {sub && <span className="text-[9px] text-muted">{sub}</span>}
    </div>
  );
}

// SVG mode icons
const BOLT_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 L4 14 h7 l-1 8 9-12 h-7 z" />
  </svg>
);
const QUESTION_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5 a2.5 2.5 0 1 1 3.5 2.3 c-0.9 0.4-1 1-1 1.7" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
const FLAG_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 21 V4" />
    <path d="M5 4 h11 l-2 3.5 L16 11 H5" />
  </svg>
);
const DOSE_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="9" width="18" height="6" rx="3" />
    <path d="M12 9 v6" />
  </svg>
);
const WEAK_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 7 9 13 13 9 21 17" />
    <polyline points="15 17 21 17 21 11" />
  </svg>
);
const ALL_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="14" height="16" rx="2" />
    <path d="M7 4v16" />
    <path d="M20 7v13a1 1 0 0 1-1 1h-2" />
  </svg>
);

export default function TopicsPage() {
  const { reviewCards } = useReview();
  const { progress } = useProgress();
  const { setActiveSpecialty, clearSpecialty } = useSpecialty();
  const { user, profile } = useAuth() as {
    user: { id?: string; email?: string } | null;
    profile: { nickname?: string } | null;
  };
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [returnToProfile, setReturnToProfile] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("return-to-profile") === "1") {
        setReturnToProfile(true);
      }
    } catch {}
  }, []);

  const answeredIds = useMemo(
    () => new Set(reviewCards.map((rc) => rc.cardId)),
    [reviewCards]
  );

  const totalCards = demoCards.length;

  const modeCounts = useMemo(() => {
    let myth = 0;
    let redFlags = 0;
    let dose = 0;
    for (const c of demoCards) {
      if (c.type === "myth_or_fact") myth++;
      else if (c.type === "red_flags") redFlags++;
      else if (c.type === "dose_calc") dose++;
    }
    return { myth, redFlags, dose };
  }, []);

  const weakTopicsCount = useMemo(
    () => getWeakTopics(progress, demoCards).length,
    [progress]
  );

  const topicsBySpecialty = useMemo(() => {
    const map = new Map<string, { name: string; total: number; answered: number }[]>();
    for (const spec of allSpecialties) {
      const cards = demoCards.filter((c) => c.specialty === spec.name);
      if (cards.length === 0) continue;
      const totalMap = new Map<string, number>();
      const answeredMap = new Map<string, number>();
      for (const card of cards) {
        totalMap.set(card.topic, (totalMap.get(card.topic) || 0) + 1);
        if (answeredIds.has(card.id)) {
          answeredMap.set(card.topic, (answeredMap.get(card.topic) || 0) + 1);
        }
      }
      map.set(
        spec.id,
        Array.from(totalMap.entries())
          .map(([name, count]) => ({ name, total: count, answered: answeredMap.get(name) || 0 }))
          .sort((a, b) => b.total - a.total)
      );
    }
    return map;
  }, [answeredIds]);

  const availableSpecialties = useMemo(
    () => allSpecialties.filter((s) => isSpecialtyAvailable(s.name)),
    []
  );

  const nickname = profile?.nickname || user?.email?.split("@")[0] || "Доктор";
  const { current: currentLevel } = getLevel(progress.xp ?? 0);

  const handleAllClick = () => {
    clearSpecialty();
    router.push("/feed?mode=all");
  };

  const handleModeClick = (mode: "myth" | "red_flags" | "dose" | "weak") => {
    clearSpecialty();
    router.push(`/feed?mode=${mode}`);
  };

  const consumeReturnFlag = () => {
    try {
      sessionStorage.removeItem("return-to-profile");
    } catch {}
  };

  const handleSpecialtyClick = (specId: string) => {
    setActiveSpecialty(specId);
    if (returnToProfile) {
      consumeReturnFlag();
      router.push("/profile");
      return;
    }
    router.push("/feed");
  };

  const handleTopicClick = (specId: string, topicName: string) => {
    setActiveSpecialty(specId);
    if (returnToProfile) {
      consumeReturnFlag();
      router.push("/profile");
      return;
    }
    router.push(`/feed?topic=${encodeURIComponent(topicName)}`);
  };

  const toggleAccordion = (specId: string) => {
    setExpandedId(expandedId === specId ? null : specId);
  };

  const today = new Date();
  const todayFmt = today.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  return (
    <div className="h-screen flex flex-col">
      <TopBar premium={!returnToProfile} />
      <main className={`flex-1 ${returnToProfile ? "pt-24" : "pt-28"} pb-20 overflow-y-auto`}>
        {returnToProfile ? (
          <>
            <div className="px-6 pt-8 pb-6 text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-3">
                Выбор специальности
              </p>
              <h1 className="text-3xl font-light text-foreground tracking-tight">
                Специальность
              </h1>
              <p className="text-xs text-muted mt-3 max-w-xs mx-auto">
                Выберите специальность из списка ниже - вы вернётесь в профиль
              </p>
            </div>
            <SectionHead title="Специальности" sub={`${availableSpecialties.length} доступно`} />
            <div className="px-6 flex flex-col gap-1.5 pb-5">
              {availableSpecialties.map((spec) => (
                <SpecialtyCard
                  key={spec.id}
                  name={spec.name}
                  initial={spec.name.trim()[0]?.toUpperCase() ?? ""}
                  cardCount={getCardCount(spec.name)}
                  answeredCount={(topicsBySpecialty.get(spec.id) || []).reduce((s, t) => s + t.answered, 0)}
                  onHeaderClick={() => handleSpecialtyClick(spec.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <Greeting nickname={nickname} level={currentLevel} xp={progress.xp ?? 0} />

            <div className="px-6 mb-4">
              <DailyCaseCTA
                caseDate={todayFmt}
                caseId="hard-002"
                maxPoints={5000}
                currentPoints={0}
                active
                onStart={() => router.push("/daily-case")}
              />
            </div>

            <SectionHead title="Быстрые режимы" />
            <div className="px-6 flex flex-col gap-1.5 mb-5">
              <ToolRow
                accent="indigo"
                icon={BOLT_SVG}
                title="Утренний блиц"
                sub="5 случайных вопросов"
                chip={{ label: "5", variant: "indigo" }}
                onClick={() => router.push("/morning-blitz")}
              />
              {modeCounts.myth > 0 && (
                <ToolRow
                  accent="indigo-violet"
                  icon={QUESTION_SVG}
                  title="Правда или миф"
                  sub="Короткие утверждения"
                  chip={{ label: modeCounts.myth, variant: "indigo" }}
                  onClick={() => handleModeClick("myth")}
                />
              )}
              {modeCounts.redFlags > 0 && (
                <ToolRow
                  accent="violet-pink"
                  icon={FLAG_SVG}
                  title="Красные флаги"
                  sub="Распознай опасные симптомы"
                  chip={{ label: modeCounts.redFlags, variant: "violet" }}
                  onClick={() => handleModeClick("red_flags")}
                />
              )}
              {modeCounts.dose > 0 && (
                <ToolRow
                  accent="violet-pink"
                  icon={DOSE_SVG}
                  title="Дозировки"
                  sub="Расчёты препаратов в уме"
                  chip={{ label: modeCounts.dose, variant: "violet" }}
                  onClick={() => handleModeClick("dose")}
                />
              )}
              {weakTopicsCount > 0 && (
                <ToolRow
                  accent="pink-violet"
                  icon={WEAK_SVG}
                  title="Слабые места"
                  sub="Темы, где чаще ошибаешься"
                  chip={{ label: weakTopicsCount, variant: "pink" }}
                  onClick={() => handleModeClick("weak")}
                />
              )}
              <ToolRow
                accent="indigo"
                icon={ALL_SVG}
                title="Общее"
                sub="Все карточки вперемешку"
                chip={{ label: totalCards, variant: "indigo" }}
                onClick={handleAllClick}
              />
            </div>

            <SectionHead title="Специальности" sub={`${availableSpecialties.length} доступно`} />
            <div className="px-6 flex flex-col gap-1.5 pb-5">
              {availableSpecialties.map((spec) => {
                const topics = topicsBySpecialty.get(spec.id) || [];
                const answered = topics.reduce((s, t) => s + t.answered, 0);
                return (
                  <SpecialtyCard
                    key={spec.id}
                    name={spec.name}
                    initial={spec.name.trim()[0]?.toUpperCase() ?? ""}
                    cardCount={getCardCount(spec.name)}
                    answeredCount={answered}
                    topics={topics}
                    expanded={expandedId === spec.id}
                    onHeaderClick={() => toggleAccordion(spec.id)}
                    onAllTopicsClick={() => handleSpecialtyClick(spec.id)}
                    onTopicClick={(topicName) => handleTopicClick(spec.id, topicName)}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
