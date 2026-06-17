import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import {
  NUTRITION_CARBS_G_GOAL,
  NUTRITION_FAT_G_GOAL,
  NUTRITION_KCAL_GOAL,
  NUTRITION_PROTEIN_G_GOAL,
  amountOfTargetLabel,
  goalPercentLabel,
  goalProgress,
  isFiniteNonNegative,
} from "@/lib/data/nutrition/nutritionGoals";

export type NutritionTodayRowKey = "kcal" | "protein" | "carbs" | "fat";

export type NutritionTodayMetricRow = {
  key: NutritionTodayRowKey;
  label: string;
  /** Compact total label, e.g. "100 g" / "2,000 kcal". Kept for back-compat. */
  valueLabel: string;
  /** 0–1 for bar visualization; uses static reference goals until user targets exist in-repo. */
  progress: number;
  available: boolean;
  /** Raw rounded current value, or null when not logged. */
  currentValue: number | null;
  /** Static reference target for this metric. */
  targetValue: number;
  /** Unit suffix ("kcal" | "g"). */
  unit: string;
  /** "43 / 250 g" style label. */
  amountLabel: string;
  /** "19%" style label vs target, or "—". */
  percentLabel: string;
};

export type NutritionTodayCardModel = {
  rows: readonly [NutritionTodayMetricRow, NutritionTodayMetricRow, NutritionTodayMetricRow, NutritionTodayMetricRow];
  /** Hero calorie value, e.g. "220 kcal" or "—". */
  calorieValueLabel: string;
  /** Goal subtitle for the hero, e.g. "Goal 2,000 kcal". */
  calorieGoalLabel: string;
};

function valueLabel(value: number | null | undefined, suffix = ""): string {
  if (!isFiniteNonNegative(value)) return "—";
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function row(
  key: NutritionTodayRowKey,
  label: string,
  value: number | null | undefined,
  target: number,
  unit: string,
): NutritionTodayMetricRow {
  const suffix = unit.length > 0 ? ` ${unit}` : "";
  return {
    key,
    label,
    valueLabel: valueLabel(value, suffix),
    progress: goalProgress(value, target),
    available: isFiniteNonNegative(value),
    currentValue: isFiniteNonNegative(value) ? Math.round(value) : null,
    targetValue: target,
    unit,
    amountLabel: amountOfTargetLabel(value, target, unit),
    percentLabel: goalPercentLabel(value, target),
  };
}

/**
 * Builds the Today card from DailyFacts nutrition rollup for the requested calendar day.
 * Does not fetch; caller supplies readiness and optional `nutrition` slice.
 */
export function buildNutritionTodayCardModel(args: {
  nutrition: DailyFactsDto["nutrition"] | undefined;
}): NutritionTodayCardModel {
  const n = args.nutrition;
  const kcal = n?.totalKcal;

  return {
    rows: [
      row("kcal", "Calories", kcal, NUTRITION_KCAL_GOAL, "kcal"),
      row("protein", "Protein", n?.proteinG, NUTRITION_PROTEIN_G_GOAL, "g"),
      row("carbs", "Carbs", n?.carbsG, NUTRITION_CARBS_G_GOAL, "g"),
      row("fat", "Fat", n?.fatG, NUTRITION_FAT_G_GOAL, "g"),
    ],
    calorieValueLabel: valueLabel(kcal, " kcal"),
    calorieGoalLabel: `Goal ${NUTRITION_KCAL_GOAL.toLocaleString()} kcal`,
  };
}
