/**
 * Unified Weekly Fitness card presentation model (pure).
 * All scoring / formatting lives here — JSX receives ready strings only.
 */
import {
  BODY_COMPOSITION_GOAL_VERSION,
  computeBodyCompositionGoalScoreV1,
  type BodyCompositionGoalV1,
  type BodyCompositionPrimaryMetric,
  type BodyCompositionGoalUnit,
} from "@oli/contracts";
import {
  computeWeeklyProgressV1,
  type WeeklyProgressContribution,
} from "@/lib/data/dash/weeklyProgressV1";
import {
  WEEKLY_FITNESS_BAR_FILL_COLOR,
  type WeeklyFitnessActivityMetrics,
  type WeeklyFitnessCardioMetricsFromFacts,
  type WeeklyFitnessSleepMetrics,
  type WeeklyFitnessStrengthMetricsFromFacts,
} from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { WeeklyNutritionCoverageResult } from "@/lib/data/dash/weeklyNutritionCoverage";
import type { WeeklyStressCoverageResult } from "@/lib/data/dash/ouraStressWeekly";
import type { WeeklyReadinessResult } from "@/lib/data/dash/ouraReadinessWeekly";
import {
  WEEKLY_FITNESS_METRIC_ORDER,
  WEEKLY_FITNESS_ROUTES,
  type WeeklyFitnessRowKey,
} from "@/lib/data/dash/weeklyFitnessRoutes";

export type WeeklyFitnessHeroCircleModel = {
  /** Ring fill 0..100; null → empty ring. */
  percent: number | null;
  /** Center label already formatted (`62%`, `81`, or `—`). */
  label: string;
  subtitle: string;
  accessibilityLabel: string;
  href: string;
  testID: string;
};

export type WeeklyFitnessMetricRowModel = {
  key: WeeklyFitnessRowKey;
  label: string;
  valueLabel: string;
  accessibilityLabel: string;
  /** 0..1 bar fill; null → empty track. */
  progress01: number | null;
  hasProgress: boolean;
  barColor: string;
  href: string;
};

export type WeeklyFitnessCardModel = {
  weeklyProgress: WeeklyFitnessHeroCircleModel;
  bodyComposition: WeeklyFitnessHeroCircleModel;
  /** Exactly seven rows in locked product order. */
  metrics: readonly [
    WeeklyFitnessMetricRowModel,
    WeeklyFitnessMetricRowModel,
    WeeklyFitnessMetricRowModel,
    WeeklyFitnessMetricRowModel,
    WeeklyFitnessMetricRowModel,
    WeeklyFitnessMetricRowModel,
    WeeklyFitnessMetricRowModel,
  ];
  weeklyProgressScore0to100: number | null;
  bodyCompositionScore0to100: number | null;
  eligibleWeeklyProgressCount: number;
};

export type BuildWeeklyFitnessCardModelInput = {
  activity: WeeklyFitnessActivityMetrics;
  strength: WeeklyFitnessStrengthMetricsFromFacts;
  cardio: WeeklyFitnessCardioMetricsFromFacts;
  sleep: WeeklyFitnessSleepMetrics;
  readiness: WeeklyReadinessResult;
  nutrition: WeeklyNutritionCoverageResult;
  stress: WeeklyStressCoverageResult & {
    state?: "ready" | "no_data" | "connect_oura" | "reconnect_oura" | "error" | "partial";
  };
  bodyGoal: BodyCompositionGoalV1 | null | undefined;
  latestTrusted: {
    metric: BodyCompositionPrimaryMetric | null;
    value: number | null;
    unit: BodyCompositionGoalUnit | null;
    measuredAt: string | null;
  };
  stressHrefOverride?: string | null;
  readinessHrefOverride?: string | null;
};

function buildWeeklyProgressHero(
  score0to100: number | null,
  eligibleCount: number,
): WeeklyFitnessHeroCircleModel {
  if (score0to100 == null) {
    return {
      percent: null,
      label: "\u2014",
      subtitle: "Weekly Progress",
      accessibilityLabel:
        eligibleCount < 2
          ? "Weekly Progress, not available. Need at least two plan metrics with data. Button."
          : "Weekly Progress, not available. Button.",
      href: WEEKLY_FITNESS_ROUTES.goalsEditor,
      testID: "weekly-fitness-hero-weekly-progress",
    };
  }
  return {
    percent: score0to100,
    label: `${score0to100}%`,
    subtitle: "Weekly Progress",
    accessibilityLabel: `Weekly Progress, ${score0to100} percent, plan completion across ${eligibleCount} metrics. Button.`,
    href: WEEKLY_FITNESS_ROUTES.goalsEditor,
    testID: "weekly-fitness-hero-weekly-progress",
  };
}

function buildBodyCompositionHero(input: {
  goal: BodyCompositionGoalV1 | null | undefined;
  latestTrusted: BuildWeeklyFitnessCardModelInput["latestTrusted"];
}): { hero: WeeklyFitnessHeroCircleModel; score0to100: number | null } {
  const goal = input.goal;
  if (goal == null) {
    return {
      score0to100: null,
      hero: {
        percent: null,
        label: "\u2014",
        subtitle: "Body Composition Score",
        accessibilityLabel:
          "Body Composition Score, not available. Set a body composition goal. Button.",
        href: WEEKLY_FITNESS_ROUTES.goalsEditor,
        testID: "weekly-fitness-hero-body-composition",
      },
    };
  }

  const latest = input.latestTrusted;
  const scoreInput =
    latest.metric != null &&
    latest.value != null &&
    latest.unit != null &&
    latest.measuredAt != null
      ? {
          primaryMetric: goal.primaryMetric,
          baselineValue: goal.baselineValue,
          targetValue: goal.targetValue,
          latestTrustedValue: latest.value,
          measurementUnit: latest.unit,
          goalUnit: goal.unit,
          goalPrimaryMetric: goal.primaryMetric,
          baselineAt: goal.baselineAt,
          latestMeasurementAt: latest.measuredAt,
          goalVersion: goal.version ?? BODY_COMPOSITION_GOAL_VERSION,
        }
      : null;

  const result = computeBodyCompositionGoalScoreV1(
    scoreInput && latest.metric === goal.primaryMetric ? scoreInput : null,
  );

  if (!result.available) {
    return {
      score0to100: null,
      hero: {
        percent: null,
        label: "\u2014",
        subtitle: "Body Composition Score",
        accessibilityLabel:
          "Body Composition Score, not available. Set a body composition goal. Button.",
        href: WEEKLY_FITNESS_ROUTES.goalsEditor,
        testID: "weekly-fitness-hero-body-composition",
      },
    };
  }

  return {
    score0to100: result.score0to100,
    hero: {
      percent: result.score0to100,
      label: String(result.score0to100),
      subtitle: "Body Composition Score",
      accessibilityLabel: `Body Composition Score, ${result.score0to100}, progress toward your selected body composition goal. Button.`,
      href: WEEKLY_FITNESS_ROUTES.bodyComposition,
      testID: "weekly-fitness-hero-body-composition",
    },
  };
}

function rowFromDomain(input: {
  key: WeeklyFitnessRowKey;
  label: string;
  valueLabel: string;
  accessibilityLabel: string;
  progress01: number | null;
  href: string;
}): WeeklyFitnessMetricRowModel {
  const hasProgress = input.progress01 != null && Number.isFinite(input.progress01);
  return {
    key: input.key,
    label: input.label,
    valueLabel: input.valueLabel,
    accessibilityLabel: input.accessibilityLabel,
    progress01: hasProgress ? Math.min(1, Math.max(0, input.progress01!)) : null,
    hasProgress,
    barColor: WEEKLY_FITNESS_BAR_FILL_COLOR,
    href: input.href,
  };
}

/**
 * Assemble the single Weekly Fitness card model from domain metrics.
 * Weekly Progress uses Activity/Strength/Cardio/Sleep only (min 2).
 */
export function buildWeeklyFitnessCardModel(
  input: BuildWeeklyFitnessCardModelInput,
): WeeklyFitnessCardModel {
  const contributions: WeeklyProgressContribution[] = [];

  if (
    input.activity.goalStepsPerDay > 0 &&
    input.activity.elapsedDaysWithData > 0 &&
    Number.isFinite(input.activity.goalProgress01)
  ) {
    contributions.push({ key: "activity", progress01: input.activity.goalProgress01 });
  }

  if (
    input.strength.hasTrustedData &&
    input.strength.goalWorkoutsPerWeek > 0 &&
    input.strength.goalProgress01 != null &&
    Number.isFinite(input.strength.goalProgress01)
  ) {
    contributions.push({ key: "strength", progress01: input.strength.goalProgress01 });
  }

  if (
    input.cardio.hasTrustedData &&
    input.cardio.goalMilesPerWeek > 0 &&
    input.cardio.goalProgress01 != null &&
    Number.isFinite(input.cardio.goalProgress01)
  ) {
    contributions.push({ key: "cardio", progress01: input.cardio.goalProgress01 });
  }

  if (
    input.sleep.goalHoursPerNight > 0 &&
    input.sleep.completedNightsWithData > 0 &&
    Number.isFinite(input.sleep.goalProgress01)
  ) {
    contributions.push({ key: "sleep", progress01: input.sleep.goalProgress01 });
  }

  const weekly = computeWeeklyProgressV1(contributions);
  const weeklyHero = buildWeeklyProgressHero(weekly.score0to100, weekly.eligibleContributorCount);
  const body = buildBodyCompositionHero({
    goal: input.bodyGoal,
    latestTrusted: input.latestTrusted,
  });

  const readinessHref =
    input.readinessHrefOverride ??
    (input.readiness.state === "connect_oura" || input.readiness.state === "reconnect_oura"
      ? WEEKLY_FITNESS_ROUTES.ouraConnect
      : WEEKLY_FITNESS_ROUTES.readiness);

  const stressState = input.stress.state ?? (input.stress.progress01 == null ? "no_data" : "ready");
  const stressHref =
    input.stressHrefOverride ??
    (stressState === "connect_oura" || stressState === "reconnect_oura"
      ? WEEKLY_FITNESS_ROUTES.ouraConnect
      : WEEKLY_FITNESS_ROUTES.stress);

  const sleepValue =
    input.sleep.completedNightsWithData > 0 ? input.sleep.valueLabel : "\u2014";
  const sleepA11y =
    input.sleep.completedNightsWithData > 0
      ? `Sleep, ${input.sleep.accessibilityValueLabel}, button. Opens Sleep analytics.`
      : "Sleep, not available, button. Opens Sleep analytics.";
  const sleepProgress =
    input.sleep.completedNightsWithData > 0 && input.sleep.goalHoursPerNight > 0
      ? input.sleep.goalProgress01
      : null;

  const activityValue =
    input.activity.elapsedDaysWithData > 0 || input.activity.goalStepsPerDay <= 0
      ? input.activity.valueLabel
      : "\u2014";
  const activityProgress =
    input.activity.elapsedDaysWithData > 0 && input.activity.goalStepsPerDay > 0
      ? input.activity.goalProgress01
      : null;

  const byKey: Record<WeeklyFitnessRowKey, WeeklyFitnessMetricRowModel> = {
    sleep: rowFromDomain({
      key: "sleep",
      label: "Sleep",
      valueLabel: sleepValue,
      accessibilityLabel: sleepA11y,
      progress01: sleepProgress,
      href: WEEKLY_FITNESS_ROUTES.sleep,
    }),
    readiness: rowFromDomain({
      key: "readiness",
      label: "Readiness",
      valueLabel: input.readiness.displayValue,
      accessibilityLabel: input.readiness.accessibilityLabel,
      progress01: input.readiness.progress01,
      href: readinessHref,
    }),
    activity: rowFromDomain({
      key: "activity",
      label: "Activity",
      valueLabel: activityValue,
      accessibilityLabel: `Activity, ${input.activity.accessibilityValueLabel}, button. Opens Activity analytics.`,
      progress01: activityProgress,
      href: WEEKLY_FITNESS_ROUTES.activity,
    }),
    strength: rowFromDomain({
      key: "strength",
      label: "Strength",
      valueLabel: input.strength.valueLabel,
      accessibilityLabel: `Strength, ${input.strength.accessibilityValueLabel}, button. Opens Strength analytics.`,
      progress01: input.strength.goalProgress01,
      href: WEEKLY_FITNESS_ROUTES.strength,
    }),
    cardio: rowFromDomain({
      key: "cardio",
      label: "Cardio",
      valueLabel: input.cardio.valueLabel,
      accessibilityLabel: `Cardio, ${input.cardio.accessibilityValueLabel}, button. Opens Cardio analytics.`,
      progress01: input.cardio.goalProgress01,
      href: WEEKLY_FITNESS_ROUTES.cardio,
    }),
    nutrition: rowFromDomain({
      key: "nutrition",
      label: "Nutrition",
      valueLabel: input.nutrition.displayValue,
      accessibilityLabel: input.nutrition.accessibilityLabel,
      progress01: input.nutrition.progress01,
      href: WEEKLY_FITNESS_ROUTES.nutrition,
    }),
    stress: rowFromDomain({
      key: "stress",
      label: "Stress",
      valueLabel: input.stress.displayValue,
      accessibilityLabel: input.stress.accessibilityLabel,
      progress01: input.stress.progress01,
      href: stressHref,
    }),
  };

  const ordered = WEEKLY_FITNESS_METRIC_ORDER.map((k) => byKey[k]);
  if (ordered.length !== 7) {
    throw new Error("Weekly Fitness metrics must contain exactly seven rows");
  }
  const metrics: WeeklyFitnessCardModel["metrics"] = [
    ordered[0]!,
    ordered[1]!,
    ordered[2]!,
    ordered[3]!,
    ordered[4]!,
    ordered[5]!,
    ordered[6]!,
  ];

  return {
    weeklyProgress: weeklyHero,
    bodyComposition: body.hero,
    metrics,
    weeklyProgressScore0to100: weekly.score0to100,
    bodyCompositionScore0to100: body.score0to100,
    eligibleWeeklyProgressCount: weekly.eligibleContributorCount,
  };
}
