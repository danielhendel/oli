import { deriveWorkoutStats } from "../workoutStats";

describe("deriveWorkoutStats", () => {
  it("computes totals for reps × weight", () => {
    const payload = {
      exercises: [
        { name: "Squat", sets: [{ reps: 5, weight: 135 }, { reps: 5, weight: 135 }] },
        { name: "Bench", sets: [{ reps: 8, weight: 85 }] },
      ],
    };
    const res = deriveWorkoutStats(payload);
    expect(res.totalSets).toBe(3);
    expect(res.totalVolumeKg).toBe(5 * 135 + 5 * 135 + 8 * 85);
  });

  it("is defensive for partial data", () => {
    const res = deriveWorkoutStats({ exercises: [{ name: "X", sets: [{}] }] });
    expect(res.totalSets).toBe(1);
    expect(res.totalVolumeKg).toBeUndefined();
  });

  it("returns zeros for empty payload", () => {
    const res = deriveWorkoutStats({});
    expect(res.totalSets).toBe(0);
  });
});
