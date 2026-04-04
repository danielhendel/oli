import { describe, expect, it } from "@jest/globals";
import {
  durableTitleOverrideMapToRecord,
  mergeWorkoutTitleOverrideListRow,
  type DurableTitleOverrideAccumulator,
  workoutTitleOverrideTieMs,
} from "@/lib/data/workouts/workoutTitleOverridesFromRaw";

describe("workoutTitleOverridesFromRaw", () => {
  it("workoutTitleOverrideTieMs prefers appliedAt over observedAt", () => {
    const ms = workoutTitleOverrideTieMs("2026-01-02T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
    expect(ms).toBe(Date.parse("2026-01-02T00:00:00.000Z"));
  });

  it("latest override wins for the same targetWorkoutId", () => {
    const acc: DurableTitleOverrideAccumulator = new Map();
    mergeWorkoutTitleOverrideListRow(acc, {
      kind: "workout_title_override",
      observedAt: "2026-01-01T12:00:00.000Z",
      payload: {
        targetWorkoutId: "w1",
        displayName: "First",
        appliedAt: "2026-01-01T10:00:00.000Z",
      },
    });
    mergeWorkoutTitleOverrideListRow(acc, {
      kind: "workout_title_override",
      observedAt: "2026-01-02T12:00:00.000Z",
      payload: {
        targetWorkoutId: "w1",
        displayName: "Second",
        appliedAt: "2026-01-02T11:00:00.000Z",
      },
    });
    expect(durableTitleOverrideMapToRecord(acc)).toEqual({ w1: "Second" });
  });

  it("ignores non-title-override rows", () => {
    const acc: DurableTitleOverrideAccumulator = new Map();
    mergeWorkoutTitleOverrideListRow(acc, {
      kind: "workout",
      observedAt: "2026-01-01T12:00:00.000Z",
      payload: { targetWorkoutId: "w1", displayName: "Nope", appliedAt: "2026-01-01T10:00:00.000Z" },
    });
    expect(durableTitleOverrideMapToRecord(acc)).toEqual({});
  });
});
