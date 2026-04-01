"use client";

import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useProgress } from "@/hooks/useProgress";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function ProfilePage() {
  const { progress } = useProgress();
  const { user, signOut, loading } = useAuth();
  const accuracy =
    progress.cardsSeen > 0
      ? Math.round((progress.cardsCorrect / progress.cardsSeen) * 100)
      : 0;

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-16 pb-20 overflow-y-auto">
        {/* Hero section */}
        <div className="px-6 pt-8 pb-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-3">
            Ваш прогресс
          </p>
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Профиль
          </h1>
        </div>

        {/* Main stat — streak */}
        <div className="text-center mb-10">
          <div className="text-6xl font-extralight text-foreground tracking-tight leading-none">
            {progress.streakCurrent}
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted mt-3 font-medium">
            {progress.streakCurrent === 1 ? "день подряд" : "дней подряд"}
          </p>
          <div className="w-12 h-px bg-border mx-auto mt-6" />
        </div>

        {/* Stats grid */}
        <div className="px-6">
          <div className="grid grid-cols-3 gap-y-8 mb-8">
            <StatItem value={String(progress.streakBest)} label="лучший streak" />
            <StatItem value={String(progress.totalPoints)} label="очков" />
            <StatItem value={`${accuracy}%`} label="точность" />
          </div>

          <div className="w-full h-px bg-border mb-8" />

          <div className="grid grid-cols-2 gap-y-8">
            <StatItem value={String(progress.cardsSeen)} label="карточек пройдено" />
            <StatItem value={String(progress.cardsCorrect)} label="правильных ответов" />
          </div>

          {/* Auth section */}
          {!loading && (
            <>
              <div className="w-full h-px bg-border my-8" />
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
                    className="inline-block px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium btn-press transition-colors"
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
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-extralight text-foreground tracking-tight leading-none">
        {value}
      </div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted mt-2 font-medium">
        {label}
      </p>
    </div>
  );
}
