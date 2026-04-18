import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StreakHero, { type WeekDay } from "@/components/ui/StreakHero";

const sampleWeek: WeekDay[] = [
  { label: "Пн", activity: 0.5, isToday: false },
  { label: "Вт", activity: 0, isToday: false },
  { label: "Ср", activity: 0.7, isToday: false },
  { label: "Чт", activity: 0.9, isToday: false },
  { label: "Пт", activity: 0.8, isToday: false },
  { label: "Сб", activity: 0, isToday: false },
  { label: "Вс", activity: 0, isToday: true },
];

describe("StreakHero", () => {
  it("рендерит текущий streak большим числом", () => {
    render(<StreakHero currentStreak={1} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("рендерит лучший streak", () => {
    render(<StreakHero currentStreak={1} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText(/4 ДНЯ/i)).toBeInTheDocument();
  });

  it("рендерит все 7 дней недели", () => {
    render(<StreakHero currentStreak={1} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText("Пн")).toBeInTheDocument();
    expect(screen.getByText("Вс")).toBeInTheDocument();
  });

  it("корректно склоняет «день» для streak 1", () => {
    render(<StreakHero currentStreak={1} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText(/день подряд/i)).toBeInTheDocument();
  });

  it("корректно склоняет «дня» для streak 2-4", () => {
    render(<StreakHero currentStreak={3} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText(/дня подряд/i)).toBeInTheDocument();
  });

  it("корректно склоняет «дней» для streak 5+", () => {
    render(<StreakHero currentStreak={7} bestStreak={7} weekPattern={sampleWeek} />);
    expect(screen.getByText(/дней подряд/i)).toBeInTheDocument();
  });
});
