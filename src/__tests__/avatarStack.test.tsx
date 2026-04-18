import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AvatarStack from "@/components/ui/AvatarStack";

describe("AvatarStack", () => {
  it("рендерит заглавную букву", () => {
    render(<AvatarStack initial="V" />);
    expect(screen.getByText("V")).toBeInTheDocument();
  });

  it("показывает activity-label если передан", () => {
    render(<AvatarStack initial="V" activityLabel="4 сегодня" />);
    expect(screen.getByText("4 сегодня")).toBeInTheDocument();
  });

  it("не показывает activity-label если не передан", () => {
    render(<AvatarStack initial="V" />);
    expect(screen.queryByText(/сегодня/)).not.toBeInTheDocument();
  });

  it("показывает verified-badge если verified=true", () => {
    render(<AvatarStack initial="V" verified />);
    expect(screen.getByLabelText("PRO-подписчик")).toBeInTheDocument();
  });

  it("не показывает verified-badge если verified не передан", () => {
    render(<AvatarStack initial="V" />);
    expect(screen.queryByLabelText("PRO-подписчик")).not.toBeInTheDocument();
  });
});
