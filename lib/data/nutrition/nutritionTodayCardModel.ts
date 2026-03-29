import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";

export type NutritionTodayRowKey = "kcal" | "protein" | "carbs" | "fat";

export type NutritionTodayMetricRow = {
  key: NutritionTodayRowKey;
  label: string;
  valueLabel: string;
  /** 0–1 for bar visualization; uses static reference goals until user targets exist in-repo. */
  progress: number;
  available: boolean;
};

export type NutritionTodayCardModel = {
  rows: readonly [NutritionTodayMetricRow, NutritionTodayMetricRow, NutritionTodayMetricRow, NutritionTodayMetricRow];
};

/**
 * Static visualization goals only (same pattern as {@link buildTodayOverviewModel}).
 * Replace with persisted targets when the product adds them.
 */
const KCAL_GOAL = 2000;
const PROTEIN_G_GOAL = 150;
const CARBS_G_GOAL = 250;
const FAT_G_GOAL = 65;

function clamp01(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

function valueLabel(value: number | null | undefined, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "—";
  return `${Math.round(value).toLocaleString()}${suffix}`;
}

function progress(value: number | null | undefined, target: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return clamp01(value / target);
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
  const protein = n?.proteinG;
  const carbs = n?.carbsG;
  const fat = n?.fatG;

  return {
    rows: [
      {
        key: "kcal",
        label: "Calories",
        valueLabel: valueLabel(kcal, " kcal"),
        progress: progress(kcal, KCAL_GOAL),
        available: typeof kcal === "number" && Number.isFinite(kcal) && kcal >= 0,
      },
      {
        key: "protein",
        label: "Protein",
        valueLabel: valueLabel(protein, " g"),
        progress: progress(protein, PROTEIN_G_GOAL),
        available: typeof protein === "number" && Number.isFinite(protein) && protein >= 0,
      },
      {
        key: "carbs",
        label: "Carbs",
        valueLabel: valueLabel(carbs, " g"),
        progress: progress(carbs, CARBS_G_GOAL),
        available: typeof carbs === "number" && Number.isFinite(carbs) && carbs >= 0,
      },
      {
        key: "fat",
        label: "Fat",
        valueLabel: valueLabel(fat, " g"),
        progress: progress(fat, FAT_G_GOAL),
        available: typeof fat === "number" && Number.isFinite(fat) && fat >= 0,
      },
    ],
  };
}
