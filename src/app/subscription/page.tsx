"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import TopBar from "@/components/ui/TopBar";
import ShineCard from "@/components/ui/ShineCard";
import { TIER_CONFIGS, type SubscriptionTier } from "@/types/medmind";

type TierPalette = { from: string; to: string; isDark?: boolean };

const TIER_PALETTE: Record<SubscriptionTier, TierPalette> = {
  free: { from: "var(--color-muted, #94a3b8)", to: "var(--color-border, #cbd5e1)" },
  feed_helper: { from: "var(--color-aurora-indigo)", to: "var(--color-aurora-violet)" },
  accred_basic: { from: "var(--color-aurora-indigo)", to: "var(--color-aurora-violet)" },
  accred_mentor: { from: "var(--color-aurora-violet)", to: "var(--color-aurora-pink)" },
  accred_tutor: { from: "var(--color-aurora-indigo)", to: "var(--color-aurora-pink)" },
  accred_extreme: { from: "var(--color-ink)", to: "var(--color-aurora-indigo)", isDark: true },
};

const PAID_TIERS: SubscriptionTier[] = [
  "feed_helper",
  "accred_basic",
  "accred_mentor",
  "accred_tutor",
  "accred_extreme",
];

function formatPrice(rub: number): string {
  return rub.toLocaleString("ru-RU");
}

export default function SubscriptionPage() {
  const { isPro, subscription, tier, startTrial, createPayment, refreshSubscription } =
    useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"feed" | "accreditation">("feed");

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const status = searchParams?.get("status");

  if (status === "success" && !isPro) {
    refreshSubscription();
  }

  const handleSubscribe = async (selectedTier: SubscriptionTier) => {
    setLoading(selectedTier);
    const url = await createPayment(selectedTier);
    if (url) {
      window.location.href = url;
    }
    setLoading(null);
  };

  const handleTrial = async () => {
    setLoading("trial");
    await startTrial();
    setLoading(null);
  };

  const currentConfig = TIER_CONFIGS[tier];

  if (isPro) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-20 overflow-y-auto">
          <div className="max-w-lg mx-auto px-6 py-12">
            <p
              className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-2"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              ПОДПИСКА АКТИВНА
            </p>
            <p className="text-4xl font-extralight text-foreground">{currentConfig.name}</p>
            <p
              className="text-lg font-extralight mt-1"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              {formatPrice(currentConfig.priceRub)} /мес
            </p>
            <div className="w-12 h-px bg-border my-6" />
            <p className="text-sm text-foreground/70">
              {subscription.status === "trial"
                ? `Пробный период до ${new Date(subscription.trialEndsAt!).toLocaleDateString("ru-RU")}`
                : `Активна до ${new Date(subscription.currentPeriodEnd!).toLocaleDateString("ru-RU")}`}
            </p>

            <div className="mt-8 space-y-2">
              {currentConfig.features.map((f) => (
                <div key={f} className="flex items-start gap-3 text-sm text-foreground/80">
                  <svg className="w-4 h-4 mt-0.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const feedTiers = PAID_TIERS.filter((t) => TIER_CONFIGS[t].section === "feed");
  const accredTiers = PAID_TIERS.filter((t) => TIER_CONFIGS[t].section === "accreditation");
  const visibleTiers = activeSection === "feed" ? feedTiers : accredTiers;

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-8">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
            MEDMIND
          </p>
          <p className="text-3xl font-extralight text-foreground">
            Тарифы
          </p>

          <div className="w-16 divider-soft my-6" />

          {/* Section toggle — segmented control with depth */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-6"
            style={{
              backgroundImage: "linear-gradient(180deg, var(--color-surface, #eef0f7) 0%, var(--color-background, #f5f6fa) 100%)",
              boxShadow: "inset 0 1px 2px rgba(17,24,39,0.06), inset 0 0 0 1px rgba(17,24,39,0.05)",
            }}
          >
            <button
              onClick={() => setActiveSection("feed")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium uppercase tracking-widest transition-all duration-200 ${
                activeSection === "feed"
                  ? "text-foreground surface-raised"
                  : "text-muted hover:text-foreground/70"
              }`}
            >
              Лента
            </button>
            <button
              onClick={() => setActiveSection("accreditation")}
              className={`flex-1 py-2 rounded-lg text-xs font-medium uppercase tracking-widest transition-all duration-200 ${
                activeSection === "accreditation"
                  ? "text-foreground surface-raised"
                  : "text-muted hover:text-foreground/70"
              }`}
            >
              Аккредитация
            </button>
          </div>

          {/* Tier cards */}
          <div className="space-y-5">
            {visibleTiers.map((tierId, idx) => {
              const cfg = TIER_CONFIGS[tierId];
              const palette = TIER_PALETTE[tierId];
              const isHighlighted = idx === Math.floor(visibleTiers.length / 2);
              return (
                <ShineCard
                  key={tierId}
                  colorFrom={palette.from}
                  colorTo={palette.to}
                  duration={isHighlighted ? 6 : 10}
                  borderWidth={isHighlighted ? 2 : 1.25}
                >
                  <div className="px-6 py-6">
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted font-medium mb-1">
                          {isHighlighted ? "Рекомендуем" : "Тариф"}
                        </p>
                        <p className="text-xl font-extralight text-foreground">{cfg.name}</p>
                        {cfg.section === "accreditation" && cfg.blocksPerDay > 0 && (
                          <p className="text-[10px] uppercase tracking-widest text-muted mt-1">
                            {cfg.blocksPerDay} {cfg.blocksPerDay === 1 ? "блок" : cfg.blocksPerDay < 5 ? "блока" : "блоков"} в день
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-extralight aurora-text leading-none">
                          {formatPrice(cfg.priceRub)}
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-muted mt-1 inline-block">
                          ₽ / мес
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-5">
                      {cfg.features.map((f) => (
                        <div key={f} className="flex items-start gap-2.5 text-xs text-foreground/75 leading-relaxed">
                          <span
                            className="mt-1 w-1 h-1 rounded-full shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
                              boxShadow: `0 0 8px ${palette.from}`,
                            }}
                          />
                          {f}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleSubscribe(tierId)}
                      disabled={loading !== null}
                      className="w-full py-3 rounded-full btn-premium-dark text-xs font-medium uppercase tracking-[0.22em] btn-press disabled:opacity-50"
                    >
                      {loading === tierId ? "..." : "Подписаться"}
                    </button>
                  </div>
                </ShineCard>
              );
            })}
          </div>

          {/* Trial */}
          <div className="mt-6 text-center">
            <button
              onClick={handleTrial}
              disabled={loading !== null}
              className="text-xs uppercase tracking-widest text-primary/70 hover:text-primary transition-colors disabled:opacity-50"
            >
              {loading === "trial" ? "..." : "3 дня бесплатно"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
