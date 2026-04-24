import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BackendAuthError,
  BackendDisabledError,
  BackendHttpError,
  backendFetch,
  getBackendUrl,
  isBackendEnabled,
} from "@/lib/backendClient";

const hoisted = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({ auth: { getSession: hoisted.getSessionMock } }),
  isSupabaseConfigured: () => true,
}));

const mockGetSession = hoisted.getSessionMock;

const VALID_TOKEN = "header.payload.signature";

function mockValidSession() {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: VALID_TOKEN } },
    error: null,
  });
}

function mockFetch(
  implementation: (url: string, init: RequestInit) => Promise<Response> | Response,
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(implementation as any);
}

describe("getBackendUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  });

  it("returns empty string when unset", () => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    expect(getBackendUrl()).toBe("");
  });

  it("strips trailing slash", () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://api.example.com/";
    expect(getBackendUrl()).toBe("https://api.example.com");
  });

  it("keeps url without trailing slash", () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://api.example.com";
    expect(getBackendUrl()).toBe("https://api.example.com");
  });
});

describe("isBackendEnabled", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  });

  it("false when url unset", () => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    expect(isBackendEnabled()).toBe(false);
  });

  it("true when url set and supabase configured", () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://api.example.com";
    expect(isBackendEnabled()).toBe(true);
  });
});

describe("backendFetch", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://api.example.com";
    mockGetSession.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  });

  it("throws BackendDisabledError when NEXT_PUBLIC_BACKEND_URL is empty", async () => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    await expect(backendFetch("/health")).rejects.toBeInstanceOf(BackendDisabledError);
  });

  it("throws BackendAuthError when session missing", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(backendFetch("/api/anything")).rejects.toBeInstanceOf(BackendAuthError);
  });

  it("attaches Bearer token from supabase session", async () => {
    mockValidSession();
    const fetchSpy = mockFetch(async () => new Response("{}", { status: 200 }));

    await backendFetch("/health");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${VALID_TOKEN}`);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("serializes POST body as JSON", async () => {
    mockValidSession();
    const fetchSpy = mockFetch(async () => new Response("{}", { status: 200 }));

    await backendFetch("/api/x", { method: "POST", body: { a: 1, b: "two" } });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ a: 1, b: "two" }));
  });

  it("encodes query string and skips nullish values", async () => {
    mockValidSession();
    const fetchSpy = mockFetch(async () => new Response("{}", { status: 200 }));

    await backendFetch("/api/x", {
      query: { a: "hello world", b: 42, c: null, d: undefined },
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe("https://api.example.com/api/x?a=hello%20world&b=42");
  });

  it("parses JSON response", async () => {
    mockValidSession();
    mockFetch(async () =>
      new Response(JSON.stringify({ ok: true, n: 42 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await backendFetch<{ ok: boolean; n: number }>("/api/x");
    expect(result).toEqual({ ok: true, n: 42 });
  });

  it("throws BackendHttpError with requestId on non-2xx", async () => {
    mockValidSession();
    mockFetch(async () =>
      new Response(JSON.stringify({ error: "rate_limited", request_id: "req-42" }), {
        status: 429,
        headers: { "content-type": "application/json", "x-request-id": "req-42" },
      }),
    );

    try {
      await backendFetch("/api/x");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(BackendHttpError);
      const httpErr = err as BackendHttpError;
      expect(httpErr.status).toBe(429);
      expect(httpErr.requestId).toBe("req-42");
      expect(httpErr.body).toEqual({ error: "rate_limited", request_id: "req-42" });
    }
  });

  it("aborts on timeout", async () => {
    mockValidSession();
    mockFetch(async (_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    await expect(
      backendFetch("/api/slow", { timeoutMs: 50 }),
    ).rejects.toThrow();
  });
});
