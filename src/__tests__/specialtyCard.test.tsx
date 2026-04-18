import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SpecialtyCard from "@/components/ui/SpecialtyCard";

const sampleTopics = [
  { name: "ГЭРБ", total: 18, answered: 14 },
  { name: "Язвенная болезнь", total: 15, answered: 7 },
];

describe("SpecialtyCard", () => {
  it("рендерит название специальности и инициал", () => {
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
      />
    );
    expect(screen.getByText("Гастроэнтерология")).toBeInTheDocument();
    expect(screen.getByText("Г")).toBeInTheDocument();
  });

  it("показывает количество карточек и процент", () => {
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
      />
    );
    expect(screen.getByText(/45/)).toBeInTheDocument();
    expect(screen.getByText(/62/)).toBeInTheDocument();
  });

  it("не рендерит темы если expanded=false", () => {
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
        topics={sampleTopics}
        expanded={false}
      />
    );
    expect(screen.queryByText("ГЭРБ")).not.toBeInTheDocument();
  });

  it("рендерит темы если expanded=true", () => {
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
        topics={sampleTopics}
        expanded
      />
    );
    expect(screen.getByText("ГЭРБ")).toBeInTheDocument();
    expect(screen.getByText("Язвенная болезнь")).toBeInTheDocument();
    expect(screen.getByText(/Все темы/i)).toBeInTheDocument();
  });

  it("вызывает onHeaderClick при клике на заголовок", () => {
    const onHeaderClick = vi.fn();
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
        onHeaderClick={onHeaderClick}
      />
    );
    fireEvent.click(screen.getByText("Гастроэнтерология"));
    expect(onHeaderClick).toHaveBeenCalledOnce();
  });

  it("вызывает onTopicClick при клике на тему", () => {
    const onTopicClick = vi.fn();
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
        topics={sampleTopics}
        expanded
        onTopicClick={onTopicClick}
      />
    );
    fireEvent.click(screen.getByText("ГЭРБ"));
    expect(onTopicClick).toHaveBeenCalledWith("ГЭРБ");
  });
});
