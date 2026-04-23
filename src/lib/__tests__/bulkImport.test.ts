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
      "sd-progress",
      JSON.stringify({ cardHistory: [{ cardId: "c1", isCorrect: true, timestamp: 1 }] }),
    );

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("backend_disabled");
    expect(hoisted.submitBatch).not.toHaveBeenCalled();
  });

  it("skips when already done", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    localStorage.setItem("umnyvrach-bulk-import-done-v1", "1");

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("already_done");
  });

  it("skips with no_data when localStorage empty", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("no_data");
  });

  it("uploads card history in a single batch and marks done", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockResolvedValue({
      answers_accepted: 3,
      answers_duplicates: 0,
      fsrs_upserts: 0,
    });
    localStorage.setItem(
      "sd-progress",
      JSON.stringify({
        cardHistory: [
          { cardId: "c1", isCorrect: true, timestamp: 1_700_000_000_000 },
          { cardId: "c2", isCorrect: false, timestamp: 1_700_000_100_000 },
          { cardId: "c3", isCorrect: true, timestamp: 1_700_000_200_000 },
        ],
      }),
    );

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(false);
    expect(result.batches_sent).toBe(1);
    expect(result.total_uploaded).toBe(3);
    expect(hoisted.submitBatch).toHaveBeenCalledOnce();

    const payload = hoisted.submitBatch.mock.calls[0][0];
    expect(payload.answers.length).toBe(3);
    expect(payload.answers[0]).toMatchObject({
      entity_type: "card",
      entity_id: "c1",
      is_correct: true,
      answered_at_ms: 1_700_000_000_000,
      idempotency_key: "local:card:c1:1700000000000",
    });
    expect(localStorage.getItem("umnyvrach-bulk-import-done-v1")).toBe("1");
  });

  it("includes accreditation mistakes", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockResolvedValue({
      answers_accepted: 1,
      answers_duplicates: 0,
      fsrs_upserts: 0,
    });
    localStorage.setItem(
      "sd-accreditation",
      JSON.stringify({
        gastro: {
          mistakes: [
            { questionId: "q-42", isCorrect: false, timestamp: 1_700_000_500_000 },
          ],
        },
      }),
    );

    const result = await bulkImportLocalProgress();

    expect(result.skipped).toBe(false);
    const payload = hoisted.submitBatch.mock.calls[0][0];
    expect(payload.answers[0]).toMatchObject({
      entity_type: "accreditation_question",
      entity_id: "q-42",
      is_correct: false,
      source: "prep",
      idempotency_key: "local:accred:q-42:1700000500000",
    });
  });

  it("does not mark done when a batch fails", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockRejectedValue(new Error("network"));
    localStorage.setItem(
      "sd-progress",
      JSON.stringify({
        cardHistory: [{ cardId: "c1", isCorrect: true, timestamp: 1 }],
      }),
    );

    const result = await bulkImportLocalProgress();

    expect(result.errors.length).toBe(1);
    expect(localStorage.getItem("umnyvrach-bulk-import-done-v1")).toBeNull();
  });

  it("force=true bypasses already_done flag", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockResolvedValue({
      answers_accepted: 1,
      answers_duplicates: 0,
      fsrs_upserts: 0,
    });
    localStorage.setItem("umnyvrach-bulk-import-done-v1", "1");
    localStorage.setItem(
      "sd-progress",
      JSON.stringify({ cardHistory: [{ cardId: "c1", isCorrect: true, timestamp: 1 }] }),
    );

    const result = await bulkImportLocalProgress({ force: true });

    expect(result.skipped).toBe(false);
    expect(hoisted.submitBatch).toHaveBeenCalledOnce();
  });
});
