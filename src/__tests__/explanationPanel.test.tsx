import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

describe("ExplanationPanel", () => {
  it("рендерит заголовок «Верно!» при correct", () => {
    render(
      <ExplanationPanel correct>Text</ExplanationPanel>
    );
    expect(screen.getByText(/Верно/i)).toBeInTheDocument();
  });

  it("рендерит заголовок «Неверно» при correct=false", () => {
    render(
      <ExplanationPanel correct={false}>Text</ExplanationPanel>
    );
    expect(screen.getByText(/Неверно/i)).toBeInTheDocument();
  });

  it("рендерит кастомный заголовок", () => {
    render(
      <ExplanationPanel correct title="Отлично">Text</ExplanationPanel>
    );
    expect(screen.getByText("Отлично")).toBeInTheDocument();
  });

  it("рендерит children контент", () => {
    render(
      <ExplanationPanel correct>Это объяснение</ExplanationPanel>
    );
    expect(screen.getByText("Это объяснение")).toBeInTheDocument();
  });

  it("применяет aurora-explanation-correct при correct=true", () => {
    const { container } = render(
      <ExplanationPanel correct>Text</ExplanationPanel>
    );
    expect(container.querySelector(".aurora-explanation-correct")).toBeTruthy();
  });

  it("применяет aurora-explanation-wrong при correct=false", () => {
    const { container } = render(
      <ExplanationPanel correct={false}>Text</ExplanationPanel>
    );
    expect(container.querySelector(".aurora-explanation-wrong")).toBeTruthy();
  });
});
