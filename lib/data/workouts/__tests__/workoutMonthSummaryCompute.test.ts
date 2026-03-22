import { describe, it, expect } from "@jest/globals";
import type { RawEventDoc } from "@oli/contracts";
import {
  WORKOUT_OVERVIEW_ANALYTICS_YEAR,
  buildWorkoutOverviewAnalyticsFromCalendarDays,
  buildWorkoutOverviewAnalyticsFromMonthSummaryItems,
} from "@/lib/data/workouts/workoutsCalendarModel";
import { computeWorkoutMonthSummaryPayload } from "@/lib/data/workouts/workoutMonthSummaryCompute";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

function utcRawForCalendarDay(day: string, w: WorkoutHistoryItem): RawEventDoc {
  const kind = w.workoutType === "strength" ? "strength_workout" : "workout";
  const payload =
    kind === "strength_workout"
      ? {
          day,
          startedAt: w.start ?? w.observedAt,
          timeZone: "UTC",
          exercises: [{ name: w.title || "Lift" }],
          ...(typeof w.durationMinutes === "number" ? { durationMinutes: w.durationMinutes } : {}),
        }
      : {
          day,
          start: w.start ?? w.observedAt,
          timezone: "UTC",
          name: w.title,
          ...(typeof w.durationMinutes === "number" ? { durationMinutes: w.durationMinutes } : {}),
        };
  return {
    schemaVersion: 1,
    id: w.id,
    userId: "u",
    sourceId: w.sourceId,
    provider: "manual",
    sourceType: "manual",
    kind,
    observedAt: w.observedAt,
    receivedAt: w.observedAt,
    payload,
  };
}

function daysToRawDocs(days: { day: string; workouts: WorkoutHistoryItem[] }[]): RawEventDoc[] {
  return days.flatMap((d) => d.workouts.map((w) => utcRawForCalendarDay(d.day, w)));
}

function expectBundlesNearEqual(
  a: ReturnType<typeof buildWorkoutOverviewAnalyticsFromCalendarDays>,
  b: ReturnType<typeof buildWorkoutOverviewAnalyticsFromCalendarDays>,
): void {
  expect(a.chartPointsByTab.strength.map((p) => p.workouts)).toEqual(
    b.chartPointsByTab.strength.map((p) => p.workouts),
  );
  expect(a.chartPointsByTab.cardio.map((p) => p.workouts)).toEqual(
    b.chartPointsByTab.cardio.map((p) => p.workouts),
  );
  for (const tab of ["strength", "cardio"] as const) {
    expect(a.metricsByTab[tab].totalWorkouts).toBe(b.metricsByTab[tab].totalWorkouts);
    const am = a.metricsByTab[tab];
    const bm = b.metricsByTab[tab];
    if (am.avgPerMonth == null) expect(bm.avgPerMonth).toBeNull();
    else expect(bm.avgPerMonth).toBeCloseTo(am.avgPerMonth, 10);
    if (am.avgPerWeek == null) expect(bm.avgPerWeek).toBeNull();
    else expect(bm.avgPerWeek).toBeCloseTo(am.avgPerWeek, 10);
    if (am.avgDurationMinutes == null) expect(bm.avgDurationMinutes).toBeNull();
    else expect(bm.avgDurationMinutes).toBeCloseTo(am.avgDurationMinutes!, 10);
  }
}

describe("workoutMonthSummary parity with Overview analytics", () => {
  const computedAt = "2026-01-01T00:00:00.000Z";

  it("matches buildWorkoutOverviewAnalyticsFromCalendarDays for multi-month strength spread", () => {
    const days = [
      {
        day: "2026-03-10",
        workouts: [
          {
            id: "s1",
            observedAt: "2026-03-10T08:00:00.000Z",
            sourceId: "manual",
            title: "Lift",
            workoutType: "strength" as const,
            start: "2026-03-10T08:00:00.000Z",
            end: "2026-03-10T09:00:00.000Z",
            durationMinutes: 60,
            calories: null,
          },
        ],
      },
      {
        day: "2026-06-01",
        workouts: [
          {
            id: "s2",
            observedAt: "2026-06-01T08:00:00.000Z",
            sourceId: "manual",
            title: "Push",
            workoutType: "strength" as const,
            start: "2026-06-01T08:00:00.000Z",
            end: null,
            durationMinutes: 30,
            calories: null,
          },
        ],
      },
    ];
    const raw = daysToRawDocs(days);
    const expected = buildWorkoutOverviewAnalyticsFromCalendarDays(days);
    const items = [];
    for (let m = 1; m <= 12; m += 1) {
      const mk = `${WORKOUT_OVERVIEW_ANALYTICS_YEAR}-${String(m).padStart(2, "0")}`;
      items.push(computeWorkoutMonthSummaryPayload(mk, raw, computedAt));
    }
    const fromMonths = buildWorkoutOverviewAnalyticsFromMonthSummaryItems(items);
    expectBundlesNearEqual(fromMonths, expected);
  });

  it("matches capped avg duration and long-session exclusion", () => {
    const days = [
      {
        day: "2026-04-01",
        workouts: [
          {
            id: "ok",
            observedAt: "2026-04-01T08:00:00.000Z",
            sourceId: "manual",
            title: "Lift",
            workoutType: "strength" as const,
            start: "2026-04-01T08:00:00.000Z",
            end: null,
            durationMinutes: 60,
            calories: null,
          },
          {
            id: "stale",
            observedAt: "2026-04-01T12:00:00.000Z",
            sourceId: "apple_health",
            title: "Run",
            workoutType: "strength" as const,
            start: "2026-04-01T12:00:00.000Z",
            end: null,
            durationMinutes: 600,
            calories: null,
          },
        ],
      },
    ];
    const raw = daysToRawDocs(days);
    const expected = buildWorkoutOverviewAnalyticsFromCalendarDays(days);
    const items = [];
    for (let m = 1; m <= 12; m += 1) {
      const mk = `${WORKOUT_OVERVIEW_ANALYTICS_YEAR}-${String(m).padStart(2, "0")}`;
      items.push(computeWorkoutMonthSummaryPayload(mk, raw, computedAt));
    }
    const fromMonths = buildWorkoutOverviewAnalyticsFromMonthSummaryItems(items);
    expectBundlesNearEqual(fromMonths, expected);
  });

  it("excludes mixed reconciled sessions from both tabs like Overview", () => {
    const dayKey = "2026-07-15";
    const mixedDay = {
      day: dayKey,
      workouts: [
        {
          id: "str",
          observedAt: "2026-07-15T10:00:00.000Z",
          sourceId: "apple_health",
          title: "Strength Training",
          workoutType: "strength" as const,
          start: "2026-07-15T10:00:00.000Z",
          end: "2026-07-15T10:45:00.000Z",
          durationMinutes: 45,
          calories: null,
        },
        {
          id: "bridge",
          observedAt: "2026-07-15T10:08:00.000Z",
          sourceId: "manual",
          title: "",
          start: "2026-07-15T10:08:00.000Z",
          end: null,
          durationMinutes: null,
          calories: null,
        },
        {
          id: "car",
          observedAt: "2026-07-15T10:15:00.000Z",
          sourceId: "apple_health",
          title: "Running",
          workoutType: "cardio" as const,
          start: "2026-07-15T10:15:00.000Z",
          end: "2026-07-15T10:50:00.000Z",
          durationMinutes: 35,
          calories: null,
        },
      ],
    };
    const raw = daysToRawDocs([mixedDay]);
    const expected = buildWorkoutOverviewAnalyticsFromCalendarDays([mixedDay]);
    const items = [];
    for (let m = 1; m <= 12; m += 1) {
      const mk = `${WORKOUT_OVERVIEW_ANALYTICS_YEAR}-${String(m).padStart(2, "0")}`;
      items.push(computeWorkoutMonthSummaryPayload(mk, raw, computedAt));
    }
    const fromMonths = buildWorkoutOverviewAnalyticsFromMonthSummaryItems(items);
    expectBundlesNearEqual(fromMonths, expected);
  });
});
