import { computeStrengthMetricsFromExercises } from "@/lib/workouts/journal/manualWorkoutSummary";

describe("manualWorkoutSummary metrics", () => {
  it("computes total volume and avg intensity across exercises/sets", () => {
    const out = computeStrengthMetricsFromExercises([
      {
        name: "bench press",
        sets: [
          { setNumber: 1, reps: 10, weightKg: 60, intensity: 8 },
          { setNumber: 2, reps: 8, weightKg: 70, intensity: 9 },
        ],
      },
      {
        name: "row",
        sets: [{ setNumber: 1, reps: 12, weightKg: 40, intensity: 7 }],
      },
    ]);
    expect(out.totalVolume).toBe(1640);
    expect(out.avgIntensity).toBe(8);
  });

  it("skips missing intensity and invalid volume fields", () => {
    const out = computeStrengthMetricsFromExercises([
      {
        name: "bench",
        sets: [
          { setNumber: 1, reps: 10, weightKg: null, intensity: null },
          { setNumber: 2, reps: null, weightKg: 30, intensity: 8 },
          { setNumber: 3, reps: 5, weightKg: 50, intensity: null },
        ],
      },
    ]);
    expect(out.totalVolume).toBe(250);
    expect(out.avgIntensity).toBe(8);
  });

  it("returns null avgIntensity when no intensity values", () => {
    const out = computeStrengthMetricsFromExercises([
      { name: "squat", sets: [{ setNumber: 1, reps: 5, weightKg: 80, intensity: null }] },
    ]);
    expect(out.totalVolume).toBe(400);
    expect(out.avgIntensity).toBeNull();
  });

  it("returns null totalVolume when no valid reps*weight sets", () => {
    const out = computeStrengthMetricsFromExercises([
      { name: "press", sets: [{ setNumber: 1, reps: null, weightKg: 80, intensity: null }] },
    ]);
    expect(out.totalVolume).toBeNull();
    expect(out.avgIntensity).toBeNull();
  });
});
