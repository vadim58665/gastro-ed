import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MedMindCard from "@/components/ui/MedMindCard";

describe("MedMindCard", () => {
  it("рендерит title и tier", () => {
    render(
      <MedMindCard
        title="Максимальное вовлечение"
        tier="Активно до 17 апреля 2027"
        stats={[
          { label: "Осталось", value: "364 дня" },
          { label: "Этот месяц", value: "14 подсказок" },
        ]}
      />
    );
    expect(screen.getByText("Максимальное вовлечение")).toBeInTheDocument();
    expect(screen.getByText(/Активно до 17 апреля 2027/)).toBeInTheDocument();
  });

  it("рендерит все stat pairs", () => {
    render(
      <MedMindCard
        title="Pro"
        tier="Активно"
        stats={[
          { label: "Осталось", value: "364 дня" },
          { label: "Этот месяц", value: "14 подсказок" },
        ]}
      />
    );
    expect(screen.getByText("Осталось")).toBeInTheDocument();
    expect(screen.getByText("364 дня")).toBeInTheDocument();
    expect(screen.getByText("Этот месяц")).toBeInTheDocument();
    expect(screen.getByText("14 подсказок")).toBeInTheDocument();
  });
});
