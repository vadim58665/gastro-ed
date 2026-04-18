import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AccuracyRing from "@/components/ui/AccuracyRing";

describe("AccuracyRing", () => {
  it("рендерит процент точности", () => {
    render(<AccuracyRing percent={40} fraction="62/154" />);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("рендерит fraction если передан", () => {
    render(<AccuracyRing percent={40} fraction="62/154" />);
    expect(screen.getByText("62/154")).toBeInTheDocument();
  });

  it("не рендерит trend если не передан", () => {
    render(<AccuracyRing percent={40} />);
    expect(screen.queryByText(/за неделю/i)).not.toBeInTheDocument();
  });

  it("рендерит trend с дельтой", () => {
    render(
      <AccuracyRing
        percent={40}
        trend={{ delta: 3, period: "за неделю" }}
      />
    );
    expect(screen.getByText(/\+3%/)).toBeInTheDocument();
    expect(screen.getByText(/за неделю/i)).toBeInTheDocument();
  });

  it("рендерит отрицательный trend", () => {
    render(
      <AccuracyRing
        percent={40}
        trend={{ delta: -5, period: "за неделю" }}
      />
    );
    expect(screen.getByText(/-5%/)).toBeInTheDocument();
  });
});
