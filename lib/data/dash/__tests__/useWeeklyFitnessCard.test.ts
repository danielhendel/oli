import { describe, expect, it } from "@jest/globals";

import {
  clampGoalProgress01,
  computeWeeklyFitnessActivityMetrics,
  computeWeeklyFitnessCardioMetrics,
  computeWeeklyFitnessCombinedProgress,
  computeWeeklyFitnessStrengthMetrics,
  weeklyFitnessGoalStatusForProgress,
} from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import type { DayKey } from "@/lib/ui/calendar/types";

describe("clampGoalProgress01", () => {
  it("clamps to [0, 1]", () => {
    expect(clampGoalProgress01(0)).toBe(0);
    expect(clampGoalProgress01(0.5)).toBe(0.5);
    expect(clampGoalProgress01(1)).toBe(1);
    expect(clampGoalProgress01(1.5)).toBe(1);
    expect(clampGoalProgress01(-0.2)).toBe(0);
    expect(clampGoalProgress01(Number.NaN)).toBe(0);
  });
});

describe("computeWeeklyFitnessActivityMetrics", () => {
  const weekDayKeys: readonly DayKey[] = [
    "2026-05-03" as DayKey, // Sunday
    "2026-05-04" as DayKey,
    "2026-05-05" as DayKey,
    "2026-05-06" as DayKey,
    "2026-05-07" as DayKey, // today
    "2026-05-08" as DayKey,
    "2026-05-09" as DayKey,
  ];
  const todayDayKey = "2026-05-07" as DayKey;

  it("averages elapsed numeric steps; visible label is actual-only", () => {
    const rollupByDay: ActivityStepsRollupMap = {
      "2026-05-03": { kind: "numeric", steps: 8_000 },
      "2026-05-04": { kind: "numeric", steps: 12_000 },
      "2026-05-05": { kind: "numeric", steps: 9_000 },
      "2026-05-06": { kind: "numeric", steps: 10_000 },
      "2026-05-07": { kind: "numeric", steps: 9_300 },
    };
    const m = computeWeeklyFitnessActivityMetrics({
      weekDayKeys,
      todayDayKey,
      rollupByDay,
      goalStepsPerDay: 10_000,
    });
    expect(m.avgStepsPerDay).toBe(9_660);
    expect(m.elapsedDaysWithData).toBe(5);
    expect(m.goalProgress01).toBeCloseTo(0.966, 3);
    expect(m.goalStepsPerDay).toBe(10_000);
    // Visible label has no "avg" word; accessibility keeps "average steps".
    expect(m.valueLabel).toBe("9,660 steps");
    expect(m.valueLabel).not.toContain("avg");
    expect(m.accessibilityValueLabel).toBe(
      "9,660 average steps, goal 10,000 steps per day",
    );
  });

  it("falls back to 'No goal set' when goal is 0", () => {
    const rollupByDay: ActivityStepsRollupMap = {
      "2026-05-07": { kind: "numeric", steps: 7_500 },
    };
    const m = computeWeeklyFitnessActivityMetrics({
      weekDayKeys,
      todayDayKey,
      rollupByDay,
      goalStepsPerDay: 0,
    });
    expect(m.goalProgress01).toBe(0);
    expect(m.valueLabel).toBe("No goal set");
    expect(m.accessibilityValueLabel).toBe("7,500 average steps, no goal set");
  });

  it("ignores future days and non-numeric entries", () => {
    const rollupByDay: ActivityStepsRollupMap = {
      "2026-05-03": { kind: "numeric", steps: 1_000 },
      "2026-05-04": { kind: "insufficient" },
      "2026-05-05": { kind: "numeric", steps: 3_000 },
      "2026-05-08": { kind: "numeric", steps: 99_999 }, // future
      "2026-05-09": { kind: "numeric", steps: 99_999 }, // future
    };
    const m = computeWeeklyFitnessActivityMetrics({
      weekDayKeys,
      todayDayKey,
      rollupByDay,
      goalStepsPerDay: 10_000,
    });
    expect(m.elapsedDaysWithData).toBe(2);
    expect(m.avgStepsPerDay).toBe(2_000);
    expect(m.goalProgress01).toBeCloseTo(0.2, 3);
  });

  it("clamps over-goal progress to 1", () => {
    const rollupByDay: ActivityStepsRollupMap = {
      "2026-05-07": { kind: "numeric", steps: 25_000 },
    };
    const m = computeWeeklyFitnessActivityMetrics({
      weekDayKeys,
      todayDayKey,
      rollupByDay,
      goalStepsPerDay: 10_000,
    });
    expect(m.goalProgress01).toBe(1);
  });
});

function strengthDay(d: string, count: number) {
  return {
    day: d as DayKey,
    workouts: Array.from({ length: count }, (_, i) => ({
      id: `${d}-${i}`,
      observedAt: `${d}T10:00:00.000Z`,
      sourceId: "apple_health",
      title: "Lift",
      workoutType: "strength" as const,
      start: `${d}T10:00:00.000Z`,
      end: `${d}T10:30:00.000Z`,
      durationMinutes: 30,
      calories: null,
    })),
  };
}

const METERS_PER_MILE = 1609.344;
function cardioDay(d: string, miles: number) {
  return {
    day: d as DayKey,
    workouts: [
      {
        id: `${d}-cardio`,
        observedAt: `${d}T10:00:00.000Z`,
        sourceId: "apple_health",
        title: "Run",
        workoutType: "cardio" as const,
        start: `${d}T10:00:00.000Z`,
        end: `${d}T10:30:00.000Z`,
        durationMinutes: 30,
        calories: null,
        distanceMeters: miles * METERS_PER_MILE,
      },
    ],
  };
}

describe("computeWeeklyFitnessStrengthMetrics", () => {
  const weekStartDay = "2026-05-03" as DayKey;
  const weekEndDay = "2026-05-09" as DayKey;
  const todayDayKey = "2026-05-07" as DayKey;

  it("counts strength sessions in the Sun–Sat window; visible label is actual-only", () => {
    const m = computeWeeklyFitnessStrengthMetrics({
      strengthCalendarDays: [strengthDay("2026-05-03", 1), strengthDay("2026-05-05", 1), strengthDay("2026-05-07", 1)],
      todayDayKey,
      weekStartDay,
      weekEndDay,
      goalWorkoutsPerWeek: 5,
    });
    expect(m.workoutsThisWeek).toBe(3);
    expect(m.goalProgress01).toBeCloseTo(0.6, 3);
    expect(m.goalWorkoutsPerWeek).toBe(5);
    expect(m.valueLabel).toBe("3 workouts");
    expect(m.accessibilityValueLabel).toBe("3 workouts, goal 5 workouts");
  });

  it("uses singular 'workout' noun when count or goal is 1", () => {
    const single = computeWeeklyFitnessStrengthMetrics({
      strengthCalendarDays: [strengthDay("2026-05-05", 1)],
      todayDayKey,
      weekStartDay,
      weekEndDay,
      goalWorkoutsPerWeek: 1,
    });
    expect(single.valueLabel).toBe("1 workout");
    expect(single.accessibilityValueLabel).toBe("1 workout, goal 1 workout");
  });

  it("falls back to 'No goal set' when goal is 0", () => {
    const m = computeWeeklyFitnessStrengthMetrics({
      strengthCalendarDays: [strengthDay("2026-05-04", 1), strengthDay("2026-05-05", 1)],
      todayDayKey,
      weekStartDay,
      weekEndDay,
      goalWorkoutsPerWeek: 0,
    });
    expect(m.goalProgress01).toBe(0);
    expect(m.valueLabel).toBe("No goal set");
    expect(m.accessibilityValueLabel).toBe("2 workouts, no goal set");
  });
});

describe("computeWeeklyFitnessCardioMetrics", () => {
  const weekStartDay = "2026-05-03" as DayKey;
  const weekEndDay = "2026-05-09" as DayKey;

  it("sums cardio miles in the window; visible label is actual-only", () => {
    const m = computeWeeklyFitnessCardioMetrics({
      cardioCalendarDays: [
        cardioDay("2026-05-04", 1.5),
        cardioDay("2026-05-06", 0.6),
        cardioDay("2026-05-08", 0.5),
      ],
      weekStartDay,
      weekEndDay,
      goalMilesPerWeek: 10,
    });
    expect(m.totalMilesThisWeek).toBeCloseTo(2.6, 1);
    expect(m.goalProgress01).toBeCloseTo(0.26, 2);
    expect(m.goalMilesPerWeek).toBe(10);
    expect(m.valueLabel).toBe("2.6 miles");
    expect(m.accessibilityValueLabel).toBe("2.6 miles, goal 10 miles");
  });

  it("clamps over-goal progress to 1", () => {
    const m = computeWeeklyFitnessCardioMetrics({
      cardioCalendarDays: [cardioDay("2026-05-04", 30)],
      weekStartDay,
      weekEndDay,
      goalMilesPerWeek: 10,
    });
    expect(m.goalProgress01).toBe(1);
  });

  it("falls back to 'No goal set' when goal is 0", () => {
    const m = computeWeeklyFitnessCardioMetrics({
      cardioCalendarDays: [cardioDay("2026-05-04", 2.4)],
      weekStartDay,
      weekEndDay,
      goalMilesPerWeek: 0,
    });
    expect(m.goalProgress01).toBe(0);
    expect(m.valueLabel).toBe("No goal set");
    expect(m.accessibilityValueLabel).toBe("2.4 miles, no goal set");
  });
});

describe("computeWeeklyFitnessCombinedProgress", () => {
  it("averages enabled categories: 100% + 60% + 26% → 62%", () => {
    const r = computeWeeklyFitnessCombinedProgress({
      activity: { goalProgress01: 1, goalStepsPerDay: 10_000 },
      strength: { goalProgress01: 0.6, goalWorkoutsPerWeek: 5 },
      cardio: { goalProgress01: 0.26, goalMilesPerWeek: 10 },
    });
    expect(r.enabledCategoryCount).toBe(3);
    expect(r.progress).toBeCloseTo((1 + 0.6 + 0.26) / 3, 4);
    expect(r.percent).toBe(62);
  });

  it("excludes zero-goal categories from the combined average", () => {
    const r = computeWeeklyFitnessCombinedProgress({
      activity: { goalProgress01: 1, goalStepsPerDay: 10_000 },
      strength: { goalProgress01: 0.6, goalWorkoutsPerWeek: 5 },
      cardio: { goalProgress01: 0, goalMilesPerWeek: 0 },
    });
    expect(r.enabledCategoryCount).toBe(2);
    expect(r.progress).toBeCloseTo(0.8, 4);
    expect(r.percent).toBe(80);
  });

  it("returns 0% with no enabled categories when all goals are 0", () => {
    const r = computeWeeklyFitnessCombinedProgress({
      activity: { goalProgress01: 0.5, goalStepsPerDay: 0 },
      strength: { goalProgress01: 0.5, goalWorkoutsPerWeek: 0 },
      cardio: { goalProgress01: 0.5, goalMilesPerWeek: 0 },
    });
    expect(r.enabledCategoryCount).toBe(0);
    expect(r.progress).toBe(0);
    expect(r.percent).toBe(0);
  });

  it("clamps each category's progress before averaging", () => {
    const r = computeWeeklyFitnessCombinedProgress({
      activity: { goalProgress01: 5, goalStepsPerDay: 10_000 },
      strength: { goalProgress01: 0.5, goalWorkoutsPerWeek: 5 },
      cardio: { goalProgress01: 0, goalMilesPerWeek: 10 },
    });
    expect(r.enabledCategoryCount).toBe(3);
    expect(r.progress).toBeCloseTo((1 + 0.5 + 0) / 3, 4);
    expect(r.percent).toBe(50);
  });
});

describe("weeklyFitnessGoalStatusForProgress", () => {
  it("maps progress to behind / on-track / complete", () => {
    expect(weeklyFitnessGoalStatusForProgress(0)).toBe("behind");
    expect(weeklyFitnessGoalStatusForProgress(0.49)).toBe("behind");
    expect(weeklyFitnessGoalStatusForProgress(0.5)).toBe("onTrack");
    expect(weeklyFitnessGoalStatusForProgress(0.99)).toBe("onTrack");
    expect(weeklyFitnessGoalStatusForProgress(1)).toBe("complete");
    expect(weeklyFitnessGoalStatusForProgress(1.5)).toBe("complete");
  });
});
