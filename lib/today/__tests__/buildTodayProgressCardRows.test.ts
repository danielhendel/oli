import { buildTodayProgressCardRows } from "@/lib/today/buildTodayProgressCardRows";
import { buildTodayCommandModel } from "@/lib/today/buildTodayCommandModel";
import { todayProgressRowRoute } from "@/lib/today/todayTargetRoutes";
import { WEEKLY_FITNESS_GOAL_DEFAULTS } from "@oli/contracts";
import type { WeeklyFitnessGoalsResolved } from "@/lib/preferences/weeklyFitnessGoals";

const DEFAULT_GOALS: WeeklyFitnessGoalsResolved = {
  activityStepsPerDayGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.activityStepsPerDayGoal,
  strengthWorkoutsPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.strengthWorkoutsPerWeekGoal,
  cardioMilesPerWeekGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.cardioMilesPerWeekGoal,
  sleepHoursPerNightGoal: WEEKLY_FITNESS_GOAL_DEFAULTS.sleepHoursPerNightGoal,
  isDefault: true,
};

const BASE_INPUT = {
  day: "2026-07-05",
  timezone: "America/New_York",
  todayFacts: null,
  priorDayFacts: null,
  todayStepsOverride: null,
  goals: DEFAULT_GOALS,
  calorieTargetKcal: 2000,
  proteinTargetG: 150,
  nutritionTargetsAreDefault: true,
  sleepView: null,
  readinessView: null,
  ouraConnected: true,
  lastUpdatedAt: null,
};

describe("buildTodayProgressCardRows", () => {
  it("returns all 7 rows in product order", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      sleepView: {
        requestedDay: "2026-07-05",
        resolvedDay: "2026-07-05",
        isFallback: false,
        day: "2026-07-05",
        score: 84,
      },
      readinessView: {
        requestedDay: "2026-07-05",
        resolvedDay: "2026-07-05",
        isFallback: false,
        day: "2026-07-05",
        score: 78,
      },
    });

    const rows = buildTodayProgressCardRows(model);
    expect(rows.map((r) => r.id)).toEqual([
      "activity",
      "workout",
      "cardio",
      "calories",
      "protein",
      "sleep",
      "readiness",
    ]);
  });

  it("uses compact card labels and values", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      todayFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-07-05",
        computedAt: "2026-07-05T12:00:00.000Z",
        activity: { steps: 2877 },
        strength: { workoutsCount: 1, totalSets: 0, totalReps: 0, totalVolumeByUnit: {} },
        nutrition: { totalKcal: 1200, proteinG: 80 },
      },
      sleepView: {
        requestedDay: "2026-07-05",
        resolvedDay: "2026-07-05",
        isFallback: false,
        day: "2026-07-05",
        score: 84,
      },
      readinessView: {
        requestedDay: "2026-07-05",
        resolvedDay: "2026-07-05",
        isFallback: false,
        day: "2026-07-05",
        score: 78,
      },
    });

    const rows = buildTodayProgressCardRows(model);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

    expect(byId.activity?.displayValue).toBe("2,877 / 10,000 steps");
    expect(byId.workout?.label).toBe("Workout");
    expect(byId.workout?.displayValue).toBe("1 workout");
    expect(byId.calories?.label).toBe("Calories");
    expect(byId.calories?.displayValue).toContain("kcal eaten");
    expect(byId.sleep?.displayValue).toBe("84");
    expect(byId.readiness?.displayValue).toBe("78");
  });

  it("shows em dash when recovery scores are missing", () => {
    const model = buildTodayCommandModel({ ...BASE_INPUT });
    const rows = buildTodayProgressCardRows(model);
    const sleep = rows.find((r) => r.id === "sleep");
    const readiness = rows.find((r) => r.id === "readiness");
    expect(sleep?.displayValue).toBe("\u2014");
    expect(readiness?.displayValue).toBe("\u2014");
  });

  it("wires navigation targets from route helpers", () => {
    const model = buildTodayCommandModel({ ...BASE_INPUT });
    const rows = buildTodayProgressCardRows(model);
    for (const row of rows) {
      expect(row.routeTarget).toBe(todayProgressRowRoute(row.id));
    }
  });
});
