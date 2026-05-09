import type { DailyFactsDto } from "@/lib/contracts";

export type DailyNutritionMacroKey = "protein" | "carbs" | "fat";

export type DailyNutritionMacroRow = {
  key: DailyNutritionMacroKey;
  label: string;
  valueLabel: string;
};

export type DailyNutritionCardModel = {
  calorieLabel: string;
  hasAnyNutrition: boolean;
  rows: readonly [DailyNutritionMacroRow, DailyNutritionMacroRow, DailyNutritionMacroRow];
};

function isFiniteNonNegative(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function formatKcal(value: number | undefined): string {
  if (!isFiniteNonNegative(value)) return "—";
  return `${Math.round(value).toLocaleString()} kcal`;
}

export function formatGrams(value: number | undefined): string {
  if (!isFiniteNonNegative(value)) return "—";
  return `${Math.round(value).toLocaleString()} g`;
}

export function buildDailyNutritionCardModel(
  nutrition: DailyFactsDto["nutrition"] | undefined,
): DailyNutritionCardModel {
  const calorieLabel = formatKcal(nutrition?.totalKcal);
  const proteinLabel = formatGrams(nutrition?.proteinG);
  const carbsLabel = formatGrams(nutrition?.carbsG);
  const fatLabel = formatGrams(nutrition?.fatG);

  return {
    calorieLabel,
    hasAnyNutrition:
      calorieLabel !== "—" || proteinLabel !== "—" || carbsLabel !== "—" || fatLabel !== "—",
    rows: [
      { key: "protein", label: "Protein", valueLabel: proteinLabel },
      { key: "carbs", label: "Carbs", valueLabel: carbsLabel },
      { key: "fat", label: "Fat", valueLabel: fatLabel },
    ],
  };
}
