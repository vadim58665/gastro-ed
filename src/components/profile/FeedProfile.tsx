"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import AvatarStack from "@/components/ui/AvatarStack";
import XpProgress from "@/components/ui/XpProgress";
import StreakHero from "@/components/ui/StreakHero";
import AccuracyRing from "@/components/ui/AccuracyRing";
import StatTile from "@/components/ui/StatTile";
import DailyCaseCTA from "@/components/ui/DailyCaseCTA";
import Crest from "@/components/ui/Crest";
import ToolRow from "@/components/ui/ToolRow";
import MedMindCard from "@/components/ui/MedMindCard";
import ProfileSheet from "@/components/profile/ProfileSheet";
import AuthSection from "@/components/profile/AuthSection";
import ExamReadiness from "@/components/analytics/ExamReadiness";
import SavedContentLibrary from "@/components/medmind/SavedContentLibrary";

import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfilePageData } from "@/hooks/useProfilePageData";

const TIER_LABELS: Record<string, string> = {
  feed_helper: "Помощник ленты",
  accred_basic: "Базовый",
  accred_mentor: "Наставник",
  accred_tutor: "Репетитор",
  accred_extreme: "Максимальное вовлечение",
};

function pluralDay(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

function formatExpiration(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `Активно до ${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

// SVG icons (no emoji)
const TARGET_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);
const FLAME_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
const LOCK_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const CHAT_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const BOOK_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const ALERT_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export default function FeedProfile() {
  const router = useRouter();
  const { progress, achievements } = useGamification();
  const { user, profile } = useAuth();
  const { isPro, tier, subscription } = useSubscription();
  const pageData = useProfilePageData();
  const [sheetKind, setSheetKind] = useState<"settings" | "styles" | "companion" | null>(null);

  const accuracy =
    progress.cardsSeen > 0
      ? Math.round((progress.cardsCorrect / progress.cardsSeen) * 100)
      : 0;

  // Nickname: prefer profile.nickname, then email prefix
  const nickname =
    profile?.nickname ||
    user?.email?.split("@")[0] ||
    "Доктор";

  const avatarLetter = nickname[0]?.toUpperCase() ?? "Д";

  const currentLevel = progress.xp >= 3000 ? "Врач" : progress.xp >= 500 ? "Ординатор II" : "Студент";
  const nextLevel = currentLevel === "Врач" ? "Профессор" : currentLevel === "Ординатор II" ? "Врач" : "Ординатор";
  const nextLevelXp = currentLevel === "Врач" ? 10000 : currentLevel === "Ординатор II" ? 3000 : 500;

  const todayActivityPercent =
    pageData.cardsToday > 0 ? Math.min(100, (pageData.cardsToday / 10) * 100) : 0;

  const tierLabel = tier ? TIER_LABELS[tier] ?? String(tier) : "Pro";

  // currentPeriodEnd lives on the subscription state object
  const currentPeriodEnd = subscription?.currentPeriodEnd ?? null;

  const daysLeftSub = currentPeriodEnd
    ? daysBetween(new Date(), new Date(currentPeriodEnd))
    : null;

  const today = new Date();
  const todayFmt = today.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  const topAchievements = achievements.slice(0, 5);

  return (
    <>
      <div className="px-6 pt-2 flex justify-end">
        <button
          onClick={() => setSheetKind("settings")}
          aria-label="Настройки"
          className="w-9 h-9 rounded-full bg-white border flex items-center justify-center text-muted btn-press"
          style={{ borderColor: "rgba(99,102,241,0.1)", boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <div className="px-6 pt-2 pb-4 flex flex-col items-center">
        <div className="text-[10px] tracking-[0.25em] uppercase text-muted font-medium mb-8">
          С возвращением
        </div>
        <AvatarStack
          initial={avatarLetter}
          size={128}
          verified={isPro}
          activityPercent={todayActivityPercent}
        />
        <div className="text-[22px] font-light tracking-tight text-foreground mt-5">
          {nickname}
        </div>
        <div className="text-[10px] text-muted mt-1 tracking-wide">
          {user?.email}
        </div>
        {pageData.cardsToday > 0 && (
          <div
            className="mt-2 text-[9px] tracking-[0.22em] uppercase font-semibold"
            style={{ color: "#6366F1" }}
          >
            {pageData.cardsToday} сегодня
          </div>
        )}
        <div className="flex gap-1.5 mt-3.5 flex-wrap justify-center">
          {isPro && (
            <span
              className="text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full text-white font-medium"
              style={{
                background: "linear-gradient(135deg, #1A1A2E 0%, #312E81 50%, #6366F1 100%)",
                boxShadow: "0 2px 6px rgba(49,46,129,0.3), 0 8px 18px -6px rgba(99,102,241,0.45)",
              }}
            >
              PRO · {tierLabel}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full bg-white text-foreground font-medium"
            style={{ border: "1px solid rgba(99,102,241,0.15)", boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }}
            />
            {currentLevel}
          </span>
        </div>
      </div>

      <div className="px-6 mb-4">
        <XpProgress
          current={progress.xp ?? 0}
          target={nextLevelXp}
          currentLevel={currentLevel}
          nextLevel={nextLevel}
        />
      </div>

      <div className="px-6 grid grid-cols-[1.3fr_1fr] gap-2.5 mb-3">
        <StreakHero
          currentStreak={progress.streakCurrent ?? 0}
          bestStreak={progress.streakBest ?? 0}
          weekPattern={pageData.weekPattern}
        />
        <AccuracyRing
          percent={accuracy}
          fraction={`${progress.cardsCorrect}/${progress.cardsSeen}`}
          trend={
            pageData.accuracyTrend !== null
              ? { delta: pageData.accuracyTrend, period: "за неделю" }
              : undefined
          }
        />
      </div>

      <div className="px-6 grid grid-cols-4 gap-1.5 mb-4">
        <StatTile value={pageData.totalAnswers} label="Ответов" />
        <StatTile value={pageData.uniqueTopicsCount} label="Тем" />
        <StatTile value={pageData.reviewsDue} label="К повтору" accent />
        <StatTile value={`${pageData.daysInProduct}${pluralDay(pageData.daysInProduct).charAt(0)}`} label="В продукте" />
      </div>

      <div className="px-6 mb-5">
        <DailyCaseCTA
          caseDate={todayFmt}
          caseId="hard-002"
          maxPoints={5000}
          currentPoints={0}
          active
          onStart={() => router.push("/daily-case")}
        />
      </div>

      <div className="px-6 flex justify-between items-baseline mb-2.5">
        <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
          Достижения · {topAchievements.filter((a) => a.unlocked).length} из {achievements.length}
        </span>
        <a href="/achievements" className="text-[9px] text-primary font-medium">
          Все →
        </a>
      </div>
      <div className="pl-6 pr-0 flex gap-2 overflow-x-auto mb-5 no-scrollbar">
        {topAchievements.map((a, i) => {
          if (!a.unlocked) {
            return (
              <Crest
                key={a.id}
                variant="locked"
                icon={LOCK_SVG}
                title={a.title}
                sub="не открыто"
                href="/achievements"
              />
            );
          }
          const variant: "indigo-violet" | "violet-pink" = i % 2 === 0 ? "indigo-violet" : "violet-pink";
          const icon = i === 0 ? TARGET_SVG : FLAME_SVG;
          return (
            <Crest
              key={a.id}
              variant={variant}
              icon={icon}
              title={a.title}
              sub={
                a.unlockedAt
                  ? new Date(a.unlockedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                  : undefined
              }
              href="/achievements"
            />
          );
        })}
      </div>

      <div className="px-6 mb-2.5 flex justify-between items-baseline">
        <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
          Готовность к экзамену
        </span>
      </div>
      <div className="px-6 mb-5">
        <ExamReadiness />
      </div>

      <div className="px-6 mb-2.5">
        <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
          Инструменты
        </span>
      </div>
      <div className="px-6 flex flex-col gap-2 mb-5">
        <ToolRow
          accent="indigo"
          icon={CHAT_SVG}
          title="Консилиум"
          sub="AI-пациент ждёт приёма"
          chip={{ label: "Pro", variant: "dark" }}
          href="/consilium"
        />
        <ToolRow
          accent="indigo-violet"
          icon={BOOK_SVG}
          title="Моя библиотека"
          sub="Сохранённые AI-объяснения"
          chip={{ label: "2", variant: "indigo" }}
          onClick={() =>
            document
              .getElementById("saved-library")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />
        <ToolRow
          accent="pink-violet"
          icon={ALERT_SVG}
          title="Мои ошибки"
          sub="Карточки к повторению"
          chip={{ label: pageData.reviewsDue, variant: "pink" }}
          href="/mistakes"
        />
      </div>

      {isPro && (
        <>
          <div className="px-6 mb-2.5">
            <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
              MedMind
            </span>
          </div>
          <div className="px-6 mb-5">
            <MedMindCard
              title={tierLabel}
              tier={formatExpiration(currentPeriodEnd)}
              stats={[
                {
                  label: "Осталось",
                  value: daysLeftSub !== null ? `${daysLeftSub} ${pluralDay(daysLeftSub)}` : "-",
                },
                {
                  label: "Этот месяц",
                  value: `${pageData.hintsThisMonth} подсказок`,
                },
              ]}
            />
          </div>
        </>
      )}

      {user && (
        <div id="saved-library" className="px-6 mb-5 scroll-mt-24">
          <SavedContentLibrary />
        </div>
      )}

      <div className="px-6 mb-6">
        <AuthSection />
      </div>

      <ProfileSheet
        open={sheetKind !== null}
        kind={sheetKind}
        onClose={() => setSheetKind(null)}
      />
    </>
  );
}
