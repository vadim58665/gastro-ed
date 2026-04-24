import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  submitBatch: vi.fn(),
  isBackendEnabled: vi.fn(),
}));

vi.mock("@/lib/backend", () => ({
  isBackendEnabled: hoisted.isBackendEnabled,
  BackendSync: { submitBatch: hoisted.submitBatch },
}));

import { bulkImportLocalProgress, resetBulkImportFlag } from "@/lib/migration/bulkImport";

beforeEach(() => {
  hoisted.submitBatch.mockReset();
  hoisted.isBackendEnabled.mockReset();
  localStorage.clear();
  resetBulkImportFlag();
});

afterEach(() => {
  localStorage.clear();
});

describe("bulkImportLocalProgress", () => {
  it("skips when backend disabled", async () => {
    hoisted.isBackendEnabled.mockReturnValue(false);
    localStorage.setItem(
      "sd-review",
      JSON.stringify([{ cardId: "c1", fsrs: { stability: 2.5 } }]),
    );

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("backend_disabled");
    expect(hoisted.submitBatch).not.toHaveBeenCalled();
  });

  it("skips when already done", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    localStorage.setItem("umnyvrach-bulk-import-done-v2", "1");

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("already_done");
  });

  it("skips with no_data when sd-review missing", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("no_data");
    expect(localStorage.getItem("umnyvrach-bulk-import-done-v2")).toBe("1");
  });

  it("uploads FSRS state from sd-review in a single batch and marks done", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockResolvedValue({
      answers_accepted: 0,
      answers_duplicates: 0,
      fsrs_upserts: 2,
    });

    localStorage.setItem(
      "sd-review",
      JSON.stringify([
        {
          cardId: "c1",
          source: "feed",
          fsrs: {
            stability: 3.1,
            difficulty: 5.4,
            due: "2026-05-01T10:00:00.000Z",
            last_review: "2026-04-20T10:00:00.000Z",
            reps: 2,
            lapses: 0,
            state: 2,
          },
        },
        {
          cardId: "c2",
          source: "prep",
          fsrs: {
            stability: 1.5,
            difficulty: 7.0,
            last_review: 1_700_000_000_000,
          },
        },
      ]),
    );

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(false);
    expect(result.batches_sent).toBe(1);
    expect(result.fsrs_uploaded).toBe(2);
    expect(hoisted.submitBatch).toHaveBeenCalledOnce();

    const payload = hoisted.submitBatch.mock.calls[0][0];
    expect(payload.answers).toEqual([]);
    expect(payload.fsrs_updates.length).toBe(2);
    expect(payload.fsrs_updates[0]).toMatchObject({
      entity_id: "c1",
      source: "feed",
      updated_at_ms: Date.parse("2026-04-20T10:00:00.000Z"),
    });
    expect(payload.fsrs_updates[0].state).toMatchObject({
      stability: 3.1,
      difficulty: 5.4,
      reps: 2,
      lapses: 0,
    });
    expect(payload.fsrs_updates[1].source).toBe("prep");
    expect(localStorage.getItem("umnyvrach-bulk-import-done-v2")).toBe("1");
  });

  it("defaults source=feed for cards without explicit source", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockResolvedValue({
      answers_accepted: 0,
      answers_duplicates: 0,
      fsrs_upserts: 1,
    });
    localStorage.setItem(
      "sd-review",
      JSON.stringify([{ cardId: "c1", fsrs: { stability: 1.0 } }]),
    );

    await bulkImportLocalProgress();

    const payload = hoisted.submitBatch.mock.calls[0][0];
    expect(payload.fsrs_updates[0].source).toBe("feed");
  });

  it("ignores entries without cardId or fsrs", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockResolvedValue({
      answers_accepted: 0,
      answers_duplicates: 0,
      fsrs_upserts: 1,
    });
    localStorage.setItem(
      "sd-review",
      JSON.stringify([
        { cardId: "c1", fsrs: { stability: 1 } },
        { cardId: "c2" }, // нет fsrs
        { fsrs: { stability: 2 } }, // нет cardId
        null, // совсем сломанный элемент
      ]),
    );

    await bulkImportLocalProgress();

    const payload = hoisted.submitBatch.mock.calls[0][0];
    expect(payload.fsrs_updates.length).toBe(1);
    expect(payload.fsrs_updates[0].entity_id).toBe("c1");
  });

  it("does not mark done when a batch fails", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockRejectedValue(new Error("network"));
    localStorage.setItem(
      "sd-review",
      JSON.stringify([{ cardId: "c1", fsrs: { stability: 1 } }]),
    );

    const result = await bulkImportLocalProgress();

    expect(result.errors.length).toBe(1);
    expect(localStorage.getItem("umnyvrach-bulk-import-done-v2")).toBeNull();
  });

  it("force=true bypasses already_done flag", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockResolvedValue({
      answers_accepted: 0,
      answers_duplicates: 0,
      fsrs_upserts: 1,
    });
    localStorage.setItem("umnyvrach-bulk-import-done-v2", "1");
    localStorage.setItem(
      "sd-review",
      JSON.stringify([{ cardId: "c1", fsrs: { stability: 1 } }]),
    );

    const result = await bulkImportLocalProgress({ force: true });

    expect(result.skipped).toBe(false);
    expect(hoisted.submitBatch).toHaveBeenCalledOnce();
  });

  it("handles malformed localStorage gracefully", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    localStorage.setItem("sd-review", "not json {");

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("no_data");
    expect(hoisted.submitBatch).not.toHaveBeenCalled();
  });
});
