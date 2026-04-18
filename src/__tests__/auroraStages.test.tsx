import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AuroraStages from "@/components/ui/AuroraStages";

describe("AuroraStages", () => {
  const stages = ["Жалобы", "Анамнез", "Анализы", "Диагноз"];

  it("рендерит все этапы", () => {
    const { getByText } = render(<AuroraStages stages={stages} currentIndex={0} />);
    stages.forEach((s) => expect(getByText(s.toUpperCase())).toBeInTheDocument());
  });

  it("активный этап имеет class --active", () => {
    const { container } = render(<AuroraStages stages={stages} currentIndex={1} />);
    const dots = container.querySelectorAll(".aurora-stage-dot");
    expect(dots[1].classList.contains("aurora-stage-dot--active")).toBe(true);
  });

  it("пройденные этапы имеют class --past", () => {
    const { container } = render(<AuroraStages stages={stages} currentIndex={2} />);
    const dots = container.querySelectorAll(".aurora-stage-dot");
    expect(dots[0].classList.contains("aurora-stage-dot--past")).toBe(true);
    expect(dots[1].classList.contains("aurora-stage-dot--past")).toBe(true);
  });

  it("будущие этапы имеют class --future", () => {
    const { container } = render(<AuroraStages stages={stages} currentIndex={1} />);
    const dots = container.querySelectorAll(".aurora-stage-dot");
    expect(dots[2].classList.contains("aurora-stage-dot--future")).toBe(true);
    expect(dots[3].classList.contains("aurora-stage-dot--future")).toBe(true);
  });

  it("линии между пройденными этапами - past", () => {
    const { container } = render(<AuroraStages stages={stages} currentIndex={2} />);
    const lines = container.querySelectorAll(".aurora-stage-line");
    expect(lines[0].classList.contains("aurora-stage-line--past")).toBe(true);
    expect(lines[1].classList.contains("aurora-stage-line--past")).toBe(true);
  });
});
