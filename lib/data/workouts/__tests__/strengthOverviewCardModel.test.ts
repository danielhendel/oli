import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  buildStrengthOverviewCardModel,
  formatStrengthOverviewCompactStatsLine,
  STRENGTH_OVERVIEW_THREE_MONTH_ROLLING_DAYS,
} from "../strengthOverviewCardModel";
import {
  buildWorkoutOverviewAnalyticsFromCalendarDays,
  monthKeyFromDay,
} from "../workoutsCalendarModel";

describe("buildStrengthOverviewCardModel", () => {
  const today = "2026-04-04" as const;
  const weekStart = "2026-03-30" as const;
  const weekEnd = "2026-04-05" as const;

  function baseInput(overrides?: Partial<Parameters<typeof buildStrengthOverviewCardModel>[0]>) {
    return {
      strengthCalendarDays: [] as const,
      analyticsDaysSlice: [] as const,
      todayDayKey: today,
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
      manualWorkoutSummaries: [] as const,
      ...overrides,
    };
  }

  it("returns four timeframes in YTD → 3 Month → MTD → This Week order", () => {
    const m = buildStrengthOverviewCardModel(baseInput());
    expect(m.timeframes.map((t) => t.key)).toEqual(["ytd", "threeMonth", "mtd", "thisWeek"]);
    expect(m.timeframes.map((t) => t.label)).toEqual(["YTD", "3 Month", "MTD", "This Week"]);
  });

  it("YTD strength metrics match buildWorkoutOverviewAnalyticsFromCalendarDays", () => {
    const analyticsDaysSlice = [
      {
        day: "2026-03-10" as const,
        workouts: [
          {
            id: "a",
            observedAt: "2026-03-10T10:00:00.000Z",
            sourceId: "apple_health",
            title: "Lift",
            workoutType: "strength" as const,
            start: "2026-03-10T10:00:00.000Z",
            end: "2026-03-10T10:30:00.000Z",
            durationMinutes: 30,
            calories: null,
          },
        ],
      },
    ];
    const direct = buildWorkoutOverviewAnalyticsFromCalendarDays(analyticsDaysSlice, { todayDayKey: today });
    const m = buildStrengthOverviewCardModel(
      baseInput({ strengthCalendarDays: analyticsDaysSlice, analyticsDaysSlice }),
    );
    const ytd = m.timeframes.find((t) => t.key === "ytd")!;
    expect(ytd.totalWorkouts).toBe(direct.metricsByTab.strength.totalWorkouts);
    expect(ytd.avgWorkoutsPerWeek).toBe(direct.metricsByTab.strength.avgPerWeek);
    expect(ytd.compactStatsSummary).toBe(
      formatStrengthOverviewCompactStatsLine(ytd.totalWorkouts, ytd.avgWorkoutsPerWeek),
    );
  });

  it("MTD uses current month only for totals vs YTD", () => {
    const days = [
      {
        day: "2026-03-28" as const,
        workouts: [
          {
            id: "mar",
            observedAt: "2026-03-28T10:00:00.000Z",
            sourceId: "apple_health",
            title: "Lift",
            workoutType: "strength" as const,
            start: "2026-03-28T10:00:00.000Z",
            end: "2026-03-28T10:30:00.000Z",
            durationMinutes: 30,
            calories: null,
          },
        ],
      },
      {
        day: "2026-04-02" as const,
        workouts: [
          {
            id: "apr",
            observedAt: "2026-04-02T10:00:00.000Z",
            sourceId: "apple_health",
            title: "Lift",
            workoutType: "strength" as const,
            start: "2026-04-02T10:00:00.000Z",
            end: "2026-04-02T10:45:00.000Z",
            durationMinutes: 45,
            calories: null,
          },
        ],
      },
    ];
    const m = buildStrengthOverviewCardModel(baseInput({ strengthCalendarDays: days, analyticsDaysSlice: days }));
    expect(monthKeyFromDay(today)).toBe("2026-04");
    const mtd = m.timeframes.find((t) => t.key === "mtd")!;
    const ytd = m.timeframes.find((t) => t.key === "ytd")!;
    expect(mtd.totalWorkouts).toBe(1);
    expect(ytd.totalWorkouts).toBe(2);
  });

  it("3 Month window uses rolling 90 calendar days through today", () => {
    const threeStartExpected = addCalendarDaysToDayKey(today, -(STRENGTH_OVERVIEW_THREE_MONTH_ROLLING_DAYS - 1));
    const days = [
      {
        day: threeStartExpected,
        workouts: [
          {
            id: "edge",
            observedAt: "2026-01-05T12:00:00.000Z",
            sourceId: "apple_health",
            title: "Lift",
            workoutType: "strength" as const,
            start: "2026-01-05T12:00:00.000Z",
            end: "2026-01-05T12:30:00.000Z",
            durationMinutes: 30,
            calories: null,
          },
        ],
      },
    ];
    const m = buildStrengthOverviewCardModel(baseInput({ strengthCalendarDays: days, analyticsDaysSlice: days }));
    const tm = m.timeframes.find((t) => t.key === "threeMonth")!;
    expect(tm.totalWorkouts).toBe(1);
  });

  it("excludes mixed reconciled sessions everywhere (reconciled session truth)", () => {
    const dayKey = "2026-07-15" as const;
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
    expect(reconcileWorkoutSessionsForDay(dayKey, mixedDay.workouts)[0]?.sessionType).toBe("mixed");

    const m = buildStrengthOverviewCardModel(
      baseInput({
        strengthCalendarDays: [mixedDay],
        analyticsDaysSlice: [mixedDay],
        todayDayKey: dayKey,
        weekStartDay: "2026-07-12" as const,
        weekEndDay: "2026-07-18" as const,
      }),
    );
    for (const tf of m.timeframes) {
      expect(tf.totalWorkouts).toBe(0);
    }
  });

  it("This Week counts only strength sessions in the calendar week slice", () => {
    const days = [
      {
        day: weekStart,
        workouts: [
          {
            id: "w",
            observedAt: "2026-03-30T10:00:00.000Z",
            sourceId: "apple_health",
            title: "Lift",
            workoutType: "strength" as const,
            start: "2026-03-30T10:00:00.000Z",
            end: "2026-03-30T10:30:00.000Z",
            durationMinutes: 30,
            calories: null,
          },
        ],
      },
    ];
    const m = buildStrengthOverviewCardModel(baseInput({ strengthCalendarDays: days, analyticsDaysSlice: days }));
    const w = m.timeframes.find((t) => t.key === "thisWeek")!;
    expect(w.totalWorkouts).toBe(1);
    expect(w.avgWorkoutsPerWeek).not.toBeNull();
  });

  it("each timeframe includes rating with label, microcopy, progress in 0..1, and finite scoringAvg", () => {
    const m = buildStrengthOverviewCardModel(baseInput());
    for (const tf of m.timeframes) {
      expect(tf.rating.label.length).toBeGreaterThan(0);
      expect(tf.rating.microcopy.length).toBeGreaterThan(0);
      expect(tf.rating.progress).toBeGreaterThanOrEqual(0);
      expect(tf.rating.progress).toBeLessThanOrEqual(1);
      expect(Number.isFinite(tf.rating.scoringAvg)).toBe(true);
      expect(tf.rating.scoringAvg).toBeGreaterThanOrEqual(0);
    }
  });

  it("documents 3-month rolling span constant", () => {
    expect(STRENGTH_OVERVIEW_THREE_MONTH_ROLLING_DAYS).toBe(90);
  });
});

describe("formatStrengthOverviewCompactStatsLine", () => {
  it("uses plural workouts and fixed decimal avg", () => {
    expect(formatStrengthOverviewCompactStatsLine(64, 4.8)).toBe("64 workouts · 4.8 / week");
  });

  it("uses singular workout for 1", () => {
    expect(formatStrengthOverviewCompactStatsLine(1, 2.5)).toBe("1 workout · 2.5 / week");
  });

  it("shows em dash when avg is null", () => {
    expect(formatStrengthOverviewCompactStatsLine(0, null)).toBe("0 workouts · — / week");
  });
});
