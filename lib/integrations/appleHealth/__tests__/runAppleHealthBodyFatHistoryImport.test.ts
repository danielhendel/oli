/**
 * Body Fat all-history import — sparse years, false-complete, account isolation.
 */
import {
  discoverOldestBodyFatObservedAt,
  isBodyFatHistoryCompletionImplausible,
  runAppleHealthBodyFatHistoryImport,
} from "@/lib/integrations/appleHealth/runAppleHealthBodyFatHistoryImport";
import {
  APPLE_HEALTH_EARLIEST_SAFE_BOUNDARY_ISO,
  resolveBodyFatHistorySearchBoundary,
} from "@/lib/integrations/appleHealth/bodyFatHistoryBoundary";
import type { AppleHealthBodyFatBackfillStateV1 } from "@/lib/integrations/appleHealth/storage";
import { appleHealthBodyFatBackfillStateKey } from "@/lib/integrations/appleHealth/storage";
import type { AppleHealthBodyWeightSample } from "@/lib/integrations/appleHealth/healthKit";

function sample(at: string, pct: number): AppleHealthBodyWeightSample {
  return { observedAt: at, bodyFatPercent: pct, sourceId: "apple_health" } as AppleHealthBodyWeightSample;
}

describe("resolveBodyFatHistorySearchBoundary", () => {
  it("uses HealthKit-era floor by default", () => {
    expect(
      resolveBodyFatHistorySearchBoundary({ nowIso: "2026-09-21T00:00:00.000Z" }),
    ).toBe(APPLE_HEALTH_EARLIEST_SAFE_BOUNDARY_ISO);
  });

  it("prefers DOB when after the HealthKit-era floor", () => {
    expect(
      resolveBodyFatHistorySearchBoundary({
        nowIso: "2026-09-21T00:00:00.000Z",
        dateOfBirthIso: "2015-03-01",
      }),
    ).toBe("2015-03-01T00:00:00.000Z");
  });

  it("clamps adult DOB before the floor to the floor", () => {
    expect(
      resolveBodyFatHistorySearchBoundary({
        nowIso: "2026-09-21T00:00:00.000Z",
        dateOfBirthIso: "1990-05-15",
      }),
    ).toBe(APPLE_HEALTH_EARLIEST_SAFE_BOUNDARY_ISO);
  });
});

describe("discoverOldestBodyFatObservedAt — sparse history", () => {
  it("crosses empty years and finds 2017", async () => {
    const pulls: string[] = [];
    const discovery = await discoverOldestBodyFatObservedAt({
      nowIso: () => "2026-09-21T12:00:00.000Z",
      chunkDays: 400,
      pullBodyCompositionSamples: async (opts) => {
        pulls.push(`${opts.startDate.slice(0, 10)}..${opts.endDate.slice(0, 10)}`);
        // Ascending limit-1 over full window returns newest (bridge ignore) → fall through.
        if (opts.ascending && opts.limit === 1) {
          return { ok: true, data: [sample("2026-09-01T12:00:00.000Z", 17)] };
        }
        const start = opts.startDate.slice(0, 4);
        if (start === "2017") {
          return {
            ok: true,
            data: [
              sample("2017-06-10T10:00:00.000Z", 18.8),
              sample("2017-06-10T14:00:00.000Z", 19.5),
            ],
          };
        }
        if (start === "2024") {
          return { ok: true, data: [sample("2024-10-17T12:00:00.000Z", 21)] };
        }
        if (start === "2025") {
          return { ok: true, data: [sample("2025-04-08T12:00:00.000Z", 20.5)] };
        }
        if (start === "2026") {
          return { ok: true, data: [sample("2026-07-28T12:00:00.000Z", 17.5)] };
        }
        return { ok: true, data: [] };
      },
    });
    expect(discovery.status).toBe("ok");
    expect(discovery.oldestObservedAt).toBe("2017-06-10T10:00:00.000Z");
    expect(pulls.length).toBeGreaterThan(2);
  });
});

describe("isBodyFatHistoryCompletionImplausible", () => {
  const base: AppleHealthBodyFatBackfillStateV1 = {
    version: 1,
    metric: "bodyFat",
    status: "completed",
    backfillStartDate: "2026-01-01T00:00:00.000Z",
    targetStartDate: "2021-09-21T00:00:00.000Z",
    lastProcessedDate: "2026-09-21T00:00:00.000Z",
    lastRunAt: "2026-09-21T00:00:00.000Z",
    error: null,
    oldestHealthKitObservedAt: null,
    newestHealthKitObservedAt: "2026-09-21T00:00:00.000Z",
    summary: {
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-02T00:00:00.000Z",
      chunkCount: 10,
      samplesRead: 5,
      samplesIngested: 5,
      samplesSkippedDuplicate: 0,
      lastProcessedDate: "2026-09-21T00:00:00.000Z",
    },
  };

  it("flags completed 5Y-era checkpoint when discovery finds older samples", () => {
    expect(
      isBodyFatHistoryCompletionImplausible({
        existing: base,
        discoveredOldestObservedAt: "2017-06-10T10:00:00.000Z",
        searchBoundaryIso: APPLE_HEALTH_EARLIEST_SAFE_BOUNDARY_ISO,
      }),
    ).toBe(true);
  });
});

describe("runAppleHealthBodyFatHistoryImport", () => {
  it("imports across empty years and is idempotent on second run", async () => {
    let state: AppleHealthBodyFatBackfillStateV1 | null = null;
    const ingestedKeys = new Set<string>();
    const pull = async (opts: {
      startDate: string;
      endDate: string;
      limit?: number;
      ascending?: boolean;
    }) => {
      if (opts.ascending && opts.limit === 1) {
        return { ok: true as const, data: [sample("2026-09-01T12:00:00.000Z", 17)] };
      }
      const y = opts.startDate.slice(0, 4);
      if (y === "2017") {
        return {
          ok: true as const,
          data: [
            sample("2017-06-10T10:00:00.000Z", 18.8),
            sample("2017-06-10T14:00:00.000Z", 19.5),
            sample("2017-06-10T18:00:00.000Z", 19.6),
          ],
        };
      }
      if (y === "2024") {
        return {
          ok: true as const,
          data: [
            sample("2024-10-17T12:00:00.000Z", 21.0),
            sample("2024-10-18T12:00:00.000Z", 20.2),
            sample("2024-10-20T12:00:00.000Z", 21.1),
          ],
        };
      }
      if (y === "2025") {
        return { ok: true as const, data: [sample("2025-04-08T12:00:00.000Z", 20.6)] };
      }
      if (y === "2026") {
        return { ok: true as const, data: [sample("2026-07-28T12:00:00.000Z", 17.2)] };
      }
      return { ok: true as const, data: [] };
    };

    const deps = {
      nowIso: () => "2026-09-21T12:00:00.000Z",
      pullBodyCompositionSamples: pull,
      ingestRawEvent: async (
        _body: unknown,
        _token: string,
        opts: { idempotencyKey: string },
      ) => {
        if (ingestedKeys.has(opts.idempotencyKey)) {
          return { ok: true as const };
        }
        ingestedKeys.add(opts.idempotencyKey);
        return { ok: true as const };
      },
      appleHealthBodyWeightIdempotencyKey: ({ observedAtIso }: { observedAtIso: string }) =>
        `w:${observedAtIso}`,
      appleHealthBodyCompositionIdempotencyKey: ({
        observedAtIso,
        metric,
      }: {
        observedAtIso: string;
        metric: string;
      }) => `c:${metric}:${observedAtIso}`,
      getDeviceTimezone: () => "UTC",
      getBackfillState: async () => state,
      setBackfillState: async (next: AppleHealthBodyFatBackfillStateV1) => {
        state = next;
      },
    };

    const first = await runAppleHealthBodyFatHistoryImport(
      { token: "tok", chunkDays: 400 },
      deps,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.oldestHealthKitObservedAt).toBe("2017-06-10T10:00:00.000Z");
    expect(state?.status).toBe("completed");
    const keysAfterFirst = ingestedKeys.size;

    const second = await runAppleHealthBodyFatHistoryImport({ token: "tok", chunkDays: 400 }, deps);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.status).toBe("already_completed");
    expect(ingestedKeys.size).toBe(keysAfterFirst);
  });

  it("isolates checkpoint by uid storage key usage", () => {
    expect(appleHealthBodyFatBackfillStateKey("uid-a")).toBe(
      "appleHealth:bodyFatBackfillState:uid-a",
    );
    expect(appleHealthBodyFatBackfillStateKey("uid-b")).not.toBe(
      appleHealthBodyFatBackfillStateKey("uid-a"),
    );
  });
});
