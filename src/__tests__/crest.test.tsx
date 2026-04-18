import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Crest from "@/components/ui/Crest";

const targetIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-label="target-icon">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

describe("Crest", () => {
  it("рендерит title и sub", () => {
    render(
      <Crest
        variant="indigo-violet"
        icon={targetIcon}
        title="Первый ответ"
        sub="10 апр"
      />
    );
    expect(screen.getByText("Первый ответ")).toBeInTheDocument();
    expect(screen.getByText("10 апр")).toBeInTheDocument();
  });

  it("применяет locked-класс при variant=locked", () => {
    const { container } = render(
      <Crest
        variant="locked"
        icon={targetIcon}
        title="Streak 7 дней"
        sub="3 из 7"
      />
    );
    expect(container.querySelector(".crest-locked")).toBeTruthy();
  });

  it("не применяет locked-класс при unlocked variant", () => {
    const { container } = render(
      <Crest
        variant="violet-pink"
        icon={targetIcon}
        title="Streak 3 дня"
        sub="12 апр"
      />
    );
    expect(container.querySelector(".crest-locked")).toBeFalsy();
  });
});
