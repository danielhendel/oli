import { describe, expect, it } from "@jest/globals";

import {
  computeWeeklyFitnessCardioMetricsFromFacts,
  computeWeeklyFitnessStrengthMetricsFromFacts,
  WEEKLY_FITNESS_METERS_PER_MILE,
} from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { WeeklyFitnessDailyFactsByDay } from "@/lib/data/dash/useWeeklyFitnessDailyFactsRollup";
import type { DayKey } from "@/lib/ui/calendar/types";

const WEEK_DAYS: readonly DayKey[] = [
  "2026-05-03" as DayKey,
  "2026-05-04" as DayKey,
  "2026-05-05" as DayKey,
  "2026-05-06" as DayKey,
  "2026-05-07" as DayKey,
  "2026-05-08" as DayKey,
  "2026-05-09" as DayKey,
];
const WEEK_START = "2026-05-03" as DayKey;
const WEEK_END = "2026-05-09" as DayKey;

function cellsStrength(byDay: Partial<Record<DayKey, number>>): WeeklyFitnessDailyFactsByDay {
  const out: WeeklyFitnessDailyFactsByDay = {};
  for (const [day, count] of Object.entries(byDay)) {
    out[day as DayKey] = {
      settled: true,
      status: "ready",
      ...(typeof count === "number" ? { strengthWorkoutsCount: count } : {}),
    };
  }
  return out;
}

function cellsCardio(byDay: Partial<Record<DayKey, number>>): WeeklyFitnessDailyFactsByDay {
  const out: WeeklyFitnessDailyFactsByDay = {};
  for (const [day, meters] of Object.entries(byDay)) {
    out[day as DayKey] = {
      settled: true,
      status: "ready",
      ...(typeof meters === "number" ? { cardioDistanceMeters: meters } : {}),
    };
  }
  return out;
}

describe("computeWeeklyFitnessStrengthMetricsFromFacts", () => {
  it("sums strength.workoutsCount across the week", () => {
    const m = computeWeeklyFitnessStrengthMetricsFromFacts({
      factsByDay: cellsStrength({
        "2026-05-03": 1,
        "2026-05-05": 1,
        "2026-05-07": 1,
      } as Partial<Record<DayKey, number>>),
      weekDayKeys: WEEK_DAYS,
      weekStartDay: WEEK_START,
      weekEndDay: WEEK_END,
      goalWorkoutsPerWeek: 5,
    });
    expect(m.workoutsThisWeek).toBe(3);
    expect(m.goalProgress01).toBeCloseTo(0.6, 3);
    expect(m.valueLabel).toBe("3 workouts");
    expect(m.accessibilityValueLabel).toBe("3 workouts, goal 5 workouts");
  });

  it("treats missing days as zero (no error)", () => {
    const factsByDay: WeeklyFitnessDailyFactsByDay = {};
    factsByDay["2026-05-05" as DayKey] = { settled: true, status: "missing" };
    factsByDay["2026-05-07" as DayKey] = { settled: true, status: "ready", strengthWorkoutsCount: 2 };
    const m = computeWeeklyFitnessStrengthMetricsFromFacts({
      factsByDay,
      weekDayKeys: WEEK_DAYS,
      weekStartDay: WEEK_START,
      weekEndDay: WEEK_END,
      goalWorkoutsPerWeek: 5,
    });
    expect(m.workoutsThisWeek).toBe(2);
  });

  it("ignores days outside the week window", () => {
    const m = computeWeeklyFitnessStrengthMetricsFromFacts({
      factsByDay: cellsStrength({
        "2026-05-02": 99, // before week start — must be ignored
        "2026-05-03": 1,
        "2026-05-10": 99, // after week end — must be ignored
      } as Partial<Record<DayKey, number>>),
      weekDayKeys: [
        "2026-05-02" as DayKey,
        ...WEEK_DAYS,
        "2026-05-10" as DayKey,
      ],
      weekStartDay: WEEK_START,
      weekEndDay: WEEK_END,
      goalWorkoutsPerWeek: 5,
    });
    expect(m.workoutsThisWeek).toBe(1);
  });

  it("falls back to 'No goal set' when goal is 0", () => {
    const m = computeWeeklyFitnessStrengthMetricsFromFacts({
      factsByDay: cellsStrength({ "2026-05-05": 2 } as Partial<Record<DayKey, number>>),
      weekDayKeys: WEEK_DAYS,
      weekStartDay: WEEK_START,
      weekEndDay: WEEK_END,
      goalWorkoutsPerWeek: 0,
    });
    expect(m.goalProgress01).toBe(0);
    expect(m.valueLabel).toBe("No goal set");
  });
});

describe("computeWeeklyFitnessCardioMetricsFromFacts", () => {
  it("sums cardio.distanceMeters and converts to miles", () => {
    // 2.6 miles = 2.6 * 1609.344m
    const m = computeWeeklyFitnessCardioMetricsFromFacts({
      factsByDay: cellsCardio({
        "2026-05-04": 1.5 * WEEKLY_FITNESS_METERS_PER_MILE,
        "2026-05-06": 0.6 * WEEKLY_FITNESS_METERS_PER_MILE,
        "2026-05-08": 0.5 * WEEKLY_FITNESS_METERS_PER_MILE,
      } as Partial<Record<DayKey, number>>),
      weekDayKeys: WEEK_DAYS,
      weekStartDay: WEEK_START,
      weekEndDay: WEEK_END,
      goalMilesPerWeek: 10,
    });
    expect(m.totalMilesThisWeek).toBeCloseTo(2.6, 1);
    expect(m.valueLabel).toBe("2.6 miles");
    expect(m.accessibilityValueLabel).toBe("2.6 miles, goal 10 miles");
  });

  it("treats missing days as zero", () => {
    const factsByDay: WeeklyFitnessDailyFactsByDay = {};
    factsByDay["2026-05-04" as DayKey] = { settled: true, status: "missing" };
    factsByDay["2026-05-06" as DayKey] = {
      settled: true,
      status: "ready",
      cardioDistanceMeters: 5 * WEEKLY_FITNESS_METERS_PER_MILE,
    };
    const m = computeWeeklyFitnessCardioMetricsFromFacts({
      factsByDay,
      weekDayKeys: WEEK_DAYS,
      weekStartDay: WEEK_START,
      weekEndDay: WEEK_END,
      goalMilesPerWeek: 10,
    });
    expect(m.totalMilesThisWeek).toBeCloseTo(5, 3);
    expect(m.valueLabel).toBe("5.0 miles");
  });

  it("clamps over-goal progress to 1", () => {
    const m = computeWeeklyFitnessCardioMetricsFromFacts({
      factsByDay: cellsCardio({
        "2026-05-04": 30 * WEEKLY_FITNESS_METERS_PER_MILE,
      } as Partial<Record<DayKey, number>>),
      weekDayKeys: WEEK_DAYS,
      weekStartDay: WEEK_START,
      weekEndDay: WEEK_END,
      goalMilesPerWeek: 10,
    });
    expect(m.goalProgress01).toBe(1);
  });

  it("falls back to 'No goal set' when goal is 0", () => {
    const m = computeWeeklyFitnessCardioMetricsFromFacts({
      factsByDay: cellsCardio({
        "2026-05-04": 2.4 * WEEKLY_FITNESS_METERS_PER_MILE,
      } as Partial<Record<DayKey, number>>),
      weekDayKeys: WEEK_DAYS,
      weekStartDay: WEEK_START,
      weekEndDay: WEEK_END,
      goalMilesPerWeek: 0,
    });
    expect(m.goalProgress01).toBe(0);
    expect(m.valueLabel).toBe("No goal set");
  });
});
