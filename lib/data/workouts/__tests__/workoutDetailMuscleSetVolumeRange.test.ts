import {
  WORKOUT_MUSCLE_SET_VOLUME_RANGE_BOUNDS,
  workoutMuscleSetVolumeRangeFromSetCount,
  workoutMuscleSetVolumeRangeProgress01,
} from "@/lib/data/workouts/workoutDetailMuscleSetVolumeRange";

describe("workoutDetailMuscleSetVolumeRange", () => {
  it("maps set counts to volume range tiers", () => {
    expect(workoutMuscleSetVolumeRangeFromSetCount(0)).toBe("low");
    expect(workoutMuscleSetVolumeRangeFromSetCount(1)).toBe("low");
    expect(workoutMuscleSetVolumeRangeFromSetCount(WORKOUT_MUSCLE_SET_VOLUME_RANGE_BOUNDS.lowMax)).toBe("low");
    expect(workoutMuscleSetVolumeRangeFromSetCount(4)).toBe("moderate");
    expect(workoutMuscleSetVolumeRangeFromSetCount(7)).toBe("high");
    expect(workoutMuscleSetVolumeRangeFromSetCount(11)).toBe("very_high");
  });

  it("returns monotonic progress within and across tiers", () => {
    expect(workoutMuscleSetVolumeRangeProgress01(0)).toBe(0);
    expect(workoutMuscleSetVolumeRangeProgress01(1)).toBeLessThan(workoutMuscleSetVolumeRangeProgress01(3));
    expect(workoutMuscleSetVolumeRangeProgress01(4)).toBeGreaterThan(0.25);
    expect(workoutMuscleSetVolumeRangeProgress01(7)).toBeGreaterThan(0.5);
    expect(workoutMuscleSetVolumeRangeProgress01(20)).toBe(1);
  });
});
