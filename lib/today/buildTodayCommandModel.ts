import type { DailyFactsDto, ReadinessViewDto, SleepNightViewDto } from "@oli/contracts";
import { sleepNightIsAttributedToCalendarDay } from "@/lib/data/dash/dailySleepCardViewModel";
import type { WeeklyFitnessGoalsResolved } from "@/lib/preferences/weeklyFitnessGoals";
import { computeCalorieIntakeProgress } from "@/lib/today/calorieProgress";
import {
  metersToMiles,
  resolveTodayActivityStepsTarget,
  resolveTodayCardioMilesTarget,
  resolveTodayWorkoutWeeklyGoal,
  TODAY_TARGET_DEFAULTS,
} from "@/lib/today/defaults";
import { todayTargetRoute } from "@/lib/today/todayTargetRoutes";
import type {
  ScoreFact,
  TodayCommandModel,
  TodayReadinessStatus,
  TodayTargetProgress,
  TodayTargetStatus,
} from "@/lib/today/types";

export type BuildTodayCommandModelInput = {
  day: string;
  timezone: string;
  todayFacts: DailyFactsDto | null | undefined;
  priorDayFacts: DailyFactsDto | null | undefined;
  /** Live HealthKit steps overlay for today when available. */
  todayStepsOverride: number | null | undefined;
  goals: WeeklyFitnessGoalsResolved;
  calorieTargetKcal: number;
  proteinTargetG: number;
  /** Targets use placeholder nutrition goals until persisted. */
  nutritionTargetsAreDefault: boolean;
  /** Canonical sleep night for the day (`GET /users/me/sleep-night`); supplies Oura sleep score when attributed. */
  sleepNightView: SleepNightViewDto | null | undefined;
  readinessView: ReadinessViewDto | null | undefined;
  ouraConnected: boolean | null;
  lastUpdatedAt: string | null;
};

function clamp01(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function finiteNonNegative(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function statusFromProgress(progress: number, hasCurrent: boolean, hasTarget: boolean): TodayTargetStatus {
  if (!hasTarget) return "missing";
  if (!hasCurrent) return "notStarted";
  if (progress >= 1) return "complete";
  if (progress > 0) return "inProgress";
  return "notStarted";
}

function formatSteps(current: number | null, target: number | null): string {
  const cur = finiteNonNegative(current) ? Math.round(current).toLocaleString() : "—";
  if (target == null || !(target > 0)) return cur;
  return `${cur} / ${Math.round(target).toLocaleString()} steps`;
}

function formatWorkoutWeeklyDerived(current: number | null, weeklyGoal: number): string {
  const count = finiteNonNegative(current) ? current : 0;
  if (weeklyGoal <= 0) return "No workout scheduled";
  if (count > 0) {
    const noun = count === 1 ? "workout" : "workouts";
    return `${count} ${noun} today · complete`;
  }
  return `0 today · ${weeklyGoal}/wk goal`;
}

function formatMiles(current: number | null, target: number | null): string {
  const cur =
    finiteNonNegative(current) ? current.toFixed(1) : "\u2014";
  if (target == null || !(target > 0)) return cur === "\u2014" ? "\u2014 mi" : `${cur} mi`;
  return `${cur} / ${target.toFixed(1)} mi`;
}

function formatFoodCalories(current: number | null, target: number | null): string {
  const cur = finiteNonNegative(current) ? Math.round(current).toLocaleString() : "\u2014";
  if (target == null || !(target > 0)) return cur;
  return `${cur} / ${Math.round(target).toLocaleString()} kcal eaten`;
}

function formatProtein(current: number | null, target: number | null): string {
  const cur = finiteNonNegative(current) ? Math.round(current).toLocaleString() : "—";
  if (target == null || !(target > 0)) return cur;
  return `${cur} / ${Math.round(target).toLocaleString()} g`;
}

function ouraScoreFact(
  value: number | null | undefined,
  observedAt: string | null | undefined,
): ScoreFact | null {
  if (value == null || !Number.isFinite(value)) return null;
  return {
    value,
    source: "oura",
    sourceLabel: "Oura",
    observedAt: observedAt ?? null,
    confidence: "high",
  };
}

/** Oura sleep score from attributed canonical sleep night (same source as Dash Daily Sleep card). */
function scoreFactFromSleepNight(
  day: string,
  view: SleepNightViewDto | null | undefined,
): ScoreFact | null {
  if (!view || !sleepNightIsAttributedToCalendarDay(day, view)) return null;
  return ouraScoreFact(view.sleepNight.score, view.sleepNight.updatedAt ?? null);
}

function readinessStatusFromScores(
  readinessScore: number | null,
  sleepScore: number | null,
): TodayReadinessStatus {
  const score = readinessScore ?? sleepScore;
  if (score == null || !Number.isFinite(score)) return "unknown";
  if (score >= 80) return "ready";
  if (score >= 65) return "moderate";
  return "take-it-easy";
}

function buildReadinessHeadline(args: {
  status: TodayReadinessStatus;
  sleepScore: ScoreFact | null;
  readinessScore: ScoreFact | null;
  priorDaySteps: number | null;
  priorDayCaloriesBurned: number | null;
  ouraConnected: boolean | null;
}): string {
  const { status, sleepScore, readinessScore, priorDaySteps, priorDayCaloriesBurned, ouraConnected } =
    args;

  if (ouraConnected === false) {
    return "Connect Oura for sleep and Oura readiness scores. Today's plan is still available.";
  }

  const hasOuraScores = sleepScore != null || readinessScore != null;
  if (!hasOuraScores) {
    return "Waiting for recovery data. Today's plan is still available.";
  }

  if (readinessScore == null && sleepScore != null) {
    return "Waiting for Oura readiness. Sleep score is available. Today's plan is still available.";
  }

  const statusPhrase =
    status === "ready"
      ? "You're ready for an active day."
      : status === "moderate"
        ? "You're ready for a moderate day."
        : status === "take-it-easy"
          ? "Take it a bit easier today."
          : "Readiness is still settling in.";

  const parts: string[] = [statusPhrase];
  const scoreParts: string[] = [];
  if (sleepScore != null) scoreParts.push(`Oura sleep ${Math.round(sleepScore.value)}`);
  if (readinessScore != null) scoreParts.push(`Oura readiness ${Math.round(readinessScore.value)}`);
  if (scoreParts.length > 0) parts.push(scoreParts.join(" · "));

  const priorParts: string[] = [];
  if (finiteNonNegative(priorDaySteps)) {
    priorParts.push(`${Math.round(priorDaySteps).toLocaleString()} steps`);
  }
  if (finiteNonNegative(priorDayCaloriesBurned)) {
    priorParts.push(`${Math.round(priorDayCaloriesBurned).toLocaleString()} kcal burned`);
  }
  if (priorParts.length > 0) {
    parts.push(`Yesterday: ${priorParts.join(" · ")}.`);
  }

  return parts.join(" ");
}

function buildActivityTarget(
  facts: DailyFactsDto | null | undefined,
  stepsOverride: number | null | undefined,
  goals: WeeklyFitnessGoalsResolved,
): TodayTargetProgress {
  const { target, usesDefault } = resolveTodayActivityStepsTarget(goals);
  const fromFacts = facts?.activity?.steps;
  const current =
    finiteNonNegative(stepsOverride) ? stepsOverride : finiteNonNegative(fromFacts) ? fromFacts : null;
  const progress = target != null && target > 0 && current != null ? clamp01(current / target) : 0;

  return {
    id: "activity",
    label: "Activity",
    current,
    target,
    unit: "steps",
    progress,
    displayValue: formatSteps(current, target),
    status: statusFromProgress(progress, current != null, target != null),
    routeTarget: todayTargetRoute("activity"),
    usesDefaultTarget: usesDefault,
    secondaryLine: usesDefault ? "Using default step target" : null,
    includeInCompletion: target != null && target > 0,
  };
}

function buildWorkoutTarget(
  facts: DailyFactsDto | null | undefined,
  goals: WeeklyFitnessGoalsResolved,
): TodayTargetProgress {
  const { weeklyGoal, usesDefault, hasWeeklyGoal } = resolveTodayWorkoutWeeklyGoal(goals);
  const rawCount = facts?.strength?.workoutsCount;
  const current = finiteNonNegative(rawCount) ? rawCount : null;
  const hasWorkoutToday = current != null && current > 0;

  if (!hasWeeklyGoal) {
    return {
      id: "workout",
      label: "Workout goal",
      current: null,
      target: null,
      unit: "workouts",
      progress: 0,
      displayValue: "No workout scheduled",
      status: "missing",
      routeTarget: todayTargetRoute("workout"),
      usesDefaultTarget: usesDefault,
      secondaryLine: "Set a weekly strength goal in Program",
      includeInCompletion: false,
    };
  }

  return {
    id: "workout",
    label: "Workout goal",
    current,
    target: null,
    unit: "workouts",
    progress: hasWorkoutToday ? 1 : 0,
    displayValue: formatWorkoutWeeklyDerived(current, weeklyGoal),
    status: hasWorkoutToday ? "complete" : "notStarted",
    routeTarget: todayTargetRoute("workout"),
    usesDefaultTarget: usesDefault,
    secondaryLine: "Weekly preference · not a daily prescription",
    includeInCompletion: false,
  };
}

function buildCardioTarget(
  facts: DailyFactsDto | null | undefined,
  goals: WeeklyFitnessGoalsResolved,
): TodayTargetProgress {
  const { target, usesDefault } = resolveTodayCardioMilesTarget(goals);
  const meters = facts?.cardio?.distanceMeters;
  const current = finiteNonNegative(meters) ? metersToMiles(meters) : null;
  const progress = target != null && target > 0 && current != null ? clamp01(current / target) : 0;

  return {
    id: "cardio",
    label: "Cardio",
    current,
    target,
    unit: "miles",
    progress,
    displayValue: formatMiles(current, target),
    status:
      target == null
        ? "missing"
        : current == null
          ? "notStarted"
          : current >= target
            ? "complete"
            : current > 0
              ? "inProgress"
              : "notStarted",
    routeTarget: todayTargetRoute("cardio"),
    usesDefaultTarget: usesDefault,
    secondaryLine: target != null ? "Daily share of weekly cardio goal" : null,
    includeInCompletion: target != null && target > 0,
  };
}

function buildCaloriesTarget(
  facts: DailyFactsDto | null | undefined,
  target: number,
  usesDefault: boolean,
): TodayTargetProgress {
  const current = facts?.nutrition?.totalKcal ?? null;
  const { progress, status } = computeCalorieIntakeProgress(current, target);

  return {
    id: "calories",
    label: "Food calories",
    current,
    target,
    unit: "kcal",
    progress,
    displayValue: formatFoodCalories(current, target),
    status,
    routeTarget: todayTargetRoute("calories"),
    usesDefaultTarget: usesDefault,
    secondaryLine: usesDefault ? "Default target · set in Program" : null,
    includeInCompletion: target > 0,
  };
}

function buildProteinTarget(
  facts: DailyFactsDto | null | undefined,
  target: number,
  usesDefault: boolean,
): TodayTargetProgress {
  const current = facts?.nutrition?.proteinG ?? null;
  const progress =
    finiteNonNegative(current) && target > 0 ? clamp01(current / target) : 0;
  const status: TodayTargetStatus =
    current == null
      ? "notStarted"
      : progress >= 1
        ? "complete"
        : progress > 0
          ? "inProgress"
          : "notStarted";

  return {
    id: "protein",
    label: "Protein",
    current,
    target,
    unit: "g",
    progress,
    displayValue: formatProtein(current, target),
    status,
    routeTarget: todayTargetRoute("protein"),
    usesDefaultTarget: usesDefault,
    secondaryLine: usesDefault ? "Default target · set in Program" : null,
    includeInCompletion: target > 0,
  };
}

export function computeTodayCompletionPercent(targets: readonly TodayTargetProgress[]): number {
  const configured = targets.filter(
    (t) => t.includeInCompletion && t.target != null && t.target > 0 && t.status !== "missing",
  );
  if (configured.length === 0) return 0;
  const sum = configured.reduce((acc, t) => acc + clamp01(t.progress), 0);
  return Math.round((sum / configured.length) * 100);
}

export function buildTodayCommandModel(input: BuildTodayCommandModelInput): TodayCommandModel {
  const sleepScore = scoreFactFromSleepNight(input.day, input.sleepNightView);
  const readinessScore = ouraScoreFact(input.readinessView?.score, input.readinessView?.fetchedAt);

  const readinessStatus = readinessStatusFromScores(
    readinessScore?.value ?? null,
    sleepScore?.value ?? null,
  );

  const priorDaySteps = input.priorDayFacts?.activity?.steps ?? null;
  const priorEnergy =
    input.priorDayFacts?.energy?.estimatedKcal?.midpoint ??
    input.priorDayFacts?.energyInfluencers?.movement?.activeEnergyKcal ??
    null;

  const headline = buildReadinessHeadline({
    status: readinessStatus,
    sleepScore,
    readinessScore,
    priorDaySteps: finiteNonNegative(priorDaySteps) ? priorDaySteps : null,
    priorDayCaloriesBurned: finiteNonNegative(priorEnergy) ? priorEnergy : null,
    ouraConnected: input.ouraConnected,
  });

  const nutritionDefault = input.nutritionTargetsAreDefault;
  const targets: TodayTargetProgress[] = [
    buildActivityTarget(input.todayFacts, input.todayStepsOverride, input.goals),
    buildWorkoutTarget(input.todayFacts, input.goals),
    buildCardioTarget(input.todayFacts, input.goals),
    buildCaloriesTarget(input.todayFacts, input.calorieTargetKcal, nutritionDefault),
    buildProteinTarget(input.todayFacts, input.proteinTargetG, nutritionDefault),
  ];

  const completionPercent = computeTodayCompletionPercent(targets);

  const hasOura = sleepScore != null || readinessScore != null;

  return {
    day: input.day,
    timezone: input.timezone,
    completionPercent,
    readiness: {
      status: readinessStatus,
      headline,
      sleepScore,
      readinessScore,
      priorDaySteps: finiteNonNegative(priorDaySteps) ? priorDaySteps : null,
      priorDayCaloriesBurned: finiteNonNegative(priorEnergy) ? priorEnergy : null,
      sourceLabel: hasOura ? "Oura" : null,
      confidence: hasOura ? "high" : input.ouraConnected === false ? "low" : "medium",
    },
    targets,
    lastUpdatedAt: input.lastUpdatedAt,
  };
}

/** Re-export for tests documenting default layer. */
export { TODAY_TARGET_DEFAULTS };
