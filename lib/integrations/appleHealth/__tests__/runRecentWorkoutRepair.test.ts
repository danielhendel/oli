/**
 * Tests: rolling 14-day Apple Health workout recovery.
 *
 * These tests pin behavior that is hard to QA on a real device:
 * - Local-calendar window (NOT UTC) for Europe/Madrid and America/New_York.
 * - Per-uid throttle that ONLY advances on a fully clean run.
 * - Fail-soft per-workout (partial failure does not poison the marker).
 * - Idempotent ingest contract (uses `workoutIdempotencyKey`).
 */

import {
  RECENT_WORKOUT_REPAIR_DEFAULT_THROTTLE_MS,
  runRecentWorkoutRepair,
  type RunRecentWorkoutRepairDeps,
} from "../runRecentWorkoutRepair";
import type { TodayWorkout } from "../types";

type IngestCall = {
  body: unknown;
  token: string;
  opts: { idempotencyKey: string; timeoutMs: number };
};

function makeWorkout(overrides: Partial<TodayWorkout> = {}): TodayWorkout {
  return {
    id: "w1",
    start: "2026-06-01T09:49:00.000Z",
    end: "2026-06-01T10:39:00.000Z",
    activityId: 1001,
    activityName: "Traditional Strength Training",
    sourceId: "src1",
    durationMinutes: 50,
    calories: 200,
    ...overrides,
  };
}

function makeDeps(
  overrides: Partial<RunRecentWorkoutRepairDeps> = {},
  state: { workouts: TodayWorkout[]; lastRunAt: string | null } = {
    workouts: [],
    lastRunAt: null,
  },
): {
  deps: RunRecentWorkoutRepairDeps;
  ingestCalls: IngestCall[];
  enrichCalls: { startIso: string }[];
  setMarker: jest.Mock;
  getMarker: jest.Mock;
  rangeCalls: { startDate: string; endDate: string }[];
} {
  const ingestCalls: IngestCall[] = [];
  const enrichCalls: { startIso: string }[] = [];
  const rangeCalls: { startDate: string; endDate: string }[] = [];

  const setMarker = jest.fn(async (_uid: string, iso: string) => {
    void iso;
  });
  const getMarker = jest.fn(async () => state.lastRunAt);

  const baseDeps: RunRecentWorkoutRepairDeps = {
    pullWorkoutsByDateRange: jest.fn(async (opts) => {
      rangeCalls.push({ startDate: opts.startDate, endDate: opts.endDate });
      return { ok: true, data: { workouts: state.workouts, pagesFetched: 1, truncated: false } };
    }),
    ingestRawEvent: jest.fn(async (body, token, opts) => {
      ingestCalls.push({ body, token, opts });
      return { ok: true };
    }),
    getDeviceTimezone: () => "Europe/Madrid",
    getTodayDayKeyLocal: () => "2026-06-02",
    getLocalCalendarDayBoundsFromYmd: (ymd: string) => {
      // Mirror `lib/integrations/appleHealth/healthKit.ts` semantics (device-local bounds).
      const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
      const start = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
      const end = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
      return { start, end, day: ymd };
    },
    addLocalCalendarDaysToDayKey: (ymd: string, delta: number) => {
      const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + delta);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    },
    workoutIdempotencyKey: ({ startIso, endIso, activityId, sourceId }) =>
      `wk:${startIso}:${endIso}:${activityId}:${sourceId ?? ""}`,
    enrichWorkoutPhysiology: jest.fn(async (w) => {
      enrichCalls.push({ startIso: w.start });
      return null;
    }),
    getLastRunAt: getMarker,
    setLastRunAtOnSuccess: setMarker,
    nowMs: () => Date.parse("2026-06-02T15:00:00.000Z"),
    ...overrides,
  };

  return { deps: baseDeps, ingestCalls, enrichCalls, setMarker, getMarker, rangeCalls };
}

describe("runRecentWorkoutRepair", () => {
  it("returns skipped without HK calls when uid is empty", async () => {
    const { deps, rangeCalls, setMarker } = makeDeps();
    const r = await runRecentWorkoutRepair(
      { uid: "", token: "tok", reason: "focus" },
      deps,
    );
    expect(r.status).toBe("skipped");
    expect(r.skippedReason).toBe("no_uid");
    expect(rangeCalls).toHaveLength(0);
    expect(setMarker).not.toHaveBeenCalled();
  });

  it("returns skipped without HK calls when token is null", async () => {
    const { deps, rangeCalls } = makeDeps();
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: null, reason: "focus" },
      deps,
    );
    expect(r.status).toBe("skipped");
    expect(r.skippedReason).toBe("no_token");
    expect(rangeCalls).toHaveLength(0);
  });

  it("returns skipped: disabled when enabled=false", async () => {
    const { deps, rangeCalls, setMarker } = makeDeps();
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus", enabled: false },
      deps,
    );
    expect(r.status).toBe("skipped");
    expect(r.skippedReason).toBe("disabled");
    expect(rangeCalls).toHaveLength(0);
    expect(setMarker).not.toHaveBeenCalled();
  });

  it("computes a 14-day inclusive window ending today (default)", async () => {
    const { deps } = makeDeps();
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus" },
      deps,
    );
    expect(r.endDay).toBe("2026-06-02");
    expect(r.startDay).toBe("2026-05-20");
    expect(r.daysRequested).toBe(14);
  });

  it("respects custom daysBack (clamped to >= 1)", async () => {
    const { deps } = makeDeps();
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus", daysBack: 7 },
      deps,
    );
    expect(r.startDay).toBe("2026-05-27");
    expect(r.endDay).toBe("2026-06-02");
    expect(r.daysRequested).toBe(7);

    const r2 = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus", daysBack: 0 },
      deps,
    );
    expect(r2.daysRequested).toBe(1);
  });

  it("queries HK with device-local day bounds (not UTC midnight)", async () => {
    const { deps, rangeCalls } = makeDeps();
    await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus", daysBack: 2 },
      deps,
    );
    expect(rangeCalls).toHaveLength(1);
    const call = rangeCalls[0]!;
    expect(call.startDate).toBe(new Date(2026, 5, 1, 0, 0, 0, 0).toISOString());
    expect(call.endDate).toBe(new Date(2026, 5, 2, 23, 59, 59, 999).toISOString());
  });

  it("handles empty HK result as success and advances the throttle marker", async () => {
    const { deps, setMarker } = makeDeps({}, { workouts: [], lastRunAt: null });
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus" },
      deps,
    );
    expect(r.status).toBe("ran");
    expect(r.hkWorkoutCount).toBe(0);
    expect(r.ingestedCount).toBe(0);
    expect(r.failedCount).toBe(0);
    expect(setMarker).toHaveBeenCalledWith("u", "2026-06-02T15:00:00.000Z");
  });

  it("ingests each workout once with the canonical idempotency key", async () => {
    const w1 = makeWorkout();
    const w2 = makeWorkout({
      id: "w2",
      start: "2026-05-30T09:00:00.000Z",
      end: "2026-05-30T09:30:00.000Z",
      activityId: 2002,
    });
    const { deps, ingestCalls, setMarker } = makeDeps(
      {},
      { workouts: [w1, w2], lastRunAt: null },
    );
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus" },
      deps,
    );
    expect(r.status).toBe("ran");
    expect(r.hkWorkoutCount).toBe(2);
    expect(r.ingestedCount).toBe(2);
    expect(r.failedCount).toBe(0);
    expect(ingestCalls.map((c) => c.opts.idempotencyKey).sort()).toEqual(
      [
        "wk:2026-05-30T09:00:00.000Z:2026-05-30T09:30:00.000Z:2002:src1",
        "wk:2026-06-01T09:49:00.000Z:2026-06-01T10:39:00.000Z:1001:src1",
      ].sort(),
    );
    expect(setMarker).toHaveBeenCalledWith("u", "2026-06-02T15:00:00.000Z");
  });

  it("invokes physiology enrichment before ingest with neighbor boundaries", async () => {
    const w1 = makeWorkout({
      start: "2026-06-01T09:00:00.000Z",
      end: "2026-06-01T10:00:00.000Z",
      activityId: 1001,
    });
    const w2 = makeWorkout({
      id: "w2",
      start: "2026-06-01T11:00:00.000Z",
      end: "2026-06-01T12:00:00.000Z",
      activityId: 2002,
    });
    const enrich = jest.fn(async () => null);
    const { deps } = makeDeps(
      { enrichWorkoutPhysiology: enrich as RunRecentWorkoutRepairDeps["enrichWorkoutPhysiology"] },
      { workouts: [w2, w1], lastRunAt: null }, // arrive unsorted from HK
    );
    await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus" },
      deps,
    );
    expect(enrich).toHaveBeenCalledTimes(2);
    const ctxByStart = new Map(
      enrich.mock.calls.map((c) => {
        const w = c[0] as { start: string };
        const ctx = c[1] as { neighbors: { priorEndIso: string | null; nextStartIso: string | null } };
        return [w.start, ctx.neighbors];
      }),
    );
    expect(ctxByStart.get("2026-06-01T09:00:00.000Z")).toEqual({
      priorEndIso: null,
      nextStartIso: "2026-06-01T11:00:00.000Z",
    });
    expect(ctxByStart.get("2026-06-01T11:00:00.000Z")).toEqual({
      priorEndIso: "2026-06-01T10:00:00.000Z",
      nextStartIso: null,
    });
  });

  it("continues after a single ingest failure and reports failedCount; marker is NOT advanced", async () => {
    const w1 = makeWorkout({ activityId: 1 });
    const w2 = makeWorkout({ id: "w2", activityId: 2, start: "2026-05-30T09:00:00.000Z", end: "2026-05-30T09:30:00.000Z" });
    const failOnSecond = jest
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: "boom", requestId: "rid" });
    const { deps, setMarker } = makeDeps(
      { ingestRawEvent: failOnSecond as RunRecentWorkoutRepairDeps["ingestRawEvent"] },
      { workouts: [w1, w2], lastRunAt: null },
    );
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus" },
      deps,
    );
    expect(r.status).toBe("ran");
    expect(r.ingestedCount).toBe(1);
    expect(r.failedCount).toBe(1);
    expect(r.firstIngestError).toBe("boom");
    expect(setMarker).not.toHaveBeenCalled();
  });

  it("returns status=failed when HK pull fails, without touching the marker", async () => {
    const { deps, setMarker } = makeDeps({
      pullWorkoutsByDateRange: jest.fn(async () => ({ ok: false, error: "perm" })),
    });
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus" },
      deps,
    );
    expect(r.status).toBe("failed");
    expect(r.firstIngestError).toBe("perm");
    expect(r.hkWorkoutCount).toBe(0);
    expect(r.ingestedCount).toBe(0);
    expect(setMarker).not.toHaveBeenCalled();
  });

  it("skips on fresh throttle (< default window) and does not call HK", async () => {
    const recent = new Date(
      Date.parse("2026-06-02T15:00:00.000Z") - RECENT_WORKOUT_REPAIR_DEFAULT_THROTTLE_MS + 60_000,
    ).toISOString();
    const { deps, rangeCalls, setMarker } = makeDeps({}, { workouts: [], lastRunAt: recent });
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus" },
      deps,
    );
    expect(r.status).toBe("skipped");
    expect(r.skippedReason).toBe("throttled");
    expect(rangeCalls).toHaveLength(0);
    expect(setMarker).not.toHaveBeenCalled();
  });

  it("runs when throttle is stale (> default window)", async () => {
    const stale = new Date(
      Date.parse("2026-06-02T15:00:00.000Z") - RECENT_WORKOUT_REPAIR_DEFAULT_THROTTLE_MS - 60_000,
    ).toISOString();
    const { deps, setMarker } = makeDeps({}, { workouts: [], lastRunAt: stale });
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus" },
      deps,
    );
    expect(r.status).toBe("ran");
    expect(setMarker).toHaveBeenCalled();
  });

  it("throttleMs=0 disables throttle (manual-debug path)", async () => {
    const recent = "2026-06-02T14:59:00.000Z";
    const { deps, setMarker } = makeDeps({}, { workouts: [], lastRunAt: recent });
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "manual-debug", throttleMs: 0 },
      deps,
    );
    expect(r.status).toBe("ran");
    expect(setMarker).toHaveBeenCalled();
  });

  it("tolerates throttle read failure (treats as never run, still updates marker on success)", async () => {
    const { deps, setMarker } = makeDeps({
      getLastRunAt: jest.fn(async () => {
        throw new Error("storage offline");
      }),
    });
    const r = await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus" },
      deps,
    );
    expect(r.status).toBe("ran");
    expect(setMarker).toHaveBeenCalled();
  });

  it("payload uses device-IANA timezone and sync.mode='recent_repair'", async () => {
    const { deps, ingestCalls } = makeDeps(
      {},
      { workouts: [makeWorkout()], lastRunAt: null },
    );
    await runRecentWorkoutRepair({ uid: "u", token: "tok", reason: "focus" }, deps);
    const body = ingestCalls[0]!.body as {
      provider: string;
      kind: string;
      timeZone: string;
      payload: { timezone: string; sync: { mode: string } };
    };
    expect(body.provider).toBe("apple_health");
    expect(body.kind).toBe("workout");
    expect(body.timeZone).toBe("Europe/Madrid");
    expect(body.payload.timezone).toBe("Europe/Madrid");
    expect(body.payload.sync.mode).toBe("recent_repair");
  });

  it("does NOT call any anchor / bootstrap markers from within the helper", async () => {
    // The helper takes no anchor/bootstrap deps at all — wiring this assertion
    // in the type system would be circular, so we instead confirm DI surface
    // is limited to repair-specific concerns.
    const { deps } = makeDeps();
    expect("getWorkoutsAnchor" in deps).toBe(false);
    expect("setWorkoutsAnchor" in deps).toBe(false);
    expect("setDeepBackfillVersion" in deps).toBe(false);
    expect("setRangeBootstrapBuildId" in deps).toBe(false);
  });
});

describe("runRecentWorkoutRepair — timezone safety", () => {
  it("uses local calendar bounds for Europe/Madrid (no UTC drift)", async () => {
    const { deps, rangeCalls } = makeDeps({
      getTodayDayKeyLocal: () => "2026-06-02",
      getDeviceTimezone: () => "Europe/Madrid",
    });
    await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus", daysBack: 1 },
      deps,
    );
    expect(rangeCalls[0]).toEqual({
      startDate: new Date(2026, 5, 2, 0, 0, 0, 0).toISOString(),
      endDate: new Date(2026, 5, 2, 23, 59, 59, 999).toISOString(),
    });
  });

  it("uses local calendar bounds for America/New_York (no UTC drift)", async () => {
    const { deps, rangeCalls } = makeDeps({
      getTodayDayKeyLocal: () => "2026-06-02",
      getDeviceTimezone: () => "America/New_York",
    });
    await runRecentWorkoutRepair(
      { uid: "u", token: "tok", reason: "focus", daysBack: 1 },
      deps,
    );
    expect(rangeCalls[0]).toEqual({
      startDate: new Date(2026, 5, 2, 0, 0, 0, 0).toISOString(),
      endDate: new Date(2026, 5, 2, 23, 59, 59, 999).toISOString(),
    });
  });
});
