import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Greeting from "@/components/ui/Greeting";

describe("Greeting", () => {
  it("рендерит никнейм", () => {
    render(<Greeting nickname="vadim58" level="Ординатор II" xp={1934} />);
    expect(screen.getByText("vadim58")).toBeInTheDocument();
  });

  it("показывает уровень и XP", () => {
    render(<Greeting nickname="vadim58" level="Ординатор II" xp={1934} />);
    expect(screen.getByText("Ординатор II")).toBeInTheDocument();
    expect(screen.getByText(/1[\s ]?934/)).toBeInTheDocument();
  });

  it("использует greeting по времени суток", () => {
    render(<Greeting nickname="V" level="L" xp={0} hourOverride={8} />);
    expect(screen.getByText(/Доброе утро/i)).toBeInTheDocument();
  });

  it("Добрый день для 12-18", () => {
    render(<Greeting nickname="V" level="L" xp={0} hourOverride={14} />);
    expect(screen.getByText(/Добрый день/i)).toBeInTheDocument();
  });

  it("Добрый вечер для 18-22", () => {
    render(<Greeting nickname="V" level="L" xp={0} hourOverride={20} />);
    expect(screen.getByText(/Добрый вечер/i)).toBeInTheDocument();
  });

  it("Доброй ночи для 22-5", () => {
    render(<Greeting nickname="V" level="L" xp={0} hourOverride={2} />);
    expect(screen.getByText(/Доброй ночи/i)).toBeInTheDocument();
  });
});
