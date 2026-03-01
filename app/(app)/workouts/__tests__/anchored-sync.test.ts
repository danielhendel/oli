/**
 * W2.2 — Anchored sync determinism: anchor only updates on full success;
 * not updated when ingest fails or when result set is truncated (length === limit).
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

  it("does not call setWorkoutsAnchor when workouts length equals ANCHOR_LIMIT (truncation)", async () => {
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

    const deps = baseDeps({ pullAnchoredWorkouts: mockPullAnchored });

    const result = await runAnchoredWorkoutsSync(
      { uid: "u1", token: "tok", limit: ANCHOR_LIMIT },
      deps,
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("limit");
    expect(mockSetWorkoutsAnchor).not.toHaveBeenCalled();
  });
});
