import { describe, expect, it } from "@jest/globals";
import {
  displayLabelForAppleHealthKitWorkoutActivityType,
  HK_WORKOUT_ACTIVITY_TYPE_OTHER,
} from "@/lib/data/workouts/appleHealthKitWorkoutActivityType";

describe("displayLabelForAppleHealthKitWorkoutActivityType", () => {
  it("maps Walking and Running ids to user-facing labels", () => {
    expect(displayLabelForAppleHealthKitWorkoutActivityType(52)).toBe("Walking");
    expect(displayLabelForAppleHealthKitWorkoutActivityType(37)).toBe("Running");
    expect(displayLabelForAppleHealthKitWorkoutActivityType(13)).toBe("Cycling");
  });

  it("returns null for Other and unknown ids", () => {
    expect(displayLabelForAppleHealthKitWorkoutActivityType(HK_WORKOUT_ACTIVITY_TYPE_OTHER)).toBe(null);
    expect(displayLabelForAppleHealthKitWorkoutActivityType(999_999)).toBe(null);
    expect(displayLabelForAppleHealthKitWorkoutActivityType(null)).toBe(null);
  });
});
