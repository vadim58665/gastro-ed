import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";

const hoisted = vi.hoisted(() => ({
  submitBatch: vi.fn(),
  isBackendEnabled: vi.fn(),
}));

vi.mock("@/lib/backend", () => ({
  isBackendEnabled: hoisted.isBackendEnabled,
  BackendSync: { submitBatch: hoisted.submitBatch },
}));

import {
  __resetSyncQueueForTests,
  clearSyncedAnswers,
  enqueueAnswer,
  enqueueFsrsUpdate,
  flushQueue,
  getQueuedAnswers,
  getQueuedFsrs,
  queueSize,
} from "@/lib/syncQueue";

function resetDb(): Promise<void> {
  __resetSyncQueueForTests();
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase("umnyvrach-sync");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

const sampleAnswer = (id: string) => ({
  entity_type: "card" as const,
  entity_id: id,
  is_correct: true,
  answered_at_ms: 1_700_000_000_000,
  source: "feed" as const,
  idempotency_key: `k-${id}`,
});

const sampleFsrs = (id: string) => ({
  entity_id: id,
  source: "feed" as const,
  state: { stability: 3.1 },
  updated_at_ms: 1_700_000_000_000,
});

describe("syncQueue", () => {
  beforeEach(async () => {
    await resetDb();
    hoisted.submitBatch.mockReset();
    hoisted.isBackendEnabled.mockReset();
  });

  afterEach(async () => {
    await resetDb();
  });

  it("enqueue and read answers", async () => {
    await enqueueAnswer(sampleAnswer("c1"));
    await enqueueAnswer(sampleAnswer("c2"));
    const answers = await getQueuedAnswers();
    expect(answers.length).toBe(2);
    expect(answers.map((a) => a.entity_id).sort()).toEqual(["c1", "c2"]);
  });

  it("dedupes answers by idempotency_key", async () => {
    const a = sampleAnswer("c1");
    await enqueueAnswer(a);
    await enqueueAnswer({ ...a, answered_at_ms: a.answered_at_ms + 100 });
    const answers = await getQueuedAnswers();
    expect(answers.length).toBe(1);
  });

  it("dedupes fsrs by (source, entity_id)", async () => {
    const f = sampleFsrs("c1");
    await enqueueFsrsUpdate(f);
    await enqueueFsrsUpdate({ ...f, state: { stability: 5.0 } });
    const rows = await getQueuedFsrs();
    expect(rows.length).toBe(1);
    expect(rows[0].state).toEqual({ stability: 5.0 });
  });

  it("queueSize reflects stored rows", async () => {
    await enqueueAnswer(sampleAnswer("c1"));
    await enqueueFsrsUpdate(sampleFsrs("c2"));
    const size = await queueSize();
    expect(size).toEqual({ answers: 1, fsrs: 1 });
  });

  it("clearSyncedAnswers removes specific keys", async () => {
    await enqueueAnswer(sampleAnswer("c1"));
    await enqueueAnswer(sampleAnswer("c2"));
    await clearSyncedAnswers(["k-c1"]);
    const answers = await getQueuedAnswers();
    expect(answers.map((a) => a.entity_id)).toEqual(["c2"]);
  });

  it("flushQueue skips when backend disabled", async () => {
    hoisted.isBackendEnabled.mockReturnValue(false);
    await enqueueAnswer(sampleAnswer("c1"));
    const result = await flushQueue();
    expect(result.skipped).toBe(true);
    expect(hoisted.submitBatch).not.toHaveBeenCalled();
  });

  it("flushQueue sends queued items and clears them on success", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockResolvedValue({
      answers_accepted: 2,
      answers_duplicates: 0,
      fsrs_upserts: 1,
    });
    await enqueueAnswer(sampleAnswer("c1"));
    await enqueueAnswer(sampleAnswer("c2"));
    await enqueueFsrsUpdate(sampleFsrs("c1"));

    const result = await flushQueue();

    expect(result.skipped).toBe(false);
    expect(result.synced).toBe(3);
    expect(hoisted.submitBatch).toHaveBeenCalledOnce();
    const size = await queueSize();
    expect(size).toEqual({ answers: 0, fsrs: 0 });
  });

  it("flushQueue preserves queue on submitBatch error", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    hoisted.submitBatch.mockRejectedValue(new Error("network"));
    await enqueueAnswer(sampleAnswer("c1"));

    const result = await flushQueue();

    expect(result.error).toContain("network");
    expect(result.synced).toBe(0);
    const size = await queueSize();
    expect(size.answers).toBe(1);
  });

  it("flushQueue returns skipped:false when queue empty", async () => {
    hoisted.isBackendEnabled.mockReturnValue(true);
    const result = await flushQueue();
    expect(result.skipped).toBe(false);
    expect(result.attempted).toBe(0);
    expect(hoisted.submitBatch).not.toHaveBeenCalled();
  });
});
