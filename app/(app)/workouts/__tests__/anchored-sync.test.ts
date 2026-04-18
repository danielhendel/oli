/**
 * Anchored workouts sync: anchor advances only on full success; full batches ingest
 * and advance anchor so the next client pass can continue history backfill.
 */

import { runAnchoredWorkoutsSync } from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";
import type { RunAnchoredWorkoutsSyncDeps } from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";
import type { TodayWorkout } from "@/lib/integrations/appleHealth/types";

const ANCHOR_LIMIT = 500;

const mockSetWorkoutsAnchor = jest.fn(async () => {
  return;
});
const mockGetWorkoutsAnchor = jest.fn(async () => null);

const oneWorkout: TodayWorkout = {
  id: "w1",
  start: "2026-03-01T10:00:00.000Z",
  end: "2026-03-01T11:00:00.000Z",
  activityId: 1,
  activityName: "Running",
  sourceId: null,
  durationMinutes: 60,
  calories: 300,
};

function baseDeps(overrides: Partial<RunAnchoredWorkoutsSyncDeps> = {}): RunAnchoredWorkoutsSyncDeps {
  return {
    getWorkoutsAnchor: mockGetWorkoutsAnchor,
    setWorkoutsAnchor: mockSetWorkoutsAnchor,
    pullAnchoredWorkouts: jest.fn(),
    pullTodaySnapshot: jest.fn(),
    ingestRawEvent: jest.fn(),
    getTodayBounds: () => ({ start: "2026-03-01T00:00:00.000Z", end: "2026-03-01T23:59:59.999Z", day: "2026-03-01" }),
    getDeviceTimezone: () => "America/Los_Angeles",
    stepsIdempotencyKey: (day: string) => `steps:${day}`,
    workoutIdempotencyKey: () => "workout:key",
    ...overrides,
  };
}

describe("anchored sync determinism", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkoutsAnchor.mockResolvedValue(null);
  });

  it("still ingests workouts and advances anchor when pullTodaySnapshot fails", async () => {
    const mockPullAnchored = jest.fn().mockResolvedValue({
      ok: true,
      data: { workouts: [oneWorkout], anchor: "next-anchor" },
    });
    const mockPullToday = jest.fn().mockResolvedValue({
      ok: false,
      error: "HealthKit snapshot failed",
    });
    const mockIngest = jest.fn().mockResolvedValue({ ok: true });

    const deps = baseDeps({
      pullAnchoredWorkouts: mockPullAnchored,
      pullTodaySnapshot: mockPullToday,
      ingestRawEvent: mockIngest,
    });

    const result = await runAnchoredWorkoutsSync(
      { uid: "u1", token: "tok", limit: ANCHOR_LIMIT },
      deps,
    );

    expect(result).toEqual({ ok: true, mayHaveMoreWorkouts: false });
    expect(mockSetWorkoutsAnchor).toHaveBeenCalledWith("u1", "next-anchor");
    expect(mockIngest).toHaveBeenCalledTimes(1);
    const workoutCall = (mockIngest as jest.Mock).mock.calls.find((c) => c[0]?.kind === "workout");
    expect(workoutCall).toBeDefined();
  });

  it("still ingests workouts and advances anchor when steps ingest fails", async () => {
    const mockPullAnchored = jest.fn().mockResolvedValue({
      ok: true,
      data: { workouts: [oneWorkout], anchor: "next-anchor" },
    });
    const mockPullToday = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        day: "2026-03-01",
        steps: 8000,
        exerciseMinutes: null,
        activeEnergyKcal: null,
        restingHeartRateBpm: null,
        workouts: [],
      },
    });
    const mockIngest = jest.fn(async (body: { kind?: string }) => {
      if (body?.kind === "steps") {
        return { ok: false, error: "steps ingest rejected", requestId: "req-steps" };
      }
      return { ok: true };
    });

    const deps = baseDeps({
      pullAnchoredWorkouts: mockPullAnchored,
      pullTodaySnapshot: mockPullToday,
      ingestRawEvent: mockIngest,
    });

    const result = await runAnchoredWorkoutsSync(
      { uid: "u1", token: "tok", limit: ANCHOR_LIMIT },
      deps,
    );

    expect(result).toEqual({ ok: true, mayHaveMoreWorkouts: false });
    expect(mockSetWorkoutsAnchor).toHaveBeenCalledWith("u1", "next-anchor");
    expect(mockIngest).toHaveBeenCalledTimes(2);
    expect((mockIngest as jest.Mock).mock.calls.some((c) => c[0]?.kind === "steps")).toBe(true);
    expect((mockIngest as jest.Mock).mock.calls.some((c) => c[0]?.kind === "workout")).toBe(true);
  });

  it("does not call setWorkoutsAnchor when workout ingest fails", async () => {
    const mockPullAnchored = jest.fn().mockResolvedValue({
      ok: true,
      data: { workouts: [oneWorkout], anchor: "next-anchor" },
    });
    const mockPullToday = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        day: "2026-03-01",
        steps: null,
        exerciseMinutes: null,
        activeEnergyKcal: null,
        restingHeartRateBpm: null,
        workouts: [],
      },
    });
    const mockIngest = jest.fn().mockResolvedValue({ ok: false, error: "Ingest failed", requestId: "req-1" });

    const deps = baseDeps({
      pullAnchoredWorkouts: mockPullAnchored,
      pullTodaySnapshot: mockPullToday,
      ingestRawEvent: mockIngest,
    });

    const result = await runAnchoredWorkoutsSync(
      { uid: "u1", token: "tok", limit: ANCHOR_LIMIT },
      deps,
    );

    expect(result.ok).toBe(false);
    expect(mockSetWorkoutsAnchor).not.toHaveBeenCalled();
  });

  it("ingests full limit batch, advances anchor, returns mayHaveMoreWorkouts true", async () => {
    const manyWorkouts: TodayWorkout[] = Array.from({ length: ANCHOR_LIMIT }, (_, i) => ({
      ...oneWorkout,
      id: `w${i}`,
      start: `2026-03-01T${String(10 + Math.floor(i / 60)).padStart(2, "0")}:00:00.000Z`,
      end: `2026-03-01T${String(11 + Math.floor(i / 60)).padStart(2, "0")}:00:00.000Z`,
    }));
    const mockPullAnchored = jest.fn().mockResolvedValue({
      ok: true,
      data: { workouts: manyWorkouts, anchor: "next-anchor" },
    });
    const mockPullToday = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        day: "2026-03-01",
        steps: null,
        exerciseMinutes: null,
        activeEnergyKcal: null,
        restingHeartRateBpm: null,
        workouts: [],
      },
    });
    const mockIngest = jest.fn().mockResolvedValue({ ok: true });

    const deps = baseDeps({
      pullAnchoredWorkouts: mockPullAnchored,
      pullTodaySnapshot: mockPullToday,
      ingestRawEvent: mockIngest,
    });

    const result = await runAnchoredWorkoutsSync(
      { uid: "u1", token: "tok", limit: ANCHOR_LIMIT },
      deps,
    );

    expect(result).toEqual({ ok: true, mayHaveMoreWorkouts: true });
    expect(mockSetWorkoutsAnchor).toHaveBeenCalledWith("u1", "next-anchor");
    expect(mockIngest).toHaveBeenCalledTimes(ANCHOR_LIMIT);
  });

  it("returns mayHaveMoreWorkouts false when batch smaller than limit", async () => {
    const mockPullAnchored = jest.fn().mockResolvedValue({
      ok: true,
      data: { workouts: [oneWorkout], anchor: "anchor-done" },
    });
    const mockPullToday = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        day: "2026-03-01",
        steps: null,
        exerciseMinutes: null,
        activeEnergyKcal: null,
        restingHeartRateBpm: null,
        workouts: [],
      },
    });
    const mockIngest = jest.fn().mockResolvedValue({ ok: true });

    const deps = baseDeps({
      pullAnchoredWorkouts: mockPullAnchored,
      pullTodaySnapshot: mockPullToday,
      ingestRawEvent: mockIngest,
    });

    const result = await runAnchoredWorkoutsSync(
      { uid: "u1", token: "tok", limit: ANCHOR_LIMIT },
      deps,
    );

    expect(result).toEqual({ ok: true, mayHaveMoreWorkouts: false });
    expect(mockSetWorkoutsAnchor).toHaveBeenCalledWith("u1", "anchor-done");
    expect(mockIngest).toHaveBeenCalledTimes(1);
  });

  it("includes distanceMeters on workout ingest payload when pull provides it", async () => {
    const withDistance: TodayWorkout = { ...oneWorkout, distanceMeters: 1609.344 };
    const mockPullAnchored = jest.fn().mockResolvedValue({
      ok: true,
      data: { workouts: [withDistance], anchor: "anchor-done" },
    });
    const mockPullToday = jest.fn().mockResolvedValue({
      ok: true,
      data: {
        day: "2026-03-01",
        steps: null,
        exerciseMinutes: null,
        activeEnergyKcal: null,
        restingHeartRateBpm: null,
        workouts: [],
      },
    });
    const mockIngest = jest.fn().mockResolvedValue({ ok: true });

    const deps = baseDeps({
      pullAnchoredWorkouts: mockPullAnchored,
      pullTodaySnapshot: mockPullToday,
      ingestRawEvent: mockIngest,
    });

    await runAnchoredWorkoutsSync({ uid: "u1", token: "tok", limit: ANCHOR_LIMIT }, deps);

    const workoutCall = (mockIngest as jest.Mock).mock.calls.find(
      (c) => c[0]?.kind === "workout",
    );
    expect(workoutCall).toBeDefined();
    expect(workoutCall![0].payload.distanceMeters).toBe(1609.344);
  });
});
