import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  computeDurationWeightedAverageHeartRateBpmFromSessions,
  resolveStrengthTodayAverageHeartRateBpm,
} from "@/lib/data/workouts/resolveStrengthTodayAverageHeartRateBpm";

function session(
  workouts: {
    durationMinutes: number | null;
    averageHeartRateBpm?: number;
  }[],
): ReconciledWorkoutSession {
  return {
    id: "session-1",
    day: "2026-06-02",
    sessionType: "strength",
    title: "Strength",
    titleSource: "provider",
    start: "2026-06-02T09:00:00.000Z",
    end: "2026-06-02T10:00:00.000Z",
    durationMinutes: 60,
    calories: null,
    workouts: workouts.map((w, i) => ({
      id: `w${i}`,
      observedAt: "2026-06-02T09:00:00.000Z",
      sourceId: "apple_health",
      title: "Strength",
      start: "2026-06-02T09:00:00.000Z",
      end: "2026-06-02T10:00:00.000Z",
      durationMinutes: w.durationMinutes,
      calories: null,
      ...(w.averageHeartRateBpm != null ? { averageHeartRateBpm: w.averageHeartRateBpm } : {}),
    })) as ReconciledWorkoutSession["workouts"],
    sourceSummaries: [],
    sourceCount: 1,
  };
}

describe("computeDurationWeightedAverageHeartRateBpmFromSessions", () => {
  it("returns null when no workouts have avg HR + positive duration", () => {
    expect(
      computeDurationWeightedAverageHeartRateBpmFromSessions([
        session([{ durationMinutes: 50 }]),
      ]),
    ).toBeNull();
  });

  it("duration-weights across multiple sessions", () => {
    const s1 = session([{ durationMinutes: 60, averageHeartRateBpm: 100 }]);
    const s2 = session([{ durationMinutes: 30, averageHeartRateBpm: 120 }]);
    // (100*60 + 120*30) / 90 = 106.666...
    const avg = computeDurationWeightedAverageHeartRateBpmFromSessions([s1, s2]);
    expect(avg).toBeCloseTo(106.67, 1);
  });
});

describe("resolveStrengthTodayAverageHeartRateBpm", () => {
  it("prefers hydrated session physiology over DailyFacts", () => {
    const avg = resolveStrengthTodayAverageHeartRateBpm({
      todayStrengthSessions: [session([{ durationMinutes: 50, averageHeartRateBpm: 108 }])],
      dailyFactsAverageHeartRateBpm: 98,
    });
    expect(avg).toBe(108);
  });

  it("falls back to DailyFacts when sessions lack avg HR", () => {
    const avg = resolveStrengthTodayAverageHeartRateBpm({
      todayStrengthSessions: [session([{ durationMinutes: 50 }])],
      dailyFactsAverageHeartRateBpm: 98,
    });
    expect(avg).toBe(98);
  });

  it("returns null when neither source has avg HR", () => {
    expect(
      resolveStrengthTodayAverageHeartRateBpm({
        todayStrengthSessions: [session([{ durationMinutes: 50 }])],
        dailyFactsAverageHeartRateBpm: undefined,
      }),
    ).toBeNull();
  });
});
