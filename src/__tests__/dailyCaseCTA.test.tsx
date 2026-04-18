import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DailyCaseCTA from "@/components/ui/DailyCaseCTA";

describe("DailyCaseCTA", () => {
  it("рендерит дату и id кейса", () => {
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active
        onStart={() => {}}
      />
    );
    expect(screen.getByText(/18 апр/)).toBeInTheDocument();
    expect(screen.getByText(/hard-002/)).toBeInTheDocument();
  });

  it("показывает «Активно» индикатор если active=true", () => {
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active
        onStart={() => {}}
      />
    );
    expect(screen.getByText(/активно/i)).toBeInTheDocument();
  });

  it("не показывает «Активно» если active=false", () => {
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active={false}
        onStart={() => {}}
      />
    );
    expect(screen.queryByText(/активно/i)).not.toBeInTheDocument();
  });

  it("вызывает onStart при клике на CTA", () => {
    const onStart = vi.fn();
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active
        onStart={onStart}
      />
    );
    fireEvent.click(screen.getByLabelText("Начать диагноз дня"));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("показывает прогресс очков в подстроке", () => {
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active
        onStart={() => {}}
      />
    );
    expect(screen.getByText(/0\s*из\s*5[\s ]?000|0.{1,3}5/)).toBeInTheDocument();
  });
});
