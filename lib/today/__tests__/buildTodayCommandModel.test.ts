import { buildTodayCommandModel, computeTodayCompletionPercent } from "@/lib/today/buildTodayCommandModel";
import { computeCalorieIntakeProgress } from "@/lib/today/calorieProgress";
import { todayTargetAccessibilityLabel } from "@/lib/today/todayTargetAccessibility";
import { sleepNightViewForDay } from "@/lib/today/testFixtures/sleepNightViewFixtures";
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

describe("computeCalorieIntakeProgress", () => {
  it("returns notStarted when no consumption", () => {
    expect(computeCalorieIntakeProgress(null, 2000)).toEqual({ progress: 0, status: "notStarted" });
  });

  it("caps progress at 1 when over target materially", () => {
    expect(computeCalorieIntakeProgress(2300, 2000)).toEqual({ progress: 1, status: "overTarget" });
  });

  it("marks complete at target", () => {
    expect(computeCalorieIntakeProgress(2000, 2000)).toEqual({ progress: 1, status: "complete" });
  });

  it("computes partial progress under target", () => {
    const r = computeCalorieIntakeProgress(1000, 2000);
    expect(r.status).toBe("inProgress");
    expect(r.progress).toBeCloseTo(0.5);
  });
});

describe("buildTodayCommandModel", () => {
  it("preserves Oura sleep and readiness scores exactly", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      sleepNightView: sleepNightViewForDay("2026-07-05", 84),
      readinessView: {
        requestedDay: "2026-07-05",
        resolvedDay: "2026-07-05",
        isFallback: false,
        day: "2026-07-05",
        sourceId: "oura",
        score: 78,
        fetchedAt: "2026-07-05T08:00:00.000Z",
      },
    });

    expect(model.readiness.sleepScore?.value).toBe(84);
    expect(model.readiness.readinessScore?.value).toBe(78);
    expect(model.readiness.sleepScore?.sourceLabel).toBe("Oura");
    expect(model.readiness.readinessScore?.sourceLabel).toBe("Oura");
    expect(model.readiness.headline).toContain("Oura sleep 84");
    expect(model.readiness.headline).toContain("Oura readiness 78");
    expect(model.readiness.status).toBe("ready");
  });

  it("handles missing Oura readiness without crashing", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      sleepNightView: sleepNightViewForDay("2026-07-05", 80),
      readinessView: null,
    });
    expect(model.readiness.readinessScore).toBeNull();
    expect(model.readiness.sleepScore?.value).toBe(80);
    expect(model.readiness.status).toBe("partial");
    expect(model.readiness.headline).toContain("Waiting for Oura readiness");
    expect(model.readiness.headline).toContain("Sleep score is available");
  });

  it("uses recovery copy when both Oura scores are missing", () => {
    const model = buildTodayCommandModel({ ...BASE_INPUT, ouraConnected: true });
    expect(model.readiness.status).toBe("missing");
    expect(model.readiness.headline).toContain("Waiting for recovery data");
    expect(model.readiness.headline).not.toContain("Oura readiness 0");
  });

  it("does not infer sleep score from duration when score field is absent", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      sleepNightView: sleepNightViewForDay("2026-07-05"),
    });
    expect(model.readiness.sleepScore).toBeNull();
  });

  it("does not label non-Oura fallback as Oura", () => {
    const model = buildTodayCommandModel({ ...BASE_INPUT, ouraConnected: null });
    expect(model.readiness.sourceLabel).toBeNull();
  });

  it("computes activity progress from steps and daily goal", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      todayFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-07-05",
        computedAt: "2026-07-05T12:00:00.000Z",
        activity: { steps: 4200 },
      },
    });
    const activity = model.targets.find((t) => t.id === "activity");
    expect(activity?.displayValue).toBe("4,200 / 10,000 steps");
    expect(activity?.progress).toBeCloseTo(0.42);
    expect(activity?.includeInCompletion).toBe(true);
  });

  it("does not claim a daily workout prescription from weekly preference", () => {
    const model = buildTodayCommandModel({ ...BASE_INPUT });
    const workout = model.targets.find((t) => t.id === "workout");
    expect(workout?.label).toBe("Workout goal");
    expect(workout?.displayValue).toContain("/wk goal");
    expect(workout?.displayValue).not.toContain("planned");
    expect(workout?.includeInCompletion).toBe(false);
  });

  it("shows workout completion clearly when logged today", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      todayFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-07-05",
        computedAt: "2026-07-05T12:00:00.000Z",
        strength: { workoutsCount: 1, totalSets: 0, totalReps: 0, totalVolumeByUnit: {} },
      },
    });
    const workout = model.targets.find((t) => t.id === "workout");
    expect(workout?.displayValue).toContain("complete");
    expect(workout?.status).toBe("complete");
  });

  it("shows no workout scheduled when weekly strength goal is zero", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      goals: { ...DEFAULT_GOALS, strengthWorkoutsPerWeekGoal: 0 },
    });
    const workout = model.targets.find((t) => t.id === "workout");
    expect(workout?.displayValue).toBe("No workout scheduled");
    expect(workout?.status).toBe("missing");
    expect(workout?.includeInCompletion).toBe(false);
  });

  it("marks nutrition defaults and uses Food calories label", () => {
    const model = buildTodayCommandModel({ ...BASE_INPUT });
    const calories = model.targets.find((t) => t.id === "calories");
    const protein = model.targets.find((t) => t.id === "protein");
    expect(calories?.label).toBe("Food calories");
    expect(calories?.secondaryLine).toContain("Default target");
    expect(protein?.secondaryLine).toContain("Default target");
    expect(calories?.displayValue).toContain("kcal eaten");
  });

  it("excludes workout and missing targets from completion denominator", () => {
    const targets = buildTodayCommandModel({
      ...BASE_INPUT,
      goals: { ...DEFAULT_GOALS, strengthWorkoutsPerWeekGoal: 0, cardioMilesPerWeekGoal: 0 },
      todayFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-07-05",
        computedAt: "2026-07-05T12:00:00.000Z",
        activity: { steps: 5000 },
        nutrition: { totalKcal: 1000, proteinG: 75 },
      },
    }).targets;

    const pct = computeTodayCompletionPercent(targets);
    const workout = targets.find((t) => t.id === "workout");
    expect(workout?.includeInCompletion).toBe(false);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });

  it("does not let calorie overage inflate completion above 100%", () => {
    const targets = buildTodayCommandModel({
      ...BASE_INPUT,
      todayFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-07-05",
        computedAt: "2026-07-05T12:00:00.000Z",
        activity: { steps: 10000 },
        nutrition: { totalKcal: 2500, proteinG: 150 },
      },
    }).targets;
    expect(computeTodayCompletionPercent(targets)).toBeLessThanOrEqual(100);
    const calories = targets.find((t) => t.id === "calories");
    expect(calories?.status).toBe("overTarget");
    expect(calories?.progress).toBe(1);
  });

  it("includes prior-day burn context separately from food calories", () => {
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
      priorDayFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-07-04",
        computedAt: "2026-07-04T12:00:00.000Z",
        activity: { steps: 8942 },
        energy: {
          estimatedKcal: { low: 2200, high: 2600, midpoint: 2410 },
          modelVersion: "v1",
          computedAt: "",
          day: "",
          variancePct: 0,
          confidence: "moderate",
          factors: {},
          missingRequiredInputs: [],
        },
      },
    });
    expect(model.readiness.headline).toContain("8,942 steps");
    expect(model.readiness.headline).toContain("2,410 kcal burned");
    const calories = model.targets.find((t) => t.id === "calories");
    expect(calories?.displayValue).not.toContain("burned");
  });

  it("builds accessible row labels with percent complete", () => {
    const model = buildTodayCommandModel({
      ...BASE_INPUT,
      todayFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: "2026-07-05",
        computedAt: "2026-07-05T12:00:00.000Z",
        activity: { steps: 4200 },
      },
    });
    const activity = model.targets.find((t) => t.id === "activity")!;
    expect(todayTargetAccessibilityLabel(activity)).toContain("42 percent complete");
  });
});
