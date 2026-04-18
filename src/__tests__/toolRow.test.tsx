import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ToolRow from "@/components/ui/ToolRow";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const sampleIcon = <svg aria-label="chat-icon" />;

describe("ToolRow", () => {
  it("рендерит title и sub", () => {
    render(
      <ToolRow
        accent="indigo"
        icon={sampleIcon}
        title="Консилиум"
        sub="AI-пациент ждёт приёма"
      />
    );
    expect(screen.getByText("Консилиум")).toBeInTheDocument();
    expect(screen.getByText("AI-пациент ждёт приёма")).toBeInTheDocument();
  });

  it("рендерит chip с заданным label", () => {
    render(
      <ToolRow
        accent="pink-violet"
        icon={sampleIcon}
        title="Мои ошибки"
        sub="К повтору"
        chip={{ label: "161", variant: "pink" }}
      />
    );
    expect(screen.getByText("161")).toBeInTheDocument();
  });

  it("превращается в <a> если передан href", () => {
    render(
      <ToolRow
        accent="indigo"
        icon={sampleIcon}
        title="Консилиум"
        href="/consilium"
      />
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/consilium");
  });

  it("вызывает onClick если передан и нет href", () => {
    const onClick = vi.fn();
    render(
      <ToolRow
        accent="violet-pink"
        icon={sampleIcon}
        title="Экспорт"
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByText("Экспорт"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
