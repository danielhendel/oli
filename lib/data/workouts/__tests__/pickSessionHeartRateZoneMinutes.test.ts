import { pickSessionHeartRateZoneMinutes } from "@/lib/data/workouts/pickSessionHeartRateZoneMinutes";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";

function buildSession(
  workouts: { id: string; heartRateZoneMinutes?: readonly number[] | null }[],
): ReconciledWorkoutSession {
  return {
    id: "session-1",
    day: "2026-03-12",
    sessionType: "strength",
    title: "Upper Body",
    titleSource: "provider",
    start: "2026-03-12T08:00:00.000Z",
    end: "2026-03-12T08:34:00.000Z",
    durationMinutes: 34,
    calories: null,
    workouts: workouts.map((w) => ({
      id: w.id,
      title: "Strength",
      durationMinutes: 34,
      observedAt: "2026-03-12T08:00:00.000Z",
      start: "2026-03-12T08:00:00.000Z",
      end: "2026-03-12T08:34:00.000Z",
      calories: null,
      ...(w.heartRateZoneMinutes != null
        ? { heartRateZoneMinutes: w.heartRateZoneMinutes }
        : {}),
    })) as ReconciledWorkoutSession["workouts"],
    sourceSummaries: [],
    sourceCount: 1,
  };
}

describe("pickSessionHeartRateZoneMinutes", () => {
  it("returns null for null/undefined session", () => {
    expect(pickSessionHeartRateZoneMinutes(null)).toBeNull();
    expect(pickSessionHeartRateZoneMinutes(undefined)).toBeNull();
  });

  it("returns null when no workout carries a tuple", () => {
    expect(pickSessionHeartRateZoneMinutes(buildSession([{ id: "w1" }]))).toBeNull();
  });

  it("returns the first valid tuple in workout order", () => {
    const tuple = [32.816, 1.183, 0, 0, 0] as const;
    expect(
      pickSessionHeartRateZoneMinutes(
        buildSession([{ id: "w1", heartRateZoneMinutes: tuple }]),
      ),
    ).toEqual(tuple);
  });

  it("skips workouts with invalid tuples and picks the next valid one", () => {
    expect(
      pickSessionHeartRateZoneMinutes(
        buildSession([
          { id: "w1", heartRateZoneMinutes: [1, 2, 3] }, // invalid length
          { id: "w2", heartRateZoneMinutes: [10, 5, 2, 1, 0] },
        ]),
      ),
    ).toEqual([10, 5, 2, 1, 0]);
  });

  it("returns null when all candidate tuples are malformed", () => {
    expect(
      pickSessionHeartRateZoneMinutes(
        buildSession([
          { id: "w1", heartRateZoneMinutes: [1, 2, 3, Number.NaN, 5] },
          { id: "w2", heartRateZoneMinutes: [-1, 0, 0, 0, 0] },
        ]),
      ),
    ).toBeNull();
  });
});
