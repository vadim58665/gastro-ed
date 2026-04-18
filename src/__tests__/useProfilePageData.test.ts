import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock Supabase client
const fromMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    from: fromMock,
    auth: {
      getUser: async () => ({
        data: { user: { id: "test-user-id" } },
      }),
    },
  }),
  isSupabaseConfigured: () => true,
}));

// Mock useAuth
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-id",
      email: "test@example.com",
      created_at: "2026-04-10T00:00:00Z",
    },
  }),
}));

import { useProfilePageData } from "@/hooks/useProfilePageData";

// Build a chainable mock that resolves at the end of any query chain.
// Supports: .select().eq().gte(), .select().eq().lt(), .select().eq().lte()
// and any combination ending in a Promise.
function makeChainedMock(
  resolveWith: { data?: unknown; error: null; count?: number | null }
) {
  const chain: Record<string, unknown> = {};
  const terminal = Promise.resolve(resolveWith);

  // Every method returns the same chain object AND is also thenable
  const handler: ProxyHandler<typeof chain> = {
    get(_target, prop) {
      if (prop === "then") return terminal.then.bind(terminal);
      if (prop === "catch") return terminal.catch.bind(terminal);
      if (prop === "finally") return terminal.finally.bind(terminal);
      // Any other method call returns the proxy itself (for chaining)
      return () => proxy;
    },
  };
  const proxy = new Proxy(chain, handler);
  return proxy;
}

describe("useProfilePageData", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("возвращает loading=true сразу после маунта", () => {
    fromMock.mockReturnValue(makeChainedMock({ data: [], error: null, count: 0 }));

    const { result } = renderHook(() => useProfilePageData());
    expect(result.current.loading).toBe(true);
  });

  it("считает days in product от created_at", async () => {
    fromMock.mockReturnValue(makeChainedMock({ data: [], error: null, count: 0 }));

    const { result } = renderHook(() => useProfilePageData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // today=2026-04-18, created=2026-04-10 -> 8 days
    expect(result.current.daysInProduct).toBeGreaterThanOrEqual(7);
    expect(result.current.daysInProduct).toBeLessThanOrEqual(9);
  });

  it("возвращает weekPattern из 7 элементов", async () => {
    fromMock.mockReturnValue(makeChainedMock({ data: [], error: null, count: 0 }));

    const { result } = renderHook(() => useProfilePageData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.weekPattern).toHaveLength(7);
  });

  it("считает cardsToday=0 при пустом ответе", async () => {
    fromMock.mockReturnValue(makeChainedMock({ data: [], error: null, count: 0 }));

    const { result } = renderHook(() => useProfilePageData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cardsToday).toBe(0);
    expect(result.current.hintsThisMonth).toBe(0);
    expect(result.current.reviewsDue).toBe(0);
  });
});
