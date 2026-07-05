import { clampGoalProgress01 } from "@/lib/data/dash/weeklyFitnessDashProgress";
import type { ScoreFact, TodayCommandModel, TodayTargetProgress } from "@/lib/today/types";
import {
  TODAY_PROGRESS_ROW_ORDER,
  todayProgressRowRoute,
  type TodayProgressRowId,
} from "@/lib/today/todayTargetRoutes";
import { todayProgressCardAccessibilityLabel } from "@/lib/today/todayProgressCardAccessibility";

export type TodayProgressCardRow = {
  id: TodayProgressRowId;
  label: string;
  value: string;
  /** Normalized fill amount in [0, 1] for the row progress bar. */
  progress: number;
  routeTarget: string;
  accessibilityLabel: string;
};

const MISSING = "\u2014";

const CARD_LABEL_BY_TARGET_ID: Partial<Record<TodayTargetProgress["id"], string>> = {
  workout: "Workout",
  calories: "Calories",
};

function finitePositive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function progressPercentFromRatio(progress: number): number {
  return Math.round(clampGoalProgress01(progress) * 100);
}

function formatActivityResult(target: TodayTargetProgress): string {
  if (!finitePositive(target.current)) return MISSING;
  return `${Math.round(target.current).toLocaleString()} steps`;
}

function formatWorkoutResult(target: TodayTargetProgress): string {
  if (target.status === "missing" && target.displayValue === "No workout scheduled") {
    return MISSING;
  }
  if (typeof target.current === "number" && target.current > 0) {
    return target.current === 1 ? "1 workout" : `${target.current} workouts`;
  }
  return MISSING;
}

function formatCardioResult(target: TodayTargetProgress): string {
  if (!finitePositive(target.current)) return MISSING;
  return `${target.current.toFixed(1)} mi`;
}

function formatCaloriesResult(target: TodayTargetProgress): string {
  if (!finitePositive(target.current)) return MISSING;
  return `${Math.round(target.current).toLocaleString()} kcal`;
}

function formatProteinResult(target: TodayTargetProgress): string {
  if (!finitePositive(target.current)) return MISSING;
  return `${Math.round(target.current).toLocaleString()} g`;
}

function formatOuraScore(fact: ScoreFact | null): string {
  if (fact == null || !Number.isFinite(fact.value)) return MISSING;
  return String(Math.round(fact.value));
}

function cardLabelForTarget(target: TodayTargetProgress): string {
  return CARD_LABEL_BY_TARGET_ID[target.id] ?? target.label;
}

function resultValueForTarget(target: TodayTargetProgress): string {
  switch (target.id) {
    case "activity":
      return formatActivityResult(target);
    case "workout":
      return formatWorkoutResult(target);
    case "cardio":
      return formatCardioResult(target);
    case "calories":
      return formatCaloriesResult(target);
    case "protein":
      return formatProteinResult(target);
    default:
      return target.displayValue;
  }
}

function progressForTarget(target: TodayTargetProgress, value: string): number {
  if (value === MISSING) return 0;
  return clampGoalProgress01(target.progress);
}

function progressForOuraScore(fact: ScoreFact | null): number {
  if (fact == null || !Number.isFinite(fact.value)) return 0;
  return clampGoalProgress01(fact.value / 100);
}

function buildRecoveryRows(readiness: TodayCommandModel["readiness"]): TodayProgressCardRow[] {
  const sleepValue = formatOuraScore(readiness.sleepScore);
  const readinessValue = formatOuraScore(readiness.readinessScore);
  const sleepProgress = progressForOuraScore(readiness.sleepScore);
  const readinessProgress = progressForOuraScore(readiness.readinessScore);

  return [
    {
      id: "sleep",
      label: "Sleep",
      value: sleepValue,
      progress: sleepProgress,
      routeTarget: todayProgressRowRoute("sleep"),
      accessibilityLabel: todayProgressCardAccessibilityLabel(
        "Sleep",
        sleepValue,
        progressPercentFromRatio(sleepProgress),
      ),
    },
    {
      id: "readiness",
      label: "Readiness",
      value: readinessValue,
      progress: readinessProgress,
      routeTarget: todayProgressRowRoute("readiness"),
      accessibilityLabel: todayProgressCardAccessibilityLabel(
        "Readiness",
        readinessValue,
        progressPercentFromRatio(readinessProgress),
      ),
    },
  ];
}

/** Result-only Today’s Progress card rows with internal progress for blue metric bars. */
export function buildTodayProgressCardRows(model: TodayCommandModel): TodayProgressCardRow[] {
  const targetById = new Map(model.targets.map((t) => [t.id, t]));
  const recoveryById = new Map(buildRecoveryRows(model.readiness).map((r) => [r.id, r]));

  return TODAY_PROGRESS_ROW_ORDER.map((id) => {
    if (id === "sleep" || id === "readiness") {
      return recoveryById.get(id)!;
    }
    const target = targetById.get(id)!;
    const value = resultValueForTarget(target);
    const label = cardLabelForTarget(target);
    const progress = progressForTarget(target, value);
    return {
      id,
      label,
      value,
      progress,
      routeTarget: todayProgressRowRoute(id),
      accessibilityLabel: todayProgressCardAccessibilityLabel(
        label,
        value,
        progressPercentFromRatio(progress),
      ),
    };
  });
}
