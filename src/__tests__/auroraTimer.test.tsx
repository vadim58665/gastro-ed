import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AuroraTimer from "@/components/ui/AuroraTimer";

describe("AuroraTimer", () => {
  it("рендерит число оставшихся секунд", () => {
    const { getByText } = render(<AuroraTimer timeLeftMs={12000} totalMs={20000} />);
    expect(getByText("12")).toBeInTheDocument();
  });

  it("нормальная фаза при >50% времени", () => {
    const { container } = render(<AuroraTimer timeLeftMs={15000} totalMs={20000} />);
    expect(container.querySelector(".aurora-timer-fill--normal")).toBeTruthy();
    expect(container.querySelector(".aurora-timer-pulse--normal")).toBeTruthy();
  });

  it("warning фаза при 20-50%", () => {
    const { container } = render(<AuroraTimer timeLeftMs={8000} totalMs={20000} />);
    expect(container.querySelector(".aurora-timer-fill--warning")).toBeTruthy();
  });

  it("danger фаза при <20%", () => {
    const { container } = render(<AuroraTimer timeLeftMs={2000} totalMs={20000} />);
    expect(container.querySelector(".aurora-timer-fill--danger")).toBeTruthy();
    expect(container.querySelector(".aurora-timer-pulse--danger")).toBeTruthy();
  });

  it("ширина fill соответствует доле оставшегося времени", () => {
    const { container } = render(<AuroraTimer timeLeftMs={5000} totalMs={20000} />);
    const fill = container.querySelector(".aurora-timer-fill") as HTMLElement;
    expect(fill.style.width).toBe("25%");
  });

  it("label таймера - caps aurora", () => {
    const { getByText } = render(<AuroraTimer timeLeftMs={10000} totalMs={20000} />);
    expect(getByText(/таймер/i)).toBeInTheDocument();
  });

  it("округляет секунды вверх (Math.ceil)", () => {
    const { getByText } = render(<AuroraTimer timeLeftMs={1500} totalMs={20000} />);
    expect(getByText("2")).toBeInTheDocument();
  });
});
