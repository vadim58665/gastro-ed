import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import XpProgress from "@/components/ui/XpProgress";

describe("XpProgress", () => {
  it("рендерит текущий и целевой XP", () => {
    render(
      <XpProgress
        current={1934}
        target={2071}
        currentLevel="Ординатор II"
        nextLevel="Врач"
      />
    );
    expect(screen.getByText(/1[\s ]?934/)).toBeInTheDocument();
    expect(screen.getByText(/2[\s ]?071/)).toBeInTheDocument();
  });

  it("показывает остаток XP до цели", () => {
    render(
      <XpProgress current={1934} target={2071} currentLevel="Ординатор II" nextLevel="Врач" />
    );
    expect(screen.getByText(/137/)).toBeInTheDocument();
  });

  it("рендерит названия уровней в футере", () => {
    render(
      <XpProgress current={1934} target={2071} currentLevel="Ординатор II" nextLevel="Врач" />
    );
    expect(screen.getByText("Ординатор II")).toBeInTheDocument();
    expect(screen.getByText("Врач")).toBeInTheDocument();
  });

  it("показывает 100% если current >= target", () => {
    const { container } = render(
      <XpProgress current={2500} target={2071} currentLevel="Врач" nextLevel="Профессор" />
    );
    const bar = container.querySelector('[data-xp-bar]') as HTMLElement;
    expect(bar?.style.width).toBe("100%");
  });
});
