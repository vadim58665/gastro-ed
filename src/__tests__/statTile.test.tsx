import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatTile from "@/components/ui/StatTile";

describe("StatTile", () => {
  it("рендерит значение и label", () => {
    render(<StatTile value={218} label="Ответов" />);
    expect(screen.getByText("218")).toBeInTheDocument();
    expect(screen.getByText("Ответов")).toBeInTheDocument();
  });

  it("принимает строковое значение", () => {
    render(<StatTile value="8д" label="В продукте" />);
    expect(screen.getByText("8д")).toBeInTheDocument();
  });

  it("применяет accent-класс если accent=true", () => {
    const { container } = render(<StatTile value={161} label="К повтору" accent />);
    const valueEl = container.querySelector('[data-stat-value]') as HTMLElement;
    expect(valueEl?.dataset.accent).toBe("true");
  });
});
