import { describe, expect, it } from "@jest/globals";
import {
  compareWorkoutsChronologicalAsc,
  getRecentWorkoutsFromCalendarDays,
  sortWorkoutsChronologicalAsc,
  workoutDisplaySortKey,
} from "@/lib/data/workouts/workoutsCalendarModel";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

function w(
  id: string,
  start: string | null,
  observedAt: string,
  title = "Workout",
): WorkoutHistoryItem {
  return {
    id,
    observedAt,
    sourceId: "manual",
    title,
    start,
    end: null,
    durationMinutes: null,
    calories: null,
  };
}

describe("workoutsCalendarModel", () => {
  it("workoutDisplaySortKey prefers start over observedAt", () => {
    const item = w("a", "2026-03-10T10:00:00.000Z", "2026-03-10T09:00:00.000Z");
    expect(workoutDisplaySortKey(item)).toBe("2026-03-10T10:00:00.000Z");
    expect(workoutDisplaySortKey(w("b", null, "2026-03-01T12:00:00.000Z"))).toBe("2026-03-01T12:00:00.000Z");
  });

  it("sortWorkoutsChronologicalAsc is earliest-first with stable id tie-break", () => {
    const items = [
      w("z", "2026-03-01T12:00:00.000Z", "2026-03-01T12:00:00.000Z"),
      w("a", "2026-03-01T09:00:00.000Z", "2026-03-01T09:00:00.000Z"),
      w("b", "2026-03-01T09:00:00.000Z", "2026-03-01T08:00:00.000Z"),
    ];
    const sorted = sortWorkoutsChronologicalAsc(items).map((x) => x.id);
    expect(sorted).toEqual(["a", "b", "z"]);
  });

  it("compareWorkoutsChronologicalAsc matches sort order", () => {
    const x = w("1", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
    const y = w("2", "2026-01-02T00:00:00.000Z", "2026-01-02T00:00:00.000Z");
    expect(compareWorkoutsChronologicalAsc(x, y)).toBeLessThan(0);
    expect(compareWorkoutsChronologicalAsc(y, x)).toBeGreaterThan(0);
  });

  it("getRecentWorkoutsFromCalendarDays returns newest first, max 5, mixed sources", () => {
    const days = [
      {
        day: "2026-03-08",
        workouts: [
          w("old", "2026-03-08T08:00:00.000Z", "2026-03-08T08:00:00.000Z", "Morning run"),
          w("new", "2026-03-08T18:00:00.000Z", "2026-03-08T18:00:00.000Z", "Evening cycle"),
        ],
      },
      {
        day: "2026-03-10",
        workouts: [w("latest", "2026-03-10T20:00:00.000Z", "2026-03-10T20:00:00.000Z", "Lift")],
      },
      {
        day: "2026-03-09",
        workouts: [w("mid", "2026-03-09T12:00:00.000Z", "2026-03-09T12:00:00.000Z", "Walk")],
      },
    ];
    const recent = getRecentWorkoutsFromCalendarDays(days, 5);
    // ISO sort: Mar 10 > Mar 9 noon > Mar 8 evening > Mar 8 morning
    expect(recent.map((e) => e.workout.id)).toEqual(["latest", "mid", "new", "old"]);

    const top2 = getRecentWorkoutsFromCalendarDays(days, 2);
    expect(top2.map((e) => e.workout.title)).toEqual(["Lift", "Walk"]);
  });

  it("getRecentWorkoutsFromCalendarDays caps at 5", () => {
    const days = [
      {
        day: "2026-03-01",
        workouts: Array.from({ length: 10 }, (_, i) =>
          w(`w${i}`, `2026-03-01T${String(8 + i).padStart(2, "0")}:00:00.000Z`, "2026-03-01T12:00:00.000Z"),
        ),
      },
    ];
    expect(getRecentWorkoutsFromCalendarDays(days, 5)).toHaveLength(5);
  });
});
