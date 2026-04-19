import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock all hooks/services used by FeedProfile
vi.mock("@/hooks/useGamification", () => ({
  useGamification: () => ({
    progress: {
      xp: 1934,
      streakCurrent: 1,
      streakBest: 4,
      cardsSeen: 154,
      cardsCorrect: 62,
      recentAnswers: [],
    },
    achievements: [
      { id: "first-answer", title: "Первый ответ", unlocked: true, unlockedAt: "2026-04-10T00:00:00Z" },
      { id: "streak-3", title: "Streak 3 дня", unlocked: true, unlockedAt: "2026-04-12T00:00:00Z" },
      { id: "streak-7", title: "Streak 7 дней", unlocked: false, unlockedAt: null },
      { id: "correct-100", title: "100 правильных", unlocked: false, unlockedAt: null },
      { id: "accuracy-80", title: "Точность 80%", unlocked: false, unlockedAt: null },
    ],
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "vpogodin58@gmail.com",
      created_at: "2026-04-10T00:00:00Z",
      user_metadata: {},
    },
    profile: { nickname: "vadim58", phone: null },
    profileConfirmed: true,
    loading: false,
    signInWithEmail: async () => ({ error: null }),
    verifyOtp: async () => ({ error: null }),
    signOut: async () => {},
    refreshProfile: async () => {},
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPro: true,
    tier: "accred_extreme",
    subscription: {
      status: "active",
      plan: "pro",
      tier: "accred_extreme",
      engagementLevel: "maximum",
      currentPeriodEnd: "2027-04-17T00:00:00Z",
    },
    engagementLevel: "maximum",
    gate: (cb: () => void) => cb(),
    setEngagementLevel: () => {},
    startTrial: async () => {},
    createPayment: async () => null,
    refreshSubscription: async () => {},
  }),
}));

vi.mock("@/hooks/useProfilePageData", () => ({
  useProfilePageData: () => ({
    loading: false,
    weekPattern: [
      { label: "Пн", activity: 0.5, isToday: false },
      { label: "Вт", activity: 0, isToday: false },
      { label: "Ср", activity: 0.7, isToday: false },
      { label: "Чт", activity: 0.9, isToday: false },
      { label: "Пт", activity: 0.8, isToday: false },
      { label: "Сб", activity: 0, isToday: false },
      { label: "Вс", activity: 0, isToday: true },
    ],
    reviewsDue: 161,
    accuracyTrend: 3,
    daysInProduct: 8,
    uniqueTopicsCount: 78,
    totalAnswers: 218,
    hintsThisMonth: 14,
    cardsToday: 4,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/medmind/SavedContentLibrary", () => ({
  default: () => null,
}));

vi.mock("@/components/profile/AuthSection", () => ({
  default: () => <div data-testid="auth-section" />,
}));

vi.mock("@/components/profile/ProfileSheet", () => ({
  default: () => null,
}));

vi.mock("@/components/analytics/ExamReadiness", () => ({
  default: () => <div data-testid="exam-readiness" />,
}));

import FeedProfile from "@/components/profile/FeedProfile";

describe("FeedProfile", () => {
  it("рендерит никнейм", () => {
    render(<FeedProfile />);
    expect(screen.getByText("vadim58")).toBeInTheDocument();
  });

  it("рендерит PRO-pill", () => {
    render(<FeedProfile />);
    expect(screen.getByText(/PRO/)).toBeInTheDocument();
  });

  it("рендерит aurora-число streak-а", () => {
    render(<FeedProfile />);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("рендерит точность из прогресса", () => {
    render(<FeedProfile />);
    expect(screen.getByText(/40%/)).toBeInTheDocument();
  });

  it("рендерит 4 stat-tiles с нужными label-ами", () => {
    render(<FeedProfile />);
    expect(screen.getByText("Ответов")).toBeInTheDocument();
    expect(screen.getByText("Тем")).toBeInTheDocument();
    expect(screen.getByText("К повтору")).toBeInTheDocument();
    expect(screen.getByText("В продукте")).toBeInTheDocument();
  });

  it("рендерит DailyCaseCTA section", () => {
    render(<FeedProfile />);
    expect(screen.getByText(/Диагноз дня/)).toBeInTheDocument();
  });

  it("рендерит Инструменты section", () => {
    render(<FeedProfile />);
    expect(screen.getByText("Консилиум")).toBeInTheDocument();
    expect(screen.getByText(/Мои ошибки/)).toBeInTheDocument();
  });

  it("рендерит MedMind-секцию для Pro юзера", () => {
    render(<FeedProfile />);
    expect(screen.getByText(/MedMind/i)).toBeInTheDocument();
  });
});
