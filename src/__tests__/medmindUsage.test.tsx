import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: "tok" } } }),
    },
  }),
}));

import { useMedMindUsage } from "@/hooks/useMedMindUsage";

describe("useMedMindUsage", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches when openKey becomes true", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tier: "accred_basic",
        date: "2026-04-16",
        usage: {
          chat: { used: 3, limit: 30 },
          explain: { used: 1, limit: 7 },
          image: { used: 0, limit: 1 },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useMedMindUsage(open),
      { initialProps: { open: false } }
    );

    expect(fetchMock).not.toHaveBeenCalled();

    rerender({ open: true });
    await waitFor(() => {
      expect(result.current.data?.usage.chat.used).toBe(3);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/medmind/usage",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } })
    );
  });

  it("does not fetch when panel stays closed", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useMedMindUsage(false));
    // Give any scheduled microtasks a tick to flush.
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refetch() triggers a new call", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tier: "free",
        date: "2026-04-16",
        usage: {
          chat: { used: 0, limit: 0 },
          explain: { used: 0, limit: 0 },
          image: { used: 0, limit: 0 },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useMedMindUsage(true));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
