import {
  trainingVolumeKgForManualExercise,
  trainingVolumeKgForManualExercises,
  trainingVolumeKgForManualSet,
} from "@/lib/workouts/strength/strengthVolumeKg";
import { computeStrengthMetricsFromExercises } from "@/lib/workouts/journal/manualWorkoutSummary";

describe("trainingVolumeKg (canonical)", () => {
  it("counts reps × loadKg for a normal set", () => {
    expect(
      trainingVolumeKgForManualSet({ reps: 10, weightKg: 100, isWarmup: false }),
    ).toBe(1000);
  });

  it("excludes warmup sets", () => {
    expect(
      trainingVolumeKgForManualSet({ reps: 10, weightKg: 100, isWarmup: true }),
    ).toBe(0);
  });

  it("excludes zero load and invalid reps", () => {
    expect(trainingVolumeKgForManualSet({ reps: 10, weightKg: 0, isWarmup: false })).toBe(0);
    expect(trainingVolumeKgForManualSet({ reps: null, weightKg: 100, isWarmup: false })).toBe(0);
  });

  it("sums exercises and matches computeStrengthMetricsFromExercises totalVolume", () => {
    const exercises = [
      {
        exerciseId: "a",
        name: "A",
        sets: [
          { setNumber: 1, reps: 5, weightKg: 100, intensity: null, isWarmup: true },
          { setNumber: 2, reps: 5, weightKg: 100, intensity: null },
        ],
      },
      {
        exerciseId: "b",
        name: "B",
        sets: [{ setNumber: 1, reps: 10, weightKg: 50, intensity: null }],
      },
    ];
    const metrics = computeStrengthMetricsFromExercises(exercises);
    expect(metrics.totalVolume).toBe(1000);
    expect(trainingVolumeKgForManualExercises(exercises)).toBe(1000);
    expect(trainingVolumeKgForManualExercise(exercises[0]!)).toBe(500);
  });
});
