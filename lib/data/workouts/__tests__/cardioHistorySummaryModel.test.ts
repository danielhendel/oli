import {
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import { buildCardioHistorySummaryModel } from "../cardioHistorySummaryModel";
import { getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";

function cardioWorkout(day: string, id: string, miles: number, title = "Running") {
  return {
    day: day as `${string}-${string}-${string}`,
    workouts: [
      {
        id,
        observedAt: `${day}T10:00:00.000Z`,
        sourceId: "apple_health",
        title,
        workoutType: "cardio" as const,
        start: `${day}T10:00:00.000Z`,
        end: `${day}T10:30:00.000Z`,
        durationMinutes: 30,
        calories: null,
        distanceMeters: miles * 1609.344,
        activityName: title,
      },
    ],
  };
}

describe("buildCardioHistorySummaryModel", () => {
  it("builds baseline rows as mi per week and excludes unsupported modalities", () => {
    const model = buildCardioHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-12-01",
      availableRangeEnd: "2026-03-14",
      cardioCalendarDays: [
        cardioWorkout("2026-03-10", "run", 3, "Running"),
        cardioWorkout("2026-03-09", "other", 10, "Other"),
        cardioWorkout("2026-01-10", "walk", 7, "Walking"),
      ],
    });

    expect(model.rows.map((row) => row.label)).toEqual(["7 Day", "30 Day", "90 Day", "YTD", "12 Month"]);
    const day30 = model.rows.find((row) => row.key === "day30");
    expect(day30?.hasEnoughData).toBe(true);
    expect(day30?.displayValue).toContain("mi per week");
    expect(day30?.displayValue).not.toContain("min/wk");
    expect(day30?.totalMiles).toBeCloseTo(3, 5);
    expect(day30?.totalMinutes).toBe(30);
  });

  it("marks 12 month as insufficient when hydration range does not cover trailing year", () => {
    const model = buildCardioHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2026-01-01",
      availableRangeEnd: "2026-03-14",
      cardioCalendarDays: [cardioWorkout("2026-03-10", "run", 3, "Running")],
    });
    const month12 = model.rows.find((row) => row.key === "month12");
    expect(month12).toMatchObject({
      hasEnoughData: false,
      displayValue: "—",
      helperText: "Data will appear when enough history is available",
      progressFill01: null,
    });
  });

  it("computes min/wk as totalMinutes * 7 / calendar days for each window", () => {
    const todayDayKey = "2026-06-15";
    const week = getWeekDaysForAnchor(todayDayKey);
    const weekEnd = week[week.length - 1]!;
    const anchor = getActivityOverviewAnchorEndDay(todayDayKey);
    const minutes = 300;
    const model = buildCardioHistorySummaryModel({
      todayDayKey,
      availableRangeStart: "2020-01-01",
      /** Matches production: hydrate end includes the visible calendar-week tail. */
      availableRangeEnd: weekEnd,
      cardioCalendarDays: [
        {
          day: anchor,
          workouts: [
            {
              id: "run",
              observedAt: `${anchor}T10:00:00.000Z`,
              sourceId: "apple_health",
              title: "Running",
              workoutType: "cardio" as const,
              start: `${anchor}T10:00:00.000Z`,
              end: `${anchor}T11:00:00.000Z`,
              durationMinutes: minutes,
              calories: null,
              distanceMeters: 5 * 1609.344,
              activityName: "Running",
            },
          ],
        },
      ],
    });

    const day7Len = activityTrailingNDaysInclusive(todayDayKey, 7).length;
    const day30Len = activityTrailingNDaysInclusive(todayDayKey, 30).length;
    const day90Len = activityTrailingNDaysInclusive(anchor, 90).length;
    const ytdLen = activityYtdInclusiveThroughEndDay(todayDayKey).length;
    const month12Len = activityTrailingNDaysInclusive(todayDayKey, 365).length;

    const day7Row = model.rows.find((r) => r.key === "thisWeek");
    const day30 = model.rows.find((r) => r.key === "day30");
    const day90 = model.rows.find((r) => r.key === "day90");
    const ytd = model.rows.find((r) => r.key === "ytd");
    const month12 = model.rows.find((r) => r.key === "month12");

    expect(day7Len).toBe(7);
    expect(day7Row?.averageMinutesPerWeek).toBeCloseTo((minutes * 7) / day7Len, 8);
    expect(day30?.averageMinutesPerWeek).toBeCloseTo((minutes * 7) / day30Len, 8);
    expect(day90?.averageMinutesPerWeek).toBeCloseTo((minutes * 7) / day90Len, 8);
    expect(ytd?.averageMinutesPerWeek).toBeCloseTo((minutes * 7) / ytdLen, 8);
    expect(month12?.averageMinutesPerWeek).toBeCloseTo((minutes * 7) / month12Len, 8);
  });

  it("7 Day uses trailing 7 days through today, not partial calendar-week extrapolation", () => {
    const model = buildCardioHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-01-01",
      availableRangeEnd: "2026-03-15",
      cardioCalendarDays: [cardioWorkout("2026-03-09", "a", 3, "Running")],
    });
    const row = model.rows.find((r) => r.key === "thisWeek");
    expect(row?.label).toBe("7 Day");
    expect(row?.averageMilesPerWeek).toBeCloseTo(3, 5);
    expect(row?.displayValue).toBe("3.0 mi per week");
  });

  it("excludes generic Other without distance from range totals", () => {
    const todayDayKey = "2026-06-15";
    const week = getWeekDaysForAnchor(todayDayKey);
    const weekEnd = week[week.length - 1]!;
    const model = buildCardioHistorySummaryModel({
      todayDayKey,
      availableRangeStart: "2020-01-01",
      availableRangeEnd: weekEnd,
      cardioCalendarDays: [
        {
          day: todayDayKey,
          workouts: [
            {
              id: "noise",
              observedAt: `${todayDayKey}T10:00:00.000Z`,
              sourceId: "apple_health",
              title: "Other",
              workoutType: "cardio" as const,
              start: `${todayDayKey}T10:00:00.000Z`,
              end: `${todayDayKey}T10:30:00.000Z`,
              durationMinutes: 120,
              calories: null,
              activityName: "Other",
            },
            {
              id: "run",
              observedAt: `${todayDayKey}T12:00:00.000Z`,
              sourceId: "apple_health",
              title: "Running",
              workoutType: "cardio" as const,
              start: `${todayDayKey}T12:00:00.000Z`,
              end: `${todayDayKey}T12:20:00.000Z`,
              durationMinutes: 20,
              calories: null,
              distanceMeters: 2 * 1609.344,
              activityName: "Running",
            },
          ],
        },
      ],
    });
    const day7Row = model.rows.find((r) => r.key === "thisWeek");
    expect(day7Row?.totalMinutes).toBe(20);
    expect(day7Row?.totalMiles).toBeCloseTo(2, 5);
  });

  it("renders minutes-only display when range has duration but no distance", () => {
    const model = buildCardioHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-03-01",
      availableRangeEnd: "2026-03-14",
      cardioCalendarDays: [
        {
          day: "2026-03-10",
          workouts: [
            {
              id: "run-min-only",
              observedAt: "2026-03-10T10:00:00.000Z",
              sourceId: "apple_health",
              title: "Running",
              workoutType: "cardio" as const,
              start: "2026-03-10T10:00:00.000Z",
              end: "2026-03-10T10:45:00.000Z",
              durationMinutes: 45,
              calories: null,
              activityName: "Running",
            },
          ],
        },
      ],
    });
    const day30 = model.rows.find((row) => row.key === "day30");
    expect(day30?.displayValue).toBe("—");
  });
});
