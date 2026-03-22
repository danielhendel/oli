/**
 * Bounded backfill orchestration: chains runAnchoredWorkoutsSync, stops safely.
 */

import {
  DEFAULT_WORKOUT_BACKFILL_MAX_PASSES,
  DEFAULT_WORKOUT_BOOTSTRAP_MAX_PAGES,
  emptyWorkoutHistoryBootstrapSummary,
  runWorkoutHistoryBackfillPasses,
} from "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill";
import * as syncModule from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";
import type { RunWorkoutHistoryBackfillDeps } from "@/lib/integrations/appleHealth/runWorkoutHistoryBackfill";

const noopDeps = {
  ingestRawEvent: jest.fn(async () => ({ ok: true as const })),
  getDeviceTimezone: jest.fn(() => "UTC"),
  workoutIdempotencyKey: jest.fn(() => "wk"),
} as unknown as RunWorkoutHistoryBackfillDeps;

const EMPTY_BOOTSTRAP = emptyWorkoutHistoryBootstrapSummary();

describe("runWorkoutHistoryBackfillPasses", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("stops after one pass when mayHaveMoreWorkouts is false", async () => {
    const spy = jest.spyOn(syncModule, "runAnchoredWorkoutsSync").mockResolvedValue({
      ok: true,
      mayHaveMoreWorkouts: false,
    });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 3 },
      noopDeps,
    );

    expect(r).toEqual({
      ok: true,
      passesRun: 1,
      mayHaveMoreWorkouts: false,
      bootstrap: EMPTY_BOOTSTRAP,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("runs second pass when first indicates more history", async () => {
    const spy = jest
      .spyOn(syncModule, "runAnchoredWorkoutsSync")
      .mockResolvedValueOnce({ ok: true, mayHaveMoreWorkouts: true })
      .mockResolvedValueOnce({ ok: true, mayHaveMoreWorkouts: false });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 3 },
      noopDeps,
    );

    expect(r).toEqual({
      ok: true,
      passesRun: 2,
      mayHaveMoreWorkouts: false,
      bootstrap: EMPTY_BOOTSTRAP,
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("returns ok false without incrementing passesRun on first failure", async () => {
    const spy = jest.spyOn(syncModule, "runAnchoredWorkoutsSync").mockResolvedValue({
      ok: false,
      error: "pull failed",
      requestId: "r1",
    });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 3 },
      noopDeps,
    );

    expect(r).toEqual({ ok: false, error: "pull failed", requestId: "r1", passesRun: 0 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("returns ok false after successful pass when next pass fails", async () => {
    const spy = jest
      .spyOn(syncModule, "runAnchoredWorkoutsSync")
      .mockResolvedValueOnce({ ok: true, mayHaveMoreWorkouts: true })
      .mockResolvedValueOnce({ ok: false, error: "ingest failed", requestId: "r2" });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 3 },
      noopDeps,
    );

    expect(r).toEqual({ ok: false, error: "ingest failed", requestId: "r2", passesRun: 1 });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("caps at maxPasses and reports mayHaveMoreWorkouts true if still truncated", async () => {
    const spy = jest.spyOn(syncModule, "runAnchoredWorkoutsSync").mockResolvedValue({
      ok: true,
      mayHaveMoreWorkouts: true,
    });

    const r = await runWorkoutHistoryBackfillPasses(
      { uid: "u", token: "t", limit: 500, maxPasses: 2 },
      noopDeps,
    );

    expect(r).toEqual({
      ok: true,
      passesRun: 2,
      mayHaveMoreWorkouts: true,
      bootstrap: EMPTY_BOOTSTRAP,
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("defaults to twelve-month depth pass budget", async () => {
    const spy = jest.spyOn(syncModule, "runAnchoredWorkoutsSync").mockResolvedValue({
      ok: true,
      mayHaveMoreWorkouts: true,
    });
    const r = await runWorkoutHistoryBackfillPasses({ uid: "u", token: "t", limit: 500 }, noopDeps);
    expect(r).toEqual({
      ok: true,
      passesRun: DEFAULT_WORKOUT_BACKFILL_MAX_PASSES,
      mayHaveMoreWorkouts: true,
      bootstrap: EMPTY_BOOTSTRAP,
    });
    expect(spy).toHaveBeenCalledTimes(DEFAULT_WORKOUT_BACKFILL_MAX_PASSES);
    expect(DEFAULT_WORKOUT_BACKFILL_MAX_PASSES).toBeGreaterThan(30);
  });

  it("historical bootstrap ingests older workouts before anchored passes", async () => {
    const spy = jest.spyOn(syncModule, "runAnchoredWorkoutsSync").mockResolvedValue({
      ok: true,
      mayHaveMoreWorkouts: false,
    });
    const deps: RunWorkoutHistoryBackfillDeps = {
      ...noopDeps,
      pullWorkoutsByDateRange: jest.fn(async () => ({
        ok: true,
        data: {
          workouts: [
            {
              start: "2025-01-10T10:00:00.000Z",
              end: "2025-01-10T11:00:00.000Z",
              activityId: 1,
              activityName: "Strength",
              sourceId: "watch",
              durationMinutes: 60,
              calories: 200,
              distanceMeters: 3218.688,
            },
          ],
          pagesFetched: 1,
          truncated: false,
        },
      })),
    } as RunWorkoutHistoryBackfillDeps;
    const r = await runWorkoutHistoryBackfillPasses(
      {
        uid: "u",
        token: "t",
        limit: 500,
        bootstrapRange: {
          startDate: "2025-01-01T00:00:00.000Z",
          endDate: "2026-01-01T00:00:00.000Z",
        },
      },
      deps,
    );
    expect(r.ok).toBe(true);
    expect(r).toMatchObject({
      bootstrap: {
        attempted: true,
        workoutsIngested: 1,
        workoutsFetched: 1,
        pagesFetched: 1,
        truncated: false,
        nativeEarliestStart: "2025-01-10T10:00:00.000Z",
        nativeLatestStart: "2025-01-10T10:00:00.000Z",
        ingestAttempted: 1,
        ingestOk: 1,
        ingestFailed: 0,
      },
    });
    expect((deps.ingestRawEvent as jest.Mock)).toHaveBeenCalled();
    const workoutCall = (deps.ingestRawEvent as jest.Mock).mock.calls.find((c) => c[0]?.kind === "workout");
    expect(workoutCall?.[0]?.payload?.distanceMeters).toBe(3218.688);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("fails closed when bootstrap API is unavailable", async () => {
    const r = await runWorkoutHistoryBackfillPasses(
      {
        uid: "u",
        token: "t",
        limit: 500,
        bootstrapRange: {
          startDate: "2025-01-01T00:00:00.000Z",
          endDate: "2026-01-01T00:00:00.000Z",
        },
      },
      noopDeps,
    );
    expect(r).toEqual({
      ok: false,
      error: "Historical workout bootstrap is unavailable.",
      requestId: null,
      passesRun: 0,
    });
  });

  it("uses default bootstrap max pages when omitted", async () => {
    const pull = jest.fn(async () => ({
      ok: true as const,
      data: { workouts: [], pagesFetched: 1, truncated: false },
    }));
    const deps = { ...noopDeps, pullWorkoutsByDateRange: pull } as RunWorkoutHistoryBackfillDeps;
    jest.spyOn(syncModule, "runAnchoredWorkoutsSync").mockResolvedValue({
      ok: true,
      mayHaveMoreWorkouts: false,
    });
    await runWorkoutHistoryBackfillPasses(
      {
        uid: "u",
        token: "t",
        limit: 500,
        bootstrapRange: {
          startDate: "2025-01-01T00:00:00.000Z",
          endDate: "2026-01-01T00:00:00.000Z",
        },
      },
      deps,
    );
    expect(pull).toHaveBeenCalledWith(
      expect.objectContaining({ maxPages: DEFAULT_WORKOUT_BOOTSTRAP_MAX_PAGES }),
    );
  });
});
