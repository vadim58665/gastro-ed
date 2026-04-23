/** @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  isBackendEnabled: vi.fn(),
  bulkImport: vi.fn(),
  flushQueue: vi.fn(),
  queueSize: vi.fn(),
}));

vi.mock("@/lib/backendClient", () => ({
  isBackendEnabled: hoisted.isBackendEnabled,
}));
vi.mock("@/lib/migration/bulkImport", () => ({
  bulkImportLocalProgress: hoisted.bulkImport,
}));
vi.mock("@/lib/syncQueue", () => ({
  flushQueue: hoisted.flushQueue,
  queueSize: hoisted.queueSize,
}));

import { useBackendSync } from "@/hooks/useBackendSync";

beforeEach(() => {
  hoisted.isBackendEnabled.mockReset();
  hoisted.bulkImport.mockReset();
  hoisted.flushQueue.mockReset();
  hoisted.queueSize.mockReset();
  hoisted.queueSize.mockResolvedValue({ answers: 0, fsrs: 0 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useBackendSync", () => {
  it("returns enabled=false when backend disabled and does not call helpers", async () => {
    hoisted.isBackendEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useBackendSync("user-1"));

    expect(result.current.enabled).toBe(false);
    await waitFor(() => expect(hoisted.bulkImport).not.toHaveBeenCalled());
    expect(hoisted.flushQueue).not.toHaveBeenCalled();
  });

  it("does not call bulkImport when userId is null", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);

    renderHook(() => useBackendSync(null));

    await waitFor(() => expect(hoisted.bulkImport).not.toHaveBeenCalled());
  });

  it("calls bulkImport once per userId when enabled", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.bulkImport.mockResolvedValue({
      skipped: false,
      total_uploaded: 5,
      total_duplicates: 0,
      batches_sent: 1,
      errors: [],
    });

    const { result } = renderHook(() => useBackendSync("user-42"));

    await waitFor(() => expect(hoisted.bulkImport).toHaveBeenCalledOnce());
    await waitFor(() => expect(result.current.bulkImportResult?.total_uploaded).toBe(5));
  });

  it("sync() is a no-op when backend disabled", async () => {
    hoisted.isBackendEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useBackendSync("user-1"));

    await act(async () => {
      const flush = await result.current.sync();
      expect(flush).toBeNull();
    });
    expect(hoisted.flushQueue).not.toHaveBeenCalled();
  });

  it("sync() flushes queue and sets lastFlushAt", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.bulkImport.mockResolvedValue({
      skipped: true,
      reason: "already_done",
      total_uploaded: 0,
      total_duplicates: 0,
      batches_sent: 0,
      errors: [],
    });
    hoisted.flushQueue.mockResolvedValue({
      attempted: 3,
      synced: 3,
      duplicates: 0,
      skipped: false,
    });

    const { result } = renderHook(() => useBackendSync("user-1"));

    await act(async () => {
      await result.current.sync();
    });

    expect(hoisted.flushQueue).toHaveBeenCalled();
    expect(result.current.lastFlushAt).not.toBeNull();
    expect(result.current.lastError).toBeNull();
  });

  it("sync() records error from flushQueue", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.bulkImport.mockResolvedValue({
      skipped: true,
      reason: "already_done",
      total_uploaded: 0,
      total_duplicates: 0,
      batches_sent: 0,
      errors: [],
    });
    hoisted.flushQueue.mockResolvedValue({
      attempted: 1,
      synced: 0,
      duplicates: 0,
      skipped: false,
      error: "network",
    });

    const { result } = renderHook(() => useBackendSync("user-1"));

    await act(async () => {
      await result.current.sync();
    });

    expect(result.current.lastError).toBe("network");
  });
});
