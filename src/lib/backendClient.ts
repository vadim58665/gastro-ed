/**
 * HTTP-клиент для Python-бэкенда (FastAPI, feat/python-backend).
 *
 * Feature flag: если `NEXT_PUBLIC_BACKEND_URL` не задан, клиент выбрасывает
 * `BackendDisabledError` и вызывающий код должен сделать fallback на прежнюю
 * локальную логику. Это обеспечивает безопасный прогрессивный переход.
 *
 * Бэкенд требует Supabase JWT - клиент автоматически достаёт access_token
 * из текущей сессии через @supabase/supabase-js.
 */

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export class BackendDisabledError extends Error {
  constructor() {
    super(
      "Python backend отключён (NEXT_PUBLIC_BACKEND_URL не задан). " +
        "Используется локальный fallback.",
    );
    this.name = "BackendDisabledError";
  }
}

export class BackendAuthError extends Error {
  constructor() {
    super("Нет активной Supabase-сессии; нельзя получить JWT для бэкенда.");
    this.name = "BackendAuthError";
  }
}

export class BackendHttpError extends Error {
  readonly status: number;
  readonly requestId: string | null;
  readonly body: unknown;
  constructor(status: number, requestId: string | null, body: unknown) {
    super(`Backend ${status}`);
    this.name = "BackendHttpError";
    this.status = status;
    this.requestId = requestId;
    this.body = body;
  }
}

export interface BackendFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export function getBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ?? "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function isBackendEnabled(): boolean {
  return getBackendUrl().length > 0 && isSupabaseConfigured();
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw new BackendAuthError();
  const token = data.session?.access_token;
  if (!token) throw new BackendAuthError();
  return token;
}

function buildQueryString(query?: BackendFetchOptions["query"]): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export async function backendFetch<T>(
  path: string,
  options: BackendFetchOptions = {},
): Promise<T> {
  const baseUrl = getBackendUrl();
  if (!baseUrl) throw new BackendDisabledError();

  const token = await getAccessToken();

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const signal = options.signal
    ? anySignal(options.signal, controller.signal)
    : controller.signal;

  const url = `${baseUrl}${path}${buildQueryString(options.query)}`;
  const method = options.method ?? "GET";

  try {
    const response = await fetch(url, {
      method,
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const requestId = response.headers.get("x-request-id");
    const contentType = response.headers.get("content-type") ?? "";
    const parsed = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      throw new BackendHttpError(response.status, requestId, parsed);
    }

    return parsed as T;
  } finally {
    clearTimeout(timer);
  }
}

function anySignal(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}
