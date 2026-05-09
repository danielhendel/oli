import { classifyWorkoutType, deriveWorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

function workout(overrides: Partial<WorkoutHistoryItem>): WorkoutHistoryItem {
  return {
    id: "w",
    observedAt: "2026-03-01T12:00:00.000Z",
    sourceId: "apple_health",
    title: "Workout",
    start: null,
    end: null,
    durationMinutes: null,
    calories: null,
    hk: null,
    ...overrides,
  };
}

describe("deriveWorkoutMarkerFlags", () => {
  it("classifies TraditionalStrengthTraining as strength", () => {
    expect(
      classifyWorkoutType({
        rawKind: "workout",
        sport: "TraditionalStrengthTraining",
      }),
    ).toBe("strength");
  });

  it("classifies Strength Training as strength", () => {
    expect(
      classifyWorkoutType({
        rawKind: "workout",
        title: "Strength Training",
      }),
    ).toBe("strength");
  });

  it("classifies Running as cardio", () => {
    expect(
      classifyWorkoutType({
        rawKind: "workout",
        sport: "Running",
      }),
    ).toBe("cardio");
  });

  it("classifies Indoor Walk compact token as cardio", () => {
    expect(
      classifyWorkoutType({
        rawKind: "workout",
        sport: "Indoor Walk",
      }),
    ).toBe("cardio");
  });

  it("classifies Outdoor Run compact token as cardio", () => {
    expect(
      classifyWorkoutType({
        rawKind: "workout",
        sport: "Outdoor Run",
      }),
    ).toBe("cardio");
  });

  it("does not classify generic Other without distance as cardio", () => {
    expect(
      classifyWorkoutType({
        rawKind: "workout",
        title: "Other",
        sport: "Other",
        activityName: "Other",
        hkActivityId: 3000,
      }),
    ).toBeUndefined();
  });

  it("marks strength-only days", () => {
    expect(deriveWorkoutMarkerFlags([workout({ workoutType: "strength" })])).toEqual({
      hasStrength: true,
      hasCardio: false,
    });
  });

  it("marks cardio-only days", () => {
    expect(deriveWorkoutMarkerFlags([workout({ workoutType: "cardio" })])).toEqual({
      hasStrength: false,
      hasCardio: true,
    });
  });

  it("marks mixed days", () => {
    expect(
      deriveWorkoutMarkerFlags([
        workout({ id: "s", workoutType: "strength" }),
        workout({ id: "c", workoutType: "cardio" }),
      ]),
    ).toEqual({
      hasStrength: true,
      hasCardio: true,
    });
  });
});
