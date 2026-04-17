"use client";

import { useState } from "react";
import Link from "next/link";
import ProfileSheet from "@/components/profile/ProfileSheet";
import LevelBadge from "@/components/ui/LevelBadge";
import GlowAvatar from "@/components/ui/GlowAvatar";
import NumberTicker from "@/components/ui/NumberTicker";
import MagicCard from "@/components/ui/MagicCard";
import SoftListRow from "@/components/ui/SoftListRow";
import StatCircle from "@/components/profile/StatCircle";
import AuthSection from "@/components/profile/AuthSection";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionBadge from "@/components/subscription/SubscriptionBadge";
import EngagementPicker from "@/components/subscription/EngagementPicker";
import ExamReadiness from "@/components/analytics/ExamReadiness";
import AnkiExport from "@/components/medmind/AnkiExport";
import SavedContentLibrary from "@/components/medmind/SavedContentLibrary";

export default function FeedProfile() {
  const { progress, achievements } = useGamification();
  const { user } = useAuth();
  const { isPro } = useSubscription();
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
    <>
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
          <LevelBadge xp={progress.xp || 0} recentAnswers={progress.recentAnswers || []} />
        </div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted mt-3 font-medium">
          <NumberTicker value={progress.xp || 0} /> XP
        </p>
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

        {/* Exam Readiness */}
        <div className="w-full divider-soft my-8" />
        <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4">
          Готовность к экзамену
        </p>
        <ExamReadiness />

        {/* Saved Content Library */}
        {user && (
          <>
            <div className="w-full divider-soft my-8" />
            <SavedContentLibrary />
          </>
        )}

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
          subtitle="Ведите прием AI-пациента"
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
