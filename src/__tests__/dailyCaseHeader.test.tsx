import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DailyCaseHeader from "@/components/daily/DailyCaseHeader";

describe("DailyCaseHeader", () => {
  it("рендерит label «Диагноз дня» с датой", () => {
    const { getByText } = render(
      <DailyCaseHeader title="Маточное кровотечение" dateLabel="18 апр" difficulty="medium" />
    );
    expect(getByText(/диагноз дня/i)).toBeInTheDocument();
    expect(getByText(/18 апр/i)).toBeInTheDocument();
  });

  it("рендерит title", () => {
    const { getByText } = render(
      <DailyCaseHeader title="Маточное кровотечение" dateLabel="18 апр" difficulty="medium" />
    );
    expect(getByText("Маточное кровотечение")).toBeInTheDocument();
  });

  it("difficulty easy - aurora-indigo dot", () => {
    const { container } = render(
      <DailyCaseHeader title="X" dateLabel="1 янв" difficulty="easy" />
    );
    expect(container.querySelector(".daily-difficulty-dot--easy")).toBeTruthy();
  });

  it("difficulty medium - aurora-violet dot", () => {
    const { container } = render(
      <DailyCaseHeader title="X" dateLabel="1 янв" difficulty="medium" />
    );
    expect(container.querySelector(".daily-difficulty-dot--medium")).toBeTruthy();
  });

  it("difficulty hard - aurora-pink dot", () => {
    const { container } = render(
      <DailyCaseHeader title="X" dateLabel="1 янв" difficulty="hard" />
    );
    expect(container.querySelector(".daily-difficulty-dot--hard")).toBeTruthy();
  });

  it("показывает текст сложности по-русски", () => {
    const { getByText } = render(
      <DailyCaseHeader title="X" dateLabel="1 янв" difficulty="hard" />
    );
    expect(getByText(/сложно/i)).toBeInTheDocument();
  });
});
