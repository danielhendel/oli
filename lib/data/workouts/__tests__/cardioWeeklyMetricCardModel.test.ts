import {
  buildCardioWeeklyDistanceCardModel,
  buildCardioWeeklyDurationCardModel,
  formatCardioWeeklyDistanceBarLabel,
  formatCardioWeeklyDurationBarLabel,
} from "@/lib/data/workouts/cardioWeeklyMetricCardModel";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import type { WorkoutCalendarDayLike } from "@/lib/data/workouts/workoutsCalendarModel";
import type { DayKey } from "@/lib/ui/calendar/types";

const TODAY = "2026-05-26" as DayKey;
const WEEK_DAYS: readonly DayKey[] = [
  "2026-05-24",
  "2026-05-25",
  "2026-05-26",
  "2026-05-27",
  "2026-05-28",
  "2026-05-29",
  "2026-05-30",
] as DayKey[];

const MI = 1609.344;

function cardioWorkout(opts: {
  id: string;
  start: string;
  end: string;
  durationMinutes: number;
  distanceMeters?: number | null;
  activityId?: number;
  activityName?: string;
}): WorkoutHistoryItem {
  return {
    id: opts.id,
    observedAt: opts.start,
    sourceId: "apple_health",
    title: opts.activityName ?? "Running",
    workoutType: "cardio",
    start: opts.start,
    end: opts.end,
    durationMinutes: opts.durationMinutes,
    calories: null,
    ...(opts.distanceMeters != null ? { distanceMeters: opts.distanceMeters } : {}),
    activityName: opts.activityName ?? "Running",
    hk: { sourceId: "healthkit", activityId: opts.activityId ?? 37 },
  };
}

const cardioCalendarDays: WorkoutCalendarDayLike[] = [
  {
    day: "2026-05-25" as DayKey,
    workouts: [
      cardioWorkout({
        id: "w-mon",
        start: "2026-05-25T13:00:00.000Z",
        end: "2026-05-25T13:30:00.000Z",
        durationMinutes: 30,
        distanceMeters: 3 * MI,
      }),
    ],
  },
  {
    day: "2026-05-26" as DayKey,
    workouts: [
      cardioWorkout({
        id: "w-tue-a",
        start: "2026-05-26T13:00:00.000Z",
        end: "2026-05-26T13:35:00.000Z",
        durationMinutes: 35,
        distanceMeters: 5 * MI,
      }),
      cardioWorkout({
        id: "w-tue-b",
        start: "2026-05-26T18:00:00.000Z",
        end: "2026-05-26T18:20:00.000Z",
        durationMinutes: 20,
        distanceMeters: 1.5 * MI,
        activityId: 52,
        activityName: "Walking",
      }),
    ],
  },
];

describe("buildCardioWeeklyDistanceCardModel", () => {
  it("sums miles across days, marks future days, and computes total label", () => {
    const model = buildCardioWeeklyDistanceCardModel({
      todayDayKey: TODAY,
      weekDayKeys: WEEK_DAYS,
      cardioCalendarDays,
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
    });
    // Sun 5-24 = 0, Mon 5-25 = 3.0 mi, Tue 5-26 = 6.5 mi, Wed–Sat future = 0
    const values = model.chartPoints.map((p) => Math.round(p.value * 100) / 100);
    expect(values).toEqual([0, 3, 6.5, 0, 0, 0, 0]);
    expect(model.chartPoints[3]!.isFutureDay).toBe(true);
    expect(model.chartPoints[6]!.isFutureDay).toBe(true);
    expect(model.chartPoints[0]!.isFutureDay).toBe(false);
    expect(model.totalLabel).toBe("9.5 mi total");
    expect(model.isEmpty).toBe(false);
    expect(model.chartMaxScale).toBeGreaterThanOrEqual(model.chartPoints[2]!.value);
  });

  it("isEmpty when no qualifying cardio sessions", () => {
    const model = buildCardioWeeklyDistanceCardModel({
      todayDayKey: TODAY,
      weekDayKeys: WEEK_DAYS,
      cardioCalendarDays: [],
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
    });
    expect(model.isEmpty).toBe(true);
    expect(model.totalLabel).toBe("0.0 mi total");
  });
});

describe("buildCardioWeeklyDurationCardModel", () => {
  it("sums minutes across days, marks future days, and computes total label", () => {
    const model = buildCardioWeeklyDurationCardModel({
      todayDayKey: TODAY,
      weekDayKeys: WEEK_DAYS,
      cardioCalendarDays,
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
    });
    const values = model.chartPoints.map((p) => Math.round(p.value));
    expect(values).toEqual([0, 30, 55, 0, 0, 0, 0]);
    expect(model.totalLabel).toBe("85 min total");
    expect(model.isEmpty).toBe(false);
    expect(model.chartMaxScale).toBeGreaterThanOrEqual(55);
  });

  it("isEmpty when no qualifying cardio sessions", () => {
    const model = buildCardioWeeklyDurationCardModel({
      todayDayKey: TODAY,
      weekDayKeys: WEEK_DAYS,
      cardioCalendarDays: [],
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
    });
    expect(model.isEmpty).toBe(true);
    expect(model.totalLabel).toBe("0 min total");
  });
});

describe("formatCardioWeekly*BarLabel", () => {
  it("distance: 1 decimal place, blank for 0 / NaN", () => {
    expect(formatCardioWeeklyDistanceBarLabel(3.137)).toBe("3.1");
    expect(formatCardioWeeklyDistanceBarLabel(0)).toBe("");
    expect(formatCardioWeeklyDistanceBarLabel(Number.NaN)).toBe("");
  });
  it("duration: rounded integer, blank for 0 / NaN", () => {
    expect(formatCardioWeeklyDurationBarLabel(34.6)).toBe("35");
    expect(formatCardioWeeklyDurationBarLabel(0)).toBe("");
    expect(formatCardioWeeklyDurationBarLabel(-1)).toBe("");
  });
});
