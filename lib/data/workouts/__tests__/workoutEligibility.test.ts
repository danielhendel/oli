import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import {
  classifyWorkoutHistoryItemEvidence,
  isEligibleCardioWorkout,
  isEligibleStrengthWorkout,
} from "@/lib/data/workouts/workoutEligibility";

function workout(overrides: Partial<WorkoutHistoryItem>): WorkoutHistoryItem {
  return {
    id: "w",
    observedAt: "2026-05-04T12:46:05.000Z",
    sourceId: "healthkit",
    provider: "apple_health",
    rawKind: "workout",
    title: "",
    start: "2026-05-04T12:46:05.000Z",
    end: "2026-05-04T13:44:39.000Z",
    durationMinutes: 59,
    calories: 354,
    ...overrides,
  };
}

describe("workoutEligibility", () => {
  it("excludes Apple Health Other without distance", () => {
    const item = workout({
      title: "Other",
      sport: "Other",
      activityName: "Other",
      hk: { sourceId: "com.myzonemoves.app.MYZONE", activityId: 3000 },
      distanceMeters: null,
    });
    expect(classifyWorkoutHistoryItemEvidence(item)).toBeUndefined();
    expect(isEligibleCardioWorkout(item)).toBe(false);
    expect(isEligibleStrengthWorkout(item)).toBe(false);
  });

  it("includes running, walking, and cycling cardio evidence", () => {
    const running = workout({
      title: "Running",
      hk: { sourceId: "healthkit", activityId: 37 },
      distanceMeters: 2600,
    });
    const walking = workout({
      title: "Walking",
      hk: { sourceId: "healthkit", activityId: 52 },
      distanceMeters: 1800,
    });
    const cycling = workout({
      title: "Cycling",
      sport: "Cycling",
      distanceMeters: 9000,
    });
    expect(isEligibleCardioWorkout(running)).toBe(true);
    expect(isEligibleCardioWorkout(walking)).toBe(true);
    expect(isEligibleCardioWorkout(cycling)).toBe(true);
  });

  it("keeps TraditionalStrengthTraining in strength", () => {
    const strength = workout({
      title: "TraditionalStrengthTraining",
      sport: "TraditionalStrengthTraining",
      hk: { sourceId: "healthkit", activityId: 50 },
    });
    expect(isEligibleCardioWorkout(strength)).toBe(false);
    expect(isEligibleStrengthWorkout(strength)).toBe(true);
    expect(classifyWorkoutHistoryItemEvidence(strength)).toBe("strength");
  });

  it("regresses 2026-05-04 08:46 hk 3000 Other fixture", () => {
    const fixture = workout({
      id: "appleHealth:v2:workout:2026-05-04T08:46:05.000-0400_2026-05-04T09:44:39.000-0400_3000_com.myzonemoves.app.MYZONE",
      observedAt: "2026-05-04T08:46:05.000-0400",
      start: "2026-05-04T08:46:05.000-0400",
      end: "2026-05-04T09:44:39.000-0400",
      title: "Other",
      sport: "Other",
      activityName: "Other",
      hk: { sourceId: "com.myzonemoves.app.MYZONE", activityId: 3000 },
      durationMinutes: 59,
      calories: 354,
      distanceMeters: null,
    });
    expect(isEligibleCardioWorkout(fixture)).toBe(false);
  });
});
