import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { computeLocalYtdLookbackDays, runAppleHealthStepsBackfill } from "../runAppleHealthStepsBackfill";
import type { AppleHealthStepsBackfillState } from "../storage";

function makeStore(initial: AppleHealthStepsBackfillState | null = null) {
  let state = initial;
  return {
    get: async () => state,
    set: async (next: AppleHealthStepsBackfillState) => {
      state = next;
    },
  };
}

describe("runAppleHealthStepsBackfill", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ingests each day with steps using steps idempotency key and completes", async () => {
    const store = makeStore();
    const ingestRawEvent = jest.fn(async () => ({ ok: true as const }));
    const pullStepCountForLocalCalendarDay = jest.fn(async (day: string) => {
      if (day === "2026-04-07") return { ok: true as const, steps: 100 };
      return { ok: true as const, steps: 0 };
    });

    const result = await runAppleHealthStepsBackfill(
      { token: "tok", lookbackDays: 2 },
      {
        nowIso: () => "2026-04-07T12:00:00.000Z",
        getTodayDayKeyLocal: () => "2026-04-07",
        getDeviceTimezone: () => "America/New_York",
        pullStepCountForLocalCalendarDay,
        ingestRawEvent,
        stepsIdempotencyKey: (d) => `appleHealth:v2:steps:${d}`,
        getBackfillState: store.get,
        setBackfillState: store.set,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.daysTotal).toBe(2);
    expect(result.daysIngested).toBe(2);
    expect(ingestRawEvent).toHaveBeenCalledTimes(2);
    const keys = ingestRawEvent.mock.calls.map((c) => c[2]?.idempotencyKey);
    expect(keys).toContain("appleHealth:v2:steps:2026-04-06");
    expect(keys).toContain("appleHealth:v2:steps:2026-04-07");
    const firstBody = ingestRawEvent.mock.calls[0]![0] as { kind?: string; payload?: { day?: string; steps?: number } };
    expect(firstBody.kind).toBe("steps");
    expect(firstBody.payload?.day).toBe("2026-04-06");
    expect(firstBody.payload?.steps).toBe(0);
  });

  it("skips ingest when HealthKit returns null steps", async () => {
    const store = makeStore();
    const ingestRawEvent = jest.fn(async () => ({ ok: true as const }));
    const pullStepCountForLocalCalendarDay = jest.fn(async () => ({ ok: true as const, steps: null }));

    const result = await runAppleHealthStepsBackfill(
      { token: "tok", lookbackDays: 1 },
      {
        nowIso: () => "2026-04-07T12:00:00.000Z",
        getTodayDayKeyLocal: () => "2026-04-07",
        getDeviceTimezone: () => "America/New_York",
        pullStepCountForLocalCalendarDay,
        ingestRawEvent,
        stepsIdempotencyKey: (d) => `k:${d}`,
        getBackfillState: store.get,
        setBackfillState: store.set,
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.daysSkippedNoData).toBe(1);
    expect(result.daysIngested).toBe(0);
    expect(ingestRawEvent).not.toHaveBeenCalled();
  });

  it("computeLocalYtdLookbackDays counts Jan 1 through today inclusive", () => {
    expect(computeLocalYtdLookbackDays("2026-01-01")).toBe(1);
    expect(computeLocalYtdLookbackDays("2026-01-03")).toBe(3);
    expect(computeLocalYtdLookbackDays("2026-04-08")).toBe(98);
  });
});
