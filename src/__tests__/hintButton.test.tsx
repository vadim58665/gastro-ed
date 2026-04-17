import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock next/navigation
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: "fake-token" } } }),
    },
  }),
}));

// Mock useSubscription
let isProMock = false;
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ isPro: isProMock }),
}));

import HintButton from "@/components/feed/HintButton";

describe("HintButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
    isProMock = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows paywall for non-subscribers on click", async () => {
    isProMock = false;
    render(<HintButton entityId="ge-card-1" />);
    fireEvent.click(screen.getByLabelText("Показать подсказку"));
    expect(
      screen.getByText(/Подсказка доступна в подписке/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Подключить/i })).toBeInTheDocument();
  });

  it("navigates to /subscription when paywall Подключить clicked", () => {
    isProMock = false;
    render(<HintButton entityId="ge-card-1" />);
    fireEvent.click(screen.getByLabelText("Показать подсказку"));
    fireEvent.click(screen.getByRole("button", { name: /Подключить/i }));
    expect(pushMock).toHaveBeenCalledWith("/subscription");
  });

  it("closes paywall when Отмена clicked", () => {
    isProMock = false;
    render(<HintButton entityId="ge-card-1" />);
    fireEvent.click(screen.getByLabelText("Показать подсказку"));
    fireEvent.click(screen.getByRole("button", { name: /Отмена/i }));
    expect(screen.queryByText(/Подсказка доступна в подписке/i)).toBeNull();
  });

  it("fetches and shows hint for subscribers", async () => {
    isProMock = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: "Обратите внимание на печёночные маркеры." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HintButton entityId="ge-card-1" />);
    fireEvent.click(screen.getByLabelText("Показать подсказку"));

    await waitFor(() => {
      expect(
        screen.getByText("Обратите внимание на печёночные маркеры.")
      ).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/medmind/prebuilt?"),
      expect.objectContaining({
        headers: { Authorization: "Bearer fake-token" },
      })
    );
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("entityType=card");
    expect(url).toContain("entityId=ge-card-1");
    expect(url).toContain("contentType=hint");
  });

  it("uses accreditation_question entityType when specified", async () => {
    isProMock = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: "hint text" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HintButton entityId="ge-q-1" entityType="accreditation_question" />);
    fireEvent.click(screen.getByLabelText("Показать подсказку"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("entityType=accreditation_question");
  });

  it("shows 'скоро появится' on 404", async () => {
    isProMock = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ shouldFallback: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HintButton entityId="ge-card-99" />);
    fireEvent.click(screen.getByLabelText("Показать подсказку"));

    await waitFor(() => {
      expect(screen.getByText(/скоро появится/i)).toBeInTheDocument();
    });
  });

  it("shows paywall on 403 from server", async () => {
    isProMock = true; // client thinks it has access
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ paywall: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HintButton entityId="ge-card-1" />);
    fireEvent.click(screen.getByLabelText("Показать подсказку"));

    await waitFor(() => {
      expect(
        screen.getByText(/Подсказка доступна в подписке/i)
      ).toBeInTheDocument();
    });
  });
});
