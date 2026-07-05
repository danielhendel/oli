import { buildTodayProgressCardRows } from "@/lib/today/buildTodayProgressCardRows";
import { buildTodayCommandModel } from "@/lib/today/buildTodayCommandModel";
import { sleepNightViewForDay } from "@/lib/today/testFixtures/sleepNightViewFixtures";
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
  sleepNightView: null,
  readinessView: null,
  ouraConnected: true,
  lastUpdatedAt: null,
};

describe("buildTodayProgressCardRows", () => {
  it("returns all 7 rows in product order", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      sleepNightView: sleepNightViewForDay("2026-07-05", 84),
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

  it("formats result-only values without targets", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      todayFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-07-05",
        computedAt: "2026-07-05T12:00:00.000Z",
        activity: { steps: 3192 },
        strength: { workoutsCount: 1, totalSets: 0, totalReps: 0, totalVolumeByUnit: {} },
        nutrition: { totalKcal: 640, proteinG: 82 },
      },
      sleepNightView: sleepNightViewForDay("2026-07-05", 84),
      readinessView: {
        requestedDay: "2026-07-05",
        resolvedDay: "2026-07-05",
        isFallback: false,
        day: "2026-07-05",
        score: 91,
      },
    });

    const rows = buildTodayProgressCardRows(model);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    const allValues = rows.map((r) => r.value).join(" ");

    expect(byId.activity?.value).toBe("3,192 steps");
    expect(byId.workout?.value).toBe("1 workout");
    expect(byId.cardio?.value).toBe("\u2014");
    expect(byId.calories?.value).toBe("640 kcal");
    expect(byId.protein?.value).toBe("82 g");
    expect(byId.sleep?.value).toBe("84");
    expect(byId.readiness?.value).toBe("91");

    expect(allValues).not.toContain("/ 10,000");
    expect(allValues).not.toContain("/ 2,000");
    expect(allValues).not.toContain("/ 150");
    expect(allValues).not.toContain("/ 1.1");
  });

  it("shows em dash when results are missing", () => {
    const model = buildTodayCommandModel({ ...BASE_INPUT });
    const rows = buildTodayProgressCardRows(model);
    for (const row of rows) {
      if (row.id === "workout") continue;
      expect(row.value).toBe("\u2014");
    }
  });

  it("does not infer sleep score from duration-only sleep night", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      sleepNightView: sleepNightViewForDay("2026-07-05"),
    });
    const sleep = buildTodayProgressCardRows(model).find((r) => r.id === "sleep");
    expect(sleep?.value).toBe("\u2014");
  });

  it("preserves exact Oura sleep score when present on sleep night", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      sleepNightView: sleepNightViewForDay("2026-07-05", 84),
    });
    const sleep = buildTodayProgressCardRows(model).find((r) => r.id === "sleep");
    expect(sleep?.value).toBe("84");
  });

  it("wires navigation targets from route helpers", () => {
    const model = buildTodayCommandModel({ ...BASE_INPUT });
    const rows = buildTodayProgressCardRows(model);
    for (const row of rows) {
      expect(row.routeTarget).toBe(todayProgressRowRoute(row.id));
    }
  });
});
