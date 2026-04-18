import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AnswerOption from "@/components/ui/AnswerOption";

describe("AnswerOption", () => {
  it("рендерит текст", () => {
    render(<AnswerOption state="neutral" onClick={() => {}}>Ответ А</AnswerOption>);
    expect(screen.getByText("Ответ А")).toBeInTheDocument();
  });

  it("применяет aurora-opt-correct при state=correct", () => {
    const { container } = render(
      <AnswerOption state="correct" onClick={() => {}}>A</AnswerOption>
    );
    expect(container.querySelector(".aurora-opt-correct")).toBeTruthy();
  });

  it("применяет aurora-opt-wrong при state=wrong", () => {
    const { container } = render(
      <AnswerOption state="wrong" onClick={() => {}}>A</AnswerOption>
    );
    expect(container.querySelector(".aurora-opt-wrong")).toBeTruthy();
  });

  it("применяет aurora-opt-dim при state=dim", () => {
    const { container } = render(
      <AnswerOption state="dim" onClick={() => {}}>A</AnswerOption>
    );
    expect(container.querySelector(".aurora-opt-dim")).toBeTruthy();
  });

  it("вызывает onClick при клике", () => {
    const onClick = vi.fn();
    render(<AnswerOption state="neutral" onClick={onClick}>A</AnswerOption>);
    fireEvent.click(screen.getByText("A"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled при state=correct/wrong/dim", () => {
    render(<AnswerOption state="correct" onClick={() => {}}>A</AnswerOption>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
