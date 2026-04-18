import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock useProgress hook - StreakBadge may use it
vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    progress: {
      streakCurrent: 1,
      streakBest: 4,
      xp: 1934,
      cardsSeen: 154,
      cardsCorrect: 62,
      recentAnswers: [],
    },
  }),
}));

import StreakBadge from "@/components/ui/StreakBadge";

describe("StreakBadge", () => {
  it("рендерит число streak", () => {
    render(<StreakBadge />);
    expect(screen.getAllByText(/1/)[0]).toBeInTheDocument();
  });

  it("рендерит label Streak", () => {
    render(<StreakBadge />);
    expect(screen.getByText(/Streak/i)).toBeInTheDocument();
  });
});
