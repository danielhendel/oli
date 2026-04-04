import { describe, expect, it } from "@jest/globals";
import { countStrengthWorkoutPayloadExercises } from "../manualStrengthDurability";

describe("manualStrengthDurability", () => {
  it("countStrengthWorkoutPayloadExercises returns exercise array length", () => {
    expect(
      countStrengthWorkoutPayloadExercises({
        exercises: [{ name: "a", sets: [] }, { name: "b", sets: [] }],
      }),
    ).toBe(2);
    expect(countStrengthWorkoutPayloadExercises(null)).toBe(0);
    expect(countStrengthWorkoutPayloadExercises({})).toBe(0);
  });
});
