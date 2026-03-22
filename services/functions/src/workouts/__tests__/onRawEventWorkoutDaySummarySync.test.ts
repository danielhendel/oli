// services/functions/src/workouts/__tests__/onRawEventWorkoutDaySummarySync.test.ts
import { describe, it, expect } from "@jest/globals";
import { collectWorkoutUiDaysFromRawChange } from "../onRawEventWorkoutDaySummarySync";

describe("collectWorkoutUiDaysFromRawChange", () => {
  const workoutBase = {
    kind: "workout",
    observedAt: "2026-03-15T12:00:00.000Z",
    payload: { day: "2026-03-15" },
  };

  it("returns empty when neither side is a derivable workout raw", () => {
    expect(collectWorkoutUiDaysFromRawChange(undefined, { kind: "weight", observedAt: "2026-01-01T00:00:00.000Z" })).toEqual(
      [],
    );
  });

  it("returns one day when only after is workout", () => {
    expect(collectWorkoutUiDaysFromRawChange(undefined, { ...workoutBase })).toEqual(["2026-03-15"]);
  });

  it("returns one day when only before is workout (delete shape)", () => {
    expect(collectWorkoutUiDaysFromRawChange({ ...workoutBase }, undefined)).toEqual(["2026-03-15"]);
  });

  it("returns two distinct days when UI day moves between before and after", () => {
    const before = {
      ...workoutBase,
      payload: { timezone: "America/New_York", start: "2026-03-14T23:00:00.000Z" },
    };
    const after = {
      ...workoutBase,
      observedAt: "2026-03-16T12:00:00.000Z",
      payload: { timezone: "America/Los_Angeles", start: "2026-03-16T15:00:00.000Z" },
    };
    const days = collectWorkoutUiDaysFromRawChange(before, after);
    expect(days).toContain("2026-03-14");
    expect(days).toContain("2026-03-16");
    expect(days.length).toBe(2);
  });

  it("dedupes when before and after map to the same UI day", () => {
    const before = { ...workoutBase, payload: { day: "2026-03-15" } };
    const after = { ...workoutBase, payload: { day: "2026-03-15", calories: 100 } };
    expect(collectWorkoutUiDaysFromRawChange(before, after)).toEqual(["2026-03-15"]);
  });

  it("includes old day when kind changes from strength_workout to non-workout", () => {
    const before = {
      kind: "strength_workout",
      observedAt: "2026-05-01T10:00:00.000Z",
      payload: { day: "2026-05-01" },
    };
    const after = { kind: "weight", observedAt: "2026-05-01T10:00:00.000Z", payload: {} };
    expect(collectWorkoutUiDaysFromRawChange(before, after)).toEqual(["2026-05-01"]);
  });
});
