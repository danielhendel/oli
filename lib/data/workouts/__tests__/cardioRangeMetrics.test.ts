import {
  aggregateDisplayableCardioForCalendarDays,
  aggregateDisplayableCardioForInclusiveDayRange,
  averagePerWeekFromTotals,
} from "../cardioRangeMetrics";
import type { WorkoutCalendarDayLike } from "../workoutsCalendarModel";

describe("averagePerWeekFromTotals", () => {
  it("returns total * 7 / calendarDays for positive inputs", () => {
    expect(averagePerWeekFromTotals(70, 7)).toBe(70);
    expect(averagePerWeekFromTotals(300, 30)).toBeCloseTo(70, 10);
    expect(averagePerWeekFromTotals(900, 90)).toBeCloseTo(70, 10);
    expect(averagePerWeekFromTotals(100, 365)).toBeCloseTo((100 * 7) / 365, 10);
  });

  it("returns 0 for non-positive calendar span or non-finite total", () => {
    expect(averagePerWeekFromTotals(10, 0)).toBe(0);
    expect(averagePerWeekFromTotals(10, -1)).toBe(0);
    expect(averagePerWeekFromTotals(Number.NaN, 7)).toBe(0);
  });
});

function runningDay(day: string, id: string, miles: number, durationMinutes: number): WorkoutCalendarDayLike {
  return {
    day: day as `${string}-${string}-${string}`,
    workouts: [
      {
        id,
        observedAt: `${day}T10:00:00.000Z`,
        sourceId: "apple_health",
        title: "Running",
        workoutType: "cardio",
        start: `${day}T10:00:00.000Z`,
        end: `${day}T10:30:00.000Z`,
        durationMinutes,
        calories: null,
        distanceMeters: miles * 1609.344,
        activityName: "Running",
      },
    ],
  };
}

describe("aggregateDisplayableCardioForCalendarDays", () => {
  it("excludes generic Other with no distance (duration-only)", () => {
    const days: WorkoutCalendarDayLike[] = [
      {
        day: "2026-04-01",
        workouts: [
          {
            id: "other-no-dist",
            observedAt: "2026-04-01T10:00:00.000Z",
            sourceId: "apple_health",
            title: "Other",
            workoutType: "cardio",
            start: "2026-04-01T10:00:00.000Z",
            end: "2026-04-01T10:30:00.000Z",
            durationMinutes: 45,
            calories: null,
            activityName: "Other",
          },
        ],
      },
      runningDay("2026-04-01", "run", 2, 20),
    ];
    const t = aggregateDisplayableCardioForCalendarDays(days);
    expect(t.sessionCount).toBe(1);
    expect(t.totalMiles).toBeCloseTo(2, 5);
    expect(t.totalMinutes).toBe(20);
  });

  it("sums inclusive range helper over calendar keys only", () => {
    const days: WorkoutCalendarDayLike[] = [
      runningDay("2026-04-01", "a", 1, 10),
      runningDay("2026-04-03", "b", 2, 20),
    ];
    const t = aggregateDisplayableCardioForInclusiveDayRange(days, "2026-04-01", "2026-04-02");
    expect(t.totalMiles).toBeCloseTo(1, 5);
    expect(t.totalMinutes).toBe(10);
    expect(t.sessionCount).toBe(1);
  });
});
