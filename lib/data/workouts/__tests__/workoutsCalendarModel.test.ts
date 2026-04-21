import { describe, expect, it } from "@jest/globals";
import {
  buildWorkoutAnalyticsMetrics,
  buildWorkoutAnalyticsMonthlyFromCalendarDays,
  buildWorkoutOverviewAnalyticsFromCalendarDays,
  compareWorkoutsChronologicalAsc,
  countWeekBucketsInDayRangeInclusive,
  deriveOverviewTabSessionCounts,
  getRecentWorkoutsFromCalendarDays,
  getRecentWorkoutSessionsFromCalendarDays,
  getStrengthOverviewTabSessionsForCalendarDaysAscending,
  sortWorkoutsChronologicalAsc,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_END,
  WORKOUT_OVERVIEW_ANALYTICS_RANGE_START,
  WORKOUT_OVERVIEW_ANALYTICS_WEEK_COUNT,
  workoutDisplaySortKey,
} from "@/lib/data/workouts/workoutsCalendarModel";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
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

  it("buildWorkoutAnalyticsMonthlyFromCalendarDays groups month counts and strength volume", () => {
    const days = [
      {
        day: "2026-01-10",
        workouts: [w("s1", "2026-01-10T08:00:00.000Z", "2026-01-10T08:00:00.000Z", "Strength Training")],
      },
      {
        day: "2026-01-12",
        workouts: [w("c1", "2026-01-12T08:00:00.000Z", "2026-01-12T08:00:00.000Z", "Running")],
      },
      {
        day: "2026-02-01",
        workouts: [w("s2", "2026-02-01T08:00:00.000Z", "2026-02-01T08:00:00.000Z", "Bench Press")],
      },
    ] as const;
    const monthly = buildWorkoutAnalyticsMonthlyFromCalendarDays(days as unknown as Parameters<typeof buildWorkoutAnalyticsMonthlyFromCalendarDays>[0], {
      "2026-01-10": 12000,
      "2026-02-01": 8000,
    });
    expect(monthly).toHaveLength(2);
    expect(monthly[0]?.monthKey).toBe("2026-01");
    expect(monthly[0]?.workouts).toBe(2);
    expect(monthly[0]?.volume).toBe(12000);
    expect(monthly[1]?.monthKey).toBe("2026-02");
    expect(monthly[1]?.workouts).toBe(1);
    expect(monthly[1]?.volume).toBe(8000);
  });

  it("buildWorkoutAnalyticsMetrics uses active month/week denominators and real durations", () => {
    const sessions = getRecentWorkoutSessionsFromCalendarDays(
      [
        {
          day: "2026-01-10",
          workouts: [w("s1", "2026-01-10T08:00:00.000Z", "2026-01-10T08:00:00.000Z", "Strength Training")],
        },
        {
          day: "2026-02-14",
          workouts: [w("c1", "2026-02-14T08:00:00.000Z", "2026-02-14T08:00:00.000Z", "Running")],
        },
      ],
      10,
    ).map((x) => x.session);
    sessions[0]!.durationMinutes = 40;
    sessions[1]!.durationMinutes = null;

    const all = buildWorkoutAnalyticsMetrics(sessions, "all");
    expect(all.totalWorkouts).toBe(2);
    expect(all.avgPerMonth).toBe(1);
    expect(all.avgPerWeek).toBe(1);
    expect(all.avgDurationMinutes).toBe(40);
  });

  it("analytics counts reconciled sessions (dedupes overlapping source duplicates)", () => {
    const monthly = buildWorkoutAnalyticsMonthlyFromCalendarDays([
      {
        day: "2026-03-10",
        workouts: [
          {
            id: "provider-1",
            observedAt: "2026-03-10T10:00:00.000Z",
            sourceId: "apple_health",
            title: "Strength Training",
            workoutType: "strength",
            start: "2026-03-10T10:00:00.000Z",
            end: "2026-03-10T11:00:00.000Z",
            durationMinutes: 60,
            calories: 300,
          },
          {
            id: "manual-1",
            observedAt: "2026-03-10T10:05:00.000Z",
            sourceId: "manual",
            title: "Chest Session",
            workoutType: "strength",
            start: "2026-03-10T10:05:00.000Z",
            end: "2026-03-10T10:50:00.000Z",
            durationMinutes: 45,
            calories: null,
          },
        ],
      },
    ]);
    expect(monthly).toHaveLength(1);
    expect(monthly[0]?.workouts).toBe(1);
  });

  it("monthly analytics and recent sessions use the same reconciled session count from shared days", () => {
    const days = [
      {
        day: "2026-03-10",
        workouts: [
          {
            id: "p1",
            observedAt: "2026-03-10T10:00:00.000Z",
            sourceId: "apple_health",
            title: "Run",
            workoutType: "cardio" as const,
            start: "2026-03-10T10:00:00.000Z",
            end: "2026-03-10T10:45:00.000Z",
            durationMinutes: 45,
            calories: null,
          },
          {
            id: "p2",
            observedAt: "2026-03-10T10:05:00.000Z",
            sourceId: "manual",
            title: "Morning run",
            workoutType: "cardio" as const,
            start: "2026-03-10T10:05:00.000Z",
            end: "2026-03-10T10:40:00.000Z",
            durationMinutes: 35,
            calories: null,
          },
        ],
      },
    ];
    const monthly = buildWorkoutAnalyticsMonthlyFromCalendarDays(days, {});
    const recentSessions = getRecentWorkoutSessionsFromCalendarDays(days, 7);
    const flatSessions = days.flatMap((d) => reconcileWorkoutSessionsForDay(d.day, d.workouts));
    expect(monthly[0]?.workouts).toBe(1);
    expect(recentSessions).toHaveLength(1);
    expect(flatSessions).toHaveLength(1);
    expect(monthly[0]?.workouts).toBe(flatSessions.length);
  });

  it("strength volume applies only on strength days; workout counts include cardio sessions", () => {
    const days = [
      {
        day: "2026-03-01",
        workouts: [
          {
            id: "c1",
            observedAt: "2026-03-01T08:00:00.000Z",
            sourceId: "apple_health",
            title: "Outdoor Run",
            workoutType: "cardio" as const,
            start: "2026-03-01T08:00:00.000Z",
            end: null,
            durationMinutes: 40,
            calories: null,
          },
        ],
      },
      {
        day: "2026-03-02",
        workouts: [
          {
            id: "s1",
            observedAt: "2026-03-02T09:00:00.000Z",
            sourceId: "manual",
            title: "Leg day",
            workoutType: "strength" as const,
            start: "2026-03-02T09:00:00.000Z",
            end: null,
            durationMinutes: 60,
            calories: null,
          },
        ],
      },
    ];
    const monthly = buildWorkoutAnalyticsMonthlyFromCalendarDays(days, {
      "2026-03-02": 5000,
    });
    const march = monthly.find((m) => m.monthKey === "2026-03");
    expect(march?.workouts).toBe(2);
    expect(march?.volume).toBe(5000);
  });

  it("buildWorkoutAnalyticsMetrics filters tab subsets before denominators", () => {
    const sessions = [
      {
        id: "s",
        day: "2026-01-10",
        sessionType: "strength",
        title: "S",
        titleSource: "provider",
        start: "2026-01-10T08:00:00.000Z",
        end: null,
        durationMinutes: 40,
        calories: null,
        workouts: [],
        sourceSummaries: [],
        sourceCount: 1,
      },
      {
        id: "c",
        day: "2026-02-14",
        sessionType: "cardio",
        title: "C",
        titleSource: "provider",
        start: "2026-02-14T08:00:00.000Z",
        end: null,
        durationMinutes: 20,
        calories: null,
        workouts: [],
        sourceSummaries: [],
        sourceCount: 1,
      },
    ] as Parameters<typeof buildWorkoutAnalyticsMetrics>[0];

    const strength = buildWorkoutAnalyticsMetrics(sessions, "strength");
    expect(strength.totalWorkouts).toBe(1);
    expect(strength.avgPerMonth).toBe(1);
    expect(strength.avgPerWeek).toBe(1);
    expect(strength.avgDurationMinutes).toBe(40);
  });

  it("WORKOUT_OVERVIEW_ANALYTICS_WEEK_COUNT matches countWeekBucketsInDayRangeInclusive for 2026 span", () => {
    expect(WORKOUT_OVERVIEW_ANALYTICS_WEEK_COUNT).toBe(
      countWeekBucketsInDayRangeInclusive(WORKOUT_OVERVIEW_ANALYTICS_RANGE_START, WORKOUT_OVERVIEW_ANALYTICS_RANGE_END),
    );
    expect(WORKOUT_OVERVIEW_ANALYTICS_WEEK_COUNT).toBeGreaterThan(50);
  });

  it("buildWorkoutOverviewAnalyticsFromCalendarDays returns Jan–Dec 2026 with zero-fill when empty", () => {
    const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays([]);
    expect(bundle.chartPointsByTab.strength).toHaveLength(12);
    expect(bundle.chartPointsByTab.cardio).toHaveLength(12);
    expect(bundle.chartPointsByTab.strength.map((p) => p.monthKey)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
    expect(bundle.chartPointsByTab.strength.every((p) => p.workouts === 0)).toBe(true);
    expect(bundle.metricsByTab.strength.totalWorkouts).toBe(0);
    expect(bundle.metricsByTab.cardio.totalWorkouts).toBe(0);
  });

  it("buildWorkoutOverviewAnalyticsFromCalendarDays uses active months and elapsed-year weekly rate for Avg per Week", () => {
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
    const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays(days);
    expect(bundle.metricsByTab.strength.totalWorkouts).toBe(2);
    expect(bundle.metricsByTab.strength.avgPerMonth).toBeCloseTo(1, 10);
    expect(bundle.metricsByTab.strength.avgPerWeek).toBeCloseTo((2 * 7) / 365, 8);
    expect(bundle.metricsByTab.strength.avgDurationMinutes).toBeCloseTo(45, 10);
    expect(bundle.chartPointsByTab.strength.find((p) => p.monthKey === "2026-03")?.workouts).toBe(1);
    expect(bundle.chartPointsByTab.strength.find((p) => p.monthKey === "2026-06")?.workouts).toBe(1);
    expect(bundle.chartPointsByTab.strength.find((p) => p.monthKey === "2026-01")?.workouts).toBe(0);
  });

  it("buildWorkoutOverviewAnalyticsFromCalendarDays Avg per Week uses elapsed days Jan 1 through today in analytics year", () => {
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
    ];
    const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays(days, { todayDayKey: "2026-03-10" });
    expect(bundle.metricsByTab.strength.totalWorkouts).toBe(1);
    expect(bundle.metricsByTab.strength.avgPerWeek).toBeCloseTo(7 / 69, 8);
  });

  it("buildWorkoutOverviewAnalyticsFromCalendarDays avg per month = total / distinct months with sessions", () => {
    const mkDay = (day: string, id: string) => ({
      day,
      workouts: [
        {
          id,
          observedAt: `${day}T08:00:00.000Z`,
          sourceId: "manual",
          title: "Lift",
          workoutType: "strength" as const,
          start: `${day}T08:00:00.000Z`,
          end: null,
          durationMinutes: 45,
          calories: null,
        },
      ],
    });
    const days = [mkDay("2026-01-05", "a"), mkDay("2026-02-05", "b"), mkDay("2026-03-05", "c")];
    const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays(days);
    expect(bundle.metricsByTab.strength.totalWorkouts).toBe(3);
    expect(bundle.metricsByTab.strength.avgPerMonth).toBe(1);
  });

  it("buildWorkoutOverviewAnalyticsFromCalendarDays excludes long stale durations from Avg Duration only", () => {
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
    const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays(days);
    expect(bundle.metricsByTab.strength.totalWorkouts).toBe(2);
    expect(bundle.metricsByTab.strength.avgDurationMinutes).toBe(60);
  });

  it("buildWorkoutOverviewAnalyticsFromCalendarDays avgDuration null when every duration is above cap", () => {
    const days = [
      {
        day: "2026-05-01",
        workouts: [
          {
            id: "a",
            observedAt: "2026-05-01T08:00:00.000Z",
            sourceId: "apple_health",
            title: "Run",
            workoutType: "cardio" as const,
            start: "2026-05-01T08:00:00.000Z",
            end: null,
            durationMinutes: 481,
            calories: null,
          },
        ],
      },
    ];
    const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays(days);
    expect(bundle.metricsByTab.cardio.totalWorkouts).toBe(1);
    expect(bundle.metricsByTab.cardio.avgDurationMinutes).toBeNull();
  });

  // Overview: strict sessionType; reconciliation may produce mixed-type sessions (unknown bridge) excluded from both tabs.
  it("buildWorkoutOverviewAnalyticsFromCalendarDays excludes mixed sessions from strength and cardio tabs", () => {
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
    const reconciled = reconcileWorkoutSessionsForDay(dayKey, mixedDay.workouts);
    expect(reconciled).toHaveLength(1);
    expect(reconciled[0]?.sessionType).toBe("mixed");

    const bundle = buildWorkoutOverviewAnalyticsFromCalendarDays([mixedDay]);
    expect(bundle.metricsByTab.strength.totalWorkouts).toBe(0);
    expect(bundle.metricsByTab.cardio.totalWorkouts).toBe(0);
    expect(bundle.chartPointsByTab.strength.find((p) => p.monthKey === "2026-07")?.workouts).toBe(0);
    expect(bundle.chartPointsByTab.cardio.find((p) => p.monthKey === "2026-07")?.workouts).toBe(0);
  });

  describe("deriveOverviewTabSessionCounts", () => {
    it("excludes mixed sessions from both tab counts (flags may still be true via deriveSessionTypeFlags)", () => {
      const dayKey = "2026-07-15";
      const mixedDay = {
        day: dayKey,
        workouts: [
          {
            id: "str",
            observedAt: "2026-07-15T10:00:00.000Z",
            sourceId: "manual",
            title: "Lift",
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
      const sessions = reconcileWorkoutSessionsForDay(dayKey, mixedDay.workouts);
      expect(deriveOverviewTabSessionCounts(sessions)).toEqual({
        strengthSessionCount: 0,
        cardioSessionCount: 0,
      });
    });

    it("counts one strength and one cardio session the same as overview tab totals", () => {
      const day = "2026-03-20";
      const items: WorkoutHistoryItem[] = [
        {
          id: "s",
          observedAt: `${day}T17:00:00.000Z`,
          sourceId: "manual",
          title: "Push",
          workoutType: "strength",
          start: `${day}T17:00:00.000Z`,
          end: null,
          durationMinutes: 60,
          calories: null,
        },
        {
          id: "c",
          observedAt: `${day}T20:00:00.000Z`,
          sourceId: "manual",
          title: "Run",
          workoutType: "cardio",
          start: `${day}T20:00:00.000Z`,
          end: null,
          durationMinutes: 30,
          calories: null,
        },
      ];
      const sessions = reconcileWorkoutSessionsForDay(day, items);
      expect(deriveOverviewTabSessionCounts(sessions)).toEqual({
        strengthSessionCount: 1,
        cardioSessionCount: 1,
      });
    });
  });

  it("getStrengthOverviewTabSessionsForCalendarDaysAscending is earliest-first for strength-tab sessions", () => {
    const days = [
      {
        day: "2026-03-10",
        workouts: [
          {
            id: "later",
            observedAt: "2026-03-10T20:00:00.000Z",
            sourceId: "apple_health",
            title: "Lift",
            workoutType: "strength" as const,
            start: "2026-03-10T20:00:00.000Z",
            end: "2026-03-10T21:00:00.000Z",
            durationMinutes: 60,
            calories: null,
          },
        ],
      },
      {
        day: "2026-03-09",
        workouts: [
          {
            id: "earlier",
            observedAt: "2026-03-09T08:00:00.000Z",
            sourceId: "apple_health",
            title: "Lift",
            workoutType: "strength" as const,
            start: "2026-03-09T08:00:00.000Z",
            end: "2026-03-09T09:00:00.000Z",
            durationMinutes: 60,
            calories: null,
          },
        ],
      },
    ];
    const asc = getStrengthOverviewTabSessionsForCalendarDaysAscending(days);
    expect(asc.map((x) => x.session.workouts[0]?.id)).toEqual(["earlier", "later"]);
    const newestFirst = getRecentWorkoutSessionsFromCalendarDays(days, 10);
    expect(newestFirst[0]?.session.workouts[0]?.id).toBe("later");
  });
});
