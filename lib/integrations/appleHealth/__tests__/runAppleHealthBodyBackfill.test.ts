import { describe, it, expect, jest } from "@jest/globals";
import {
  APPLE_HEALTH_BODY_BACKFILL_YEARS,
  isoYearsAgoFromNow,
  runAppleHealthBodyBackfill,
} from "../runAppleHealthBodyBackfill";
import type { AppleHealthBodyBackfillState } from "../storage";

function makeStateStore(initial: AppleHealthBodyBackfillState | null = null) {
  let state = initial;
  return {
    get: async () => state,
    set: async (next: AppleHealthBodyBackfillState) => {
      state = next;
    },
    peek: () => state,
  };
}

describe("runAppleHealthBodyBackfill", () => {
  it("computes 5-year target start date", () => {
    const now = "2026-03-31T12:00:00.000Z";
    const start = isoYearsAgoFromNow(APPLE_HEALTH_BODY_BACKFILL_YEARS, now);
    expect(start.startsWith("2021-03-31")).toBe(true);
  });

  it("processes history in chunks and records summary", async () => {
    const store = makeStateStore();
    const pull = jest.fn(async () => ({
      ok: true as const,
      data: [{ observedAt: "2025-01-01T00:00:00.000Z", sourceId: "watch", weightKg: 80 }],
    }));
    const ingestRawEvent = jest.fn(async () => ({ ok: true as const }));
    const result = await runAppleHealthBodyBackfill(
      { token: "t1", chunkDays: 1000 },
      {
        nowIso: () => "2026-03-31T12:00:00.000Z",
        pullBodyCompositionSamples: pull,
        ingestRawEvent,
        appleHealthBodyWeightIdempotencyKey: ({ observedAtIso }) => `w:${observedAtIso}`,
        appleHealthBodyCompositionIdempotencyKey: ({ observedAtIso, metric }) => `c:${metric}:${observedAtIso}`,
        getDeviceTimezone: () => "America/Los_Angeles",
        getBackfillState: store.get,
        setBackfillState: store.set,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunkCount).toBeGreaterThan(1);
    expect(result.samplesRead).toBe(pull.mock.calls.length);
    expect(store.peek()?.status).toBe("completed");
  });

  it("resumes from checkpoint after interruption", async () => {
    const checkpoint: AppleHealthBodyBackfillState = {
      status: "in_progress",
      backfillStartDate: "2026-03-31T12:00:00.000Z",
      targetStartDate: "2021-03-31T12:00:00.000Z",
      lastProcessedDate: "2026-03-20T12:00:00.000Z",
      lastRunAt: "2026-03-31T12:00:00.000Z",
      error: null,
      summary: {
        startedAt: "2026-03-31T12:00:00.000Z",
        completedAt: null,
        chunkCount: 2,
        samplesRead: 10,
        samplesIngested: 10,
        samplesSkippedDuplicate: 0,
        lastProcessedDate: "2026-03-20T12:00:00.000Z",
      },
    };
    const store = makeStateStore(checkpoint);
    const pull = jest.fn(async () => ({ ok: true as const, data: [] }));
    const result = await runAppleHealthBodyBackfill(
      { token: "t1", chunkDays: 20 },
      {
        nowIso: () => "2026-03-31T12:00:00.000Z",
        pullBodyCompositionSamples: pull,
        ingestRawEvent: async () => ({ ok: true as const }),
        appleHealthBodyWeightIdempotencyKey: ({ observedAtIso }) => `w:${observedAtIso}`,
        appleHealthBodyCompositionIdempotencyKey: ({ observedAtIso, metric }) => `c:${metric}:${observedAtIso}`,
        getDeviceTimezone: () => "UTC",
        getBackfillState: store.get,
        setBackfillState: store.set,
      },
    );
    expect(result.ok).toBe(true);
    expect(pull.mock.calls[0]?.[0]?.startDate).toBe("2026-03-20T12:00:00.000Z");
  });

  it("does not rerun when already completed", async () => {
    const store = makeStateStore({
      status: "completed",
      backfillStartDate: "2026-03-31T12:00:00.000Z",
      targetStartDate: "2021-03-31T12:00:00.000Z",
      lastProcessedDate: "2026-03-31T12:00:00.000Z",
      lastRunAt: "2026-03-31T12:00:00.000Z",
      error: null,
      summary: {
        startedAt: "2026-03-31T12:00:00.000Z",
        completedAt: "2026-03-31T12:10:00.000Z",
        chunkCount: 4,
        samplesRead: 100,
        samplesIngested: 100,
        samplesSkippedDuplicate: 0,
        lastProcessedDate: "2026-03-31T12:00:00.000Z",
      },
    });
    const pull = jest.fn(async () => ({ ok: true as const, data: [] }));
    const result = await runAppleHealthBodyBackfill(
      { token: "t1" },
      {
        nowIso: () => "2026-03-31T12:00:00.000Z",
        pullBodyCompositionSamples: pull,
        ingestRawEvent: async () => ({ ok: true as const }),
        appleHealthBodyWeightIdempotencyKey: ({ observedAtIso }) => `w:${observedAtIso}`,
        appleHealthBodyCompositionIdempotencyKey: ({ observedAtIso, metric }) => `c:${metric}:${observedAtIso}`,
        getDeviceTimezone: () => "UTC",
        getBackfillState: store.get,
        setBackfillState: store.set,
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("already_completed");
    expect(pull).not.toHaveBeenCalled();
  });

  it("preserves timezone in ingested payloads and ingests mixed metrics", async () => {
    const store = makeStateStore();
    const ingestRawEvent = jest.fn(async () => ({ ok: true as const }));
    const result = await runAppleHealthBodyBackfill(
      { token: "t1", chunkDays: 5000 },
      {
        nowIso: () => "2026-03-31T12:00:00.000Z",
        pullBodyCompositionSamples: async () => ({
          ok: true,
          data: [
            { observedAt: "2026-03-01T10:00:00.000Z", sourceId: "watch", weightKg: 80, bodyFatPercent: 18 },
            { observedAt: "2026-03-02T10:00:00.000Z", sourceId: "watch", bmi: 24.1 },
          ],
        }),
        ingestRawEvent,
        appleHealthBodyWeightIdempotencyKey: ({ observedAtIso }) => `w:${observedAtIso}`,
        appleHealthBodyCompositionIdempotencyKey: ({ observedAtIso, metric }) => `c:${metric}:${observedAtIso}`,
        getDeviceTimezone: () => "America/New_York",
        getBackfillState: store.get,
        setBackfillState: store.set,
      },
    );
    expect(result.ok).toBe(true);
    const kinds = ingestRawEvent.mock.calls.map((c) => c[0]?.kind);
    expect(kinds).toContain("weight");
    expect(kinds).toContain("body_composition");
    const timezones = ingestRawEvent.mock.calls.map((c) => c[0]?.payload?.timezone);
    expect(timezones.every((z) => z === "America/New_York")).toBe(true);
  });
});
