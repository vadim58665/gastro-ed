import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    progress: { xp: 1934, streakCurrent: 1, streakBest: 4, cardsSeen: 154, cardsCorrect: 62, recentAnswers: [] },
  }),
}));

vi.mock("@/hooks/useReview", () => ({
  useReview: () => ({ reviewCards: [] }),
}));

vi.mock("@/contexts/SpecialtyContext", () => ({
  useSpecialty: () => ({ setActiveSpecialty: vi.fn(), clearSpecialty: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "v@example.com" },
    profile: { nickname: "vadim58" },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/topics",
}));

vi.mock("@/contexts/ModeContext", () => ({
  useMode: () => ({ mode: "learn", setMode: vi.fn() }),
}));

import TopicsPage from "@/app/topics/page";

describe("TopicsPage", () => {
  it("рендерит приветствие с ником", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/vadim58/)).toBeInTheDocument();
  });

  it("рендерит Daily Case CTA", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/Диагноз дня/i)).toBeInTheDocument();
  });

  it("рендерит секцию «Быстрые режимы»", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/Быстрые режимы/i)).toBeInTheDocument();
  });

  it("рендерит «Утренний блиц»", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/Утренний блиц/i)).toBeInTheDocument();
  });

  it("рендерит секцию «Специальности»", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/Специальности/)).toBeInTheDocument();
  });
});
