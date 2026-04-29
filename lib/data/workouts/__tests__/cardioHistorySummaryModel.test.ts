import {
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import { buildCardioHistorySummaryModel } from "../cardioHistorySummaryModel";

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
  it("builds 7/30/YTD rows as mi/wk and excludes unsupported modalities", () => {
    const model = buildCardioHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-12-01",
      availableRangeEnd: "2026-03-12",
      cardioCalendarDays: [
        cardioWorkout("2026-03-10", "run", 3, "Running"),
        cardioWorkout("2026-03-09", "other", 10, "Other"),
        cardioWorkout("2026-01-10", "walk", 7, "Walking"),
      ],
    });

    expect(model.rows.map((row) => row.label)).toEqual(["7 Day", "30 Day", "YTD", "12 Month"]);
    const day30 = model.rows.find((row) => row.key === "day30");
    expect(day30?.hasEnoughData).toBe(true);
    expect(day30?.displayValue).toContain("mi ·");
    expect(day30?.displayValue).toContain("min/wk");
    expect(day30?.displayValue).not.toContain("mi/wk ·");
    expect(day30?.totalMiles).toBeCloseTo(3, 5);
    expect(day30?.totalMinutes).toBe(30);
  });

  it("marks 12 month as insufficient when hydration range does not cover trailing year", () => {
    const model = buildCardioHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2026-01-01",
      availableRangeEnd: "2026-03-12",
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

  it("computes min/wk as totalMinutes * 7 / calendar days for 7 Day, 30 Day, YTD, and 12 Month", () => {
    const todayDayKey = "2026-06-15";
    const anchor = getActivityOverviewAnchorEndDay(todayDayKey);
    const minutes = 300;
    const model = buildCardioHistorySummaryModel({
      todayDayKey,
      availableRangeStart: "2020-01-01",
      availableRangeEnd: anchor,
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

    const day7Len = activityTrailingNDaysInclusive(anchor, 7).length;
    const day30Len = activityTrailingNDaysInclusive(anchor, 30).length;
    const ytdLen = activityYtdInclusiveThroughEndDay(anchor).length;
    const month12Len = activityTrailingNDaysInclusive(anchor, 365).length;

    const day7 = model.rows.find((r) => r.key === "day7");
    const day30 = model.rows.find((r) => r.key === "day30");
    const ytd = model.rows.find((r) => r.key === "ytd");
    const month12 = model.rows.find((r) => r.key === "month12");

    expect(day7?.averageMinutesPerWeek).toBeCloseTo((minutes * 7) / day7Len, 8);
    expect(day30?.averageMinutesPerWeek).toBeCloseTo((minutes * 7) / day30Len, 8);
    expect(ytd?.averageMinutesPerWeek).toBeCloseTo((minutes * 7) / ytdLen, 8);
    expect(month12?.averageMinutesPerWeek).toBeCloseTo((minutes * 7) / month12Len, 8);
  });

  it("excludes generic Other without distance from range totals", () => {
    const todayDayKey = "2026-06-15";
    const anchor = getActivityOverviewAnchorEndDay(todayDayKey);
    const model = buildCardioHistorySummaryModel({
      todayDayKey,
      availableRangeStart: "2020-01-01",
      availableRangeEnd: anchor,
      cardioCalendarDays: [
        {
          day: anchor,
          workouts: [
            {
              id: "noise",
              observedAt: `${anchor}T10:00:00.000Z`,
              sourceId: "apple_health",
              title: "Other",
              workoutType: "cardio" as const,
              start: `${anchor}T10:00:00.000Z`,
              end: `${anchor}T10:30:00.000Z`,
              durationMinutes: 120,
              calories: null,
              activityName: "Other",
            },
            {
              id: "run",
              observedAt: `${anchor}T12:00:00.000Z`,
              sourceId: "apple_health",
              title: "Running",
              workoutType: "cardio" as const,
              start: `${anchor}T12:00:00.000Z`,
              end: `${anchor}T12:20:00.000Z`,
              durationMinutes: 20,
              calories: null,
              distanceMeters: 2 * 1609.344,
              activityName: "Running",
            },
          ],
        },
      ],
    });
    const day7 = model.rows.find((r) => r.key === "day7");
    expect(day7?.totalMinutes).toBe(20);
    expect(day7?.totalMiles).toBeCloseTo(2, 5);
  });

  it("renders minutes-only display when range has duration but no distance", () => {
    const model = buildCardioHistorySummaryModel({
      todayDayKey: "2026-03-12",
      availableRangeStart: "2025-03-01",
      availableRangeEnd: "2026-03-12",
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
    const day7 = model.rows.find((row) => row.key === "day7");
    expect(day7?.displayValue).toBe("45 min/wk");
  });
});
