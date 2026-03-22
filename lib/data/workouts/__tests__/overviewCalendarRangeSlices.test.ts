import {
  filterWorkoutCalendarDaysInclusive,
  maxDayKey,
  minDayKey,
  overviewSharedRangeBounds,
} from "@/lib/data/workouts/overviewCalendarRangeSlices";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";

describe("overviewSharedRangeBounds", () => {
  it("returns the inclusive union of week, recent, and analytics bounds", () => {
    expect(
      overviewSharedRangeBounds({
        weekStart: "2026-03-09",
        weekEnd: "2026-03-15",
        recentStart: "2025-11-22",
        recentEnd: "2026-03-22",
        analyticsStart: "2026-01-01",
        analyticsEnd: "2026-12-31",
      }),
    ).toEqual({ start: "2025-11-22", end: "2026-12-31" });
  });
});

describe("minDayKey / maxDayKey", () => {
  it("orders ISO day keys lexicographically", () => {
    expect(minDayKey("2026-01-02", "2026-01-01")).toBe("2026-01-01");
    expect(maxDayKey("2026-01-02", "2026-01-01")).toBe("2026-01-02");
  });
});

describe("filterWorkoutCalendarDaysInclusive", () => {
  const days: WorkoutCalendarDayLike[] = [
    { day: "2026-01-01", workouts: [] },
    { day: "2026-01-02", workouts: [{ id: "a", observedAt: "x", sourceId: "m", title: "t", start: null, end: null, durationMinutes: null, calories: null }] },
    { day: "2026-01-03", workouts: [] },
  ];

  it("returns the contiguous in-range slice in O(n) order", () => {
    expect(filterWorkoutCalendarDaysInclusive(days, "2026-01-02", "2026-01-02")).toEqual([days[1]!]);
  });

  it("returns empty when range is before or after all days", () => {
    expect(filterWorkoutCalendarDaysInclusive(days, "2025-12-01", "2025-12-31")).toEqual([]);
    expect(filterWorkoutCalendarDaysInclusive(days, "2027-01-01", "2027-01-02")).toEqual([]);
  });
});
