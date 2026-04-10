"use client";

import { useState } from "react";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import ProfileSheet from "@/components/profile/ProfileSheet";
import LevelBadge from "@/components/ui/LevelBadge";
import GlowAvatar from "@/components/ui/GlowAvatar";
import NumberTicker from "@/components/ui/NumberTicker";
import MagicCard from "@/components/ui/MagicCard";
import GradientRing from "@/components/ui/GradientRing";
import SoftListRow from "@/components/ui/SoftListRow";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useMedMindAnalytics } from "@/hooks/useMedMindAnalytics";
import SubscriptionBadge from "@/components/subscription/SubscriptionBadge";
import EngagementPicker from "@/components/subscription/EngagementPicker";
import TopicAnalysisCard from "@/components/medmind/TopicAnalysisCard";
import MasteryDashboard from "@/components/analytics/MasteryDashboard";
import ExamCountdown from "@/components/analytics/ExamCountdown";
import WeeklyDigest from "@/components/analytics/WeeklyDigest";
import TopicDependencyMap from "@/components/analytics/TopicDependencyMap";
import AnkiExport from "@/components/medmind/AnkiExport";
import Link from "next/link";

export default function ProfilePage() {
  const { progress, achievements } = useGamification();
  const { user, signOut, loading } = useAuth();
  const { isPro } = useSubscription();
  const { topics, weakTopics } = useMedMindAnalytics();
  const [sheetKind, setSheetKind] = useState<"settings" | "styles" | "companion" | null>(null);
  const accuracy =
    progress.cardsSeen > 0
      ? Math.round((progress.cardsCorrect / progress.cardsSeen) * 100)
      : 0;

  const avatarLetter =
    user?.email?.[0]?.toUpperCase() ||
    user?.user_metadata?.full_name?.[0]?.toUpperCase() ||
    "Д";

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-16 pb-20 overflow-y-auto">
        {/* Quick actions: unified settings */}
        <div className="px-6 pt-4 flex items-center justify-end">
          <button
            onClick={() => setSheetKind("settings")}
            className="btn-press w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
            aria-label="Настройки"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Hero: Glow avatar + level */}
        <div className="px-6 pt-4 pb-6 flex flex-col items-center">
          <GlowAvatar initial={avatarLetter} size={96} />
          <div className="mt-6">
            <LevelBadge xp={progress.xp || 0} />
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted mt-3 font-medium">
            <NumberTicker value={progress.xp || 0} /> XP
          </p>
        </div>

        {/* Exam Countdown */}
        <div className="px-6 mb-8">
          <ExamCountdown />
        </div>

        {/* Streak hero card with shine border */}
        <div className="px-6 mb-8">
          <MagicCard
            className="rounded-3xl"
            gradientFrom="#6366f1"
            gradientTo="#a855f7"
            spotlightColor="rgba(168, 85, 247, 0.15)"
          >
            <div className="px-8 py-10 text-center">
              <div className="text-6xl md:text-7xl font-extralight tracking-tight leading-none aurora-text">
                <NumberTicker value={progress.streakCurrent} />
              </div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted mt-3 font-medium">
                {progress.streakCurrent === 1 ? "день подряд" : "дней подряд"}
              </p>
            </div>
          </MagicCard>
        </div>

        {/* Stats as premium rings */}
        <div className="px-6">
          <MagicCard className="rounded-3xl" gradientFrom="#6366f1" gradientTo="#10b981">
            <div className="px-4 py-8">
              <div className="grid grid-cols-3 gap-y-8">
                <StatCircle
                  display={progress.streakBest}
                  fill={Math.min(100, (progress.streakBest / 30) * 100)}
                  label="лучший streak"
                />
                <StatCircle
                  display={progress.xp || 0}
                  fill={Math.min(100, ((progress.xp || 0) % 1000) / 10)}
                  label="XP всего"
                />
                <StatCircle
                  display={accuracy}
                  suffix="%"
                  fill={accuracy}
                  label="точность"
                />
              </div>
              <div className="w-full divider-soft my-8" />
              <div className="grid grid-cols-2 gap-y-6">
                <StatCircle
                  display={progress.cardsSeen}
                  fill={Math.min(100, (progress.cardsSeen / 200) * 100)}
                  label="карточек"
                  size="lg"
                />
                <StatCircle
                  display={progress.cardsCorrect}
                  fill={
                    progress.cardsSeen > 0
                      ? (progress.cardsCorrect / progress.cardsSeen) * 100
                      : 0
                  }
                  label="правильных"
                  size="lg"
                />
              </div>
            </div>
          </MagicCard>
        </div>

        <div className="px-6">

          {/* Achievements link */}
          <div className="w-full divider-soft mt-10 mb-8" />
          <SoftListRow
            href="/achievements"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
                <path d="M17 5h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3" />
                <path d="M7 5H5a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3" />
              </svg>
            }
            title="Достижения"
            subtitle={`${achievements.filter((a) => a.unlocked).length}/${achievements.length} разблокировано`}
          />

          {/* Mastery Dashboard */}
          <div className="w-full divider-soft my-8" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4">
            Мастерство по темам
          </p>
          <MasteryDashboard />

          {/* Weekly Digest */}
          <div className="w-full divider-soft my-8" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4">
            Сводка
          </p>
          <WeeklyDigest />

          {/* Topic Dependency Map */}
          <div className="w-full divider-soft my-8" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4">
            Карта тем
          </p>
          <TopicDependencyMap />

          {/* Anki Export */}
          <div className="w-full divider-soft my-8" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4">
            Экспорт
          </p>
          <AnkiExport />

          {/* Consilium */}
          <div className="w-full divider-soft my-8" />
          <SoftListRow
            href="/consilium"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 14V7a2 2 0 0 0-2-2h-5l-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" />
                <path d="M12 11h-2" />
                <path d="M11 10v2" />
                <circle cx="18" cy="18" r="3" />
                <path d="M21 21l-1.5-1.5" />
              </svg>
            }
            title="Консилиум"
            subtitle="Ведите приём AI-пациента"
          />

          {/* MedMind section */}
          <div className="w-full divider-soft my-8" />
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium">
              MedMind
            </p>
            <SubscriptionBadge />
          </div>

          {isPro ? (
            <div className="space-y-4">
              <EngagementPicker />
              {topics.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
                    {weakTopics.length > 0
                      ? `${weakTopics.length} СЛАБЫХ ТЕМ`
                      : "ВАШИ ТЕМЫ"}
                  </p>
                  {topics.slice(0, 6).map((t) => (
                    <TopicAnalysisCard key={t.topic} topic={t} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted mb-3">
                ИИ-компаньон для персонального обучения
              </p>
              <Link
                href="/subscription"
                className="inline-block px-7 py-3 rounded-full btn-premium-dark text-sm font-medium btn-press"
              >
                Узнать больше
              </Link>
            </div>
          )}

          {/* Auth section */}
          {!loading && (
            <>
              <div className="w-full divider-soft my-8" />
              <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4 text-center">
                Облачная синхронизация
              </p>

              {user ? (
                <div className="text-center space-y-3">
                  <p className="text-sm text-foreground">{user.email}</p>
                  <p className="text-xs text-success font-medium">
                    Синхронизировано
                  </p>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-muted hover:text-foreground transition-colors"
                  >
                    Выйти
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted">
                    Сохраните прогресс между устройствами
                  </p>
                  <Link
                    href="/auth/login"
                    className="inline-block px-7 py-3 rounded-full btn-premium-dark text-sm font-medium btn-press"
                  >
                    Войти
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <BottomNav />
      <ProfileSheet
        open={sheetKind !== null}
        kind={sheetKind}
        onClose={() => setSheetKind(null)}
      />
    </div>
  );
}

function StatCircle({
  display,
  fill,
  label,
  suffix,
  size = "md",
}: {
  display: number;
  fill: number;
  label: string;
  suffix?: string;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? 108 : 92;
  const thickness = size === "lg" ? 4 : 3.5;
  const numberClass =
    size === "lg"
      ? "text-2xl font-extralight tracking-tight leading-none"
      : "text-xl font-extralight tracking-tight leading-none";
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: dim, height: dim }}>
        <GradientRing value={fill} size={dim} thickness={thickness} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${numberClass} aurora-text`}>
            <NumberTicker value={display} />
            {suffix}
          </span>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted mt-3 font-medium text-center">
        {label}
      </p>
    </div>
  );
}
