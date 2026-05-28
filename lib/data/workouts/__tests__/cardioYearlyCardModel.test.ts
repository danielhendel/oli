import {
  buildCardioYearlyCardModel,
  sumCardioMilesByMonthFromCalendarDays,
} from "@/lib/data/workouts/cardioYearlyCardModel";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";

const MI = 1609.344;
const TODAY = "2026-05-26" as DayKey;

function cardioWorkout(opts: {
  id: string;
  start: string;
  end: string;
  durationMinutes: number;
  distanceMeters: number;
}): WorkoutHistoryItem {
  return {
    id: opts.id,
    observedAt: opts.start,
    sourceId: "apple_health",
    title: "Running",
    workoutType: "cardio",
    start: opts.start,
    end: opts.end,
    durationMinutes: opts.durationMinutes,
    calories: null,
    distanceMeters: opts.distanceMeters,
    activityName: "Running",
    hk: { sourceId: "healthkit", activityId: 37 },
  };
}

describe("buildCardioYearlyCardModel — current year", () => {
  it("renders 12 monthly buckets with miles, marks current/future months, and computes total", () => {
    const monthlyMiles = {
      "2026-01": 5,
      "2026-02": 10,
      "2026-05": 7.5,
    };
    const vm = buildCardioYearlyCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      monthlyMiles,
    });
    expect(vm.title).toBe("2026 Cardio");
    expect(vm.rangeLabel).toBe("2026");
    expect(vm.isCurrentYear).toBe(true);
    expect(vm.months).toHaveLength(12);
    expect(vm.months[0]!.miles).toBe(5);
    expect(vm.months[1]!.miles).toBe(10);
    expect(vm.months[4]!.miles).toBe(7.5);
    expect(vm.months[4]!.isCurrentMonth).toBe(true);
    // Future months (Jun … Dec)
    expect(vm.months[5]!.isFutureMonth).toBe(true);
    expect(vm.months[11]!.isFutureMonth).toBe(true);
    // Total = 5 + 10 + 7.5 = 22.5
    expect(vm.totalMiles).toBeCloseTo(22.5, 5);
    expect(vm.totalDisplay).toBe("22.5");
    expect(vm.totalQualifier).toBe("mi completed");
    expect(vm.hasData).toBe(true);
    expect(vm.isEmpty).toBe(false);
  });
});

describe("buildCardioYearlyCardModel — prior years placeholder", () => {
  it("with empty monthlyMiles, prior year renders zeros and isEmpty", () => {
    const vm = buildCardioYearlyCardModel({
      selectedYear: 2025,
      todayDayKey: TODAY,
      monthlyMiles: {},
    });
    expect(vm.title).toBe("2025 Cardio");
    expect(vm.isCurrentYear).toBe(false);
    expect(vm.totalMiles).toBe(0);
    expect(vm.totalDisplay).toBe("0.0");
    expect(vm.hasData).toBe(false);
    expect(vm.isEmpty).toBe(true);
    // No month marked as current
    for (const m of vm.months) {
      expect(m.isCurrentMonth).toBe(false);
    }
  });
});

describe("sumCardioMilesByMonthFromCalendarDays", () => {
  it("aggregates miles from the hydrated calendar slice and zeroes out future months", () => {
    const days: WorkoutCalendarDayLike[] = [
      {
        day: "2026-01-15" as DayKey,
        workouts: [
          cardioWorkout({
            id: "w-jan",
            start: "2026-01-15T13:00:00.000Z",
            end: "2026-01-15T13:30:00.000Z",
            durationMinutes: 30,
            distanceMeters: 3 * MI,
          }),
        ],
      },
      {
        day: "2026-05-20" as DayKey,
        workouts: [
          cardioWorkout({
            id: "w-may",
            start: "2026-05-20T13:00:00.000Z",
            end: "2026-05-20T13:30:00.000Z",
            durationMinutes: 30,
            distanceMeters: 5 * MI,
          }),
        ],
      },
    ];
    const monthly = sumCardioMilesByMonthFromCalendarDays(days, 2026, TODAY);
    expect(monthly["2026-01"]).toBeCloseTo(3, 2);
    expect(monthly["2026-05"]).toBeCloseTo(5, 2);
    expect(monthly["2026-06"]).toBe(0);
    expect(monthly["2026-12"]).toBe(0);
  });
});
