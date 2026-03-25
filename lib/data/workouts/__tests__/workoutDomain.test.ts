import {
  filterWorkoutHistoryItemsForDomain,
  mapWorkoutCalendarDaysForDomain,
  narrowWorkoutMarkerFlagsForDomain,
  resolveHistoryItemProductDomain,
} from "@/lib/data/workouts/workoutDomain";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

function item(overrides: Partial<WorkoutHistoryItem>): WorkoutHistoryItem {
  return {
    id: "w1",
    observedAt: "2026-03-01T12:00:00.000Z",
    sourceId: "apple_health",
    title: "Workout",
    start: null,
    end: null,
    durationMinutes: null,
    calories: null,
    ...overrides,
  };
}

describe("workoutDomain", () => {
  it("resolveHistoryItemProductDomain uses explicit workoutType", () => {
    expect(resolveHistoryItemProductDomain(item({ workoutType: "strength" }))).toBe("strength");
    expect(resolveHistoryItemProductDomain(item({ workoutType: "cardio" }))).toBe("cardio");
  });

  it("resolveHistoryItemProductDomain uses rawKind strength_workout", () => {
    expect(
      resolveHistoryItemProductDomain(
        item({ rawKind: "strength_workout", title: "", workoutType: undefined }),
      ),
    ).toBe("strength");
  });

  it("filterWorkoutHistoryItemsForDomain keeps only matching rows", () => {
    const rows = [
      item({ id: "a", workoutType: "strength" }),
      item({ id: "b", workoutType: "cardio" }),
    ];
    expect(filterWorkoutHistoryItemsForDomain(rows, "strength").map((r) => r.id)).toEqual(["a"]);
    expect(filterWorkoutHistoryItemsForDomain(rows, "cardio").map((r) => r.id)).toEqual(["b"]);
  });

  it("mapWorkoutCalendarDaysForDomain filters per day", () => {
    const days = [
      { day: "2026-03-01" as const, workouts: [item({ id: "s", workoutType: "strength" })] },
      {
        day: "2026-03-02" as const,
        workouts: [item({ id: "c", workoutType: "cardio" })],
      },
    ];
    const strengthDays = mapWorkoutCalendarDaysForDomain(days, "strength");
    expect(strengthDays[0]!.workouts.length).toBe(1);
    expect(strengthDays[1]!.workouts.length).toBe(0);
  });

  it("narrowWorkoutMarkerFlagsForDomain drops non-matching domain", () => {
    expect(narrowWorkoutMarkerFlagsForDomain({ hasStrength: true, hasCardio: false }, "cardio")).toBeNull();
    expect(narrowWorkoutMarkerFlagsForDomain({ hasStrength: true, hasCardio: false }, "strength")).toEqual({
      hasStrength: true,
      hasCardio: false,
    });
    expect(narrowWorkoutMarkerFlagsForDomain({ hasStrength: false, hasCardio: true }, "cardio")).toEqual({
      hasStrength: false,
      hasCardio: true,
    });
  });
});
