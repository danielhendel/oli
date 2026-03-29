import type { TodaySnapshot } from "@/lib/integrations/appleHealth/types";

export type TodayMetricKey = "steps" | "workout_min" | "estimated_calorie_burn";

export type TodayMetricRow = {
  key: TodayMetricKey;
  label: string;
  valueLabel: string;
  progress: number;
  available: boolean;
};

export type TodayOverviewModel = {
  rows: readonly [TodayMetricRow, TodayMetricRow, TodayMetricRow];
};

/**
 * Repo currently has no persisted daily targets/preferences for these metrics.
 * We use conservative static goals only for progress visualization.
 */
const STEPS_GOAL = 10_000;
const WORKOUT_MINUTES_GOAL = 30;
const ACTIVE_ENERGY_KCAL_GOAL = 500;

function clamp01(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function valueLabel(value: number | null, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "—";
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function progress(value: number | null, target: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return clamp01(value / target);
}

export function buildTodayOverviewModel(snapshot: TodaySnapshot | null): TodayOverviewModel {
  const steps = snapshot?.steps ?? null;
  const workoutMin = snapshot?.exerciseMinutes ?? null;
  const calories = snapshot?.activeEnergyKcal ?? null;

  return {
    rows: [
      {
        key: "steps",
        label: "Steps",
        valueLabel: valueLabel(steps),
        progress: progress(steps, STEPS_GOAL),
        available: typeof steps === "number" && Number.isFinite(steps) && steps >= 0,
      },
      {
        key: "workout_min",
        label: "Workout Min",
        valueLabel: valueLabel(workoutMin, " min"),
        progress: progress(workoutMin, WORKOUT_MINUTES_GOAL),
        available: typeof workoutMin === "number" && Number.isFinite(workoutMin) && workoutMin >= 0,
      },
      {
        key: "estimated_calorie_burn",
        label: "Estimated Calorie Burn",
        valueLabel: valueLabel(calories, " kcal"),
        progress: progress(calories, ACTIVE_ENERGY_KCAL_GOAL),
        available: typeof calories === "number" && Number.isFinite(calories) && calories >= 0,
      },
    ],
  };
}
