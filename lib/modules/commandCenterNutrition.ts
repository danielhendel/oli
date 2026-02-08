// lib/modules/commandCenterNutrition.ts
import type { Readiness } from "../contracts/readiness";
import type { DailyFactsDto } from "../contracts/dailyFacts";

export type ReadinessVocabularyState = Readiness;

export type NutritionSummaryUi = {
  totalKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

export type NutritionCommandCenterModel = {
  state: ReadinessVocabularyState;
  title: string;
  description: string;
  summary: NutritionSummaryUi | null;
  showLogCta: boolean;
  showFailuresCta: boolean;
};

export function buildNutritionCommandCenterModel(args: {
  dataReadinessState: ReadinessVocabularyState;
  factsDoc: DailyFactsDto | null;
  hasFailures: boolean;
}): NutritionCommandCenterModel {
  const { dataReadinessState, factsDoc, hasFailures } = args;

  if (dataReadinessState === "error") {
    return {
      state: "error",
      title: "Nutrition",
      description:
        "Your derived truth is currently invalid (pipeline error). Fix upstream issues or review failures to understand why nutrition cannot be computed.",
      summary: null,
      showLogCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "missing") {
    return {
      state: "missing",
      title: "Nutrition",
      description: "No events yet today — log nutrition to generate today's nutrition summary.",
      summary: null,
      showLogCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "partial") {
    return {
      state: "partial",
      title: "Nutrition",
      description:
        "Your derived truth is still building (partial). Some derived data for today may be missing until the pipeline catches up.",
      summary: null,
      showLogCta: true,
      showFailuresCta: hasFailures,
    };
  }

  // dataReadinessState === "ready"
  const nutrition = factsDoc?.nutrition;

  // Fail closed: readiness ready but nutrition missing
  if (!nutrition) {
    return {
      state: "partial",
      title: "Nutrition",
      description:
        "Derived truth is ready, but today's nutrition summary is missing from DailyFacts. This usually means no nutrition events were processed or the mapping is incomplete.",
      summary: null,
      showLogCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const hasTotalKcal = typeof nutrition.totalKcal === "number";
  const hasProteinG = typeof nutrition.proteinG === "number";
  const hasCarbsG = typeof nutrition.carbsG === "number";
  const hasFatG = typeof nutrition.fatG === "number";

  const hasAnyMetric = hasTotalKcal || hasProteinG || hasCarbsG || hasFatG;

  if (!hasAnyMetric) {
    return {
      state: "partial",
      title: "Nutrition",
      description:
        "Nutrition data exists but has no metrics (kcal, protein, carbs, or fat). Log nutrition to build today's summary.",
      summary: null,
      showLogCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const summary: NutritionSummaryUi = {};
  const totalKcalVal = nutrition.totalKcal;
  const proteinGVal = nutrition.proteinG;
  const carbsGVal = nutrition.carbsG;
  const fatGVal = nutrition.fatG;

  if (typeof totalKcalVal === "number") summary.totalKcal = totalKcalVal;
  if (typeof proteinGVal === "number") summary.proteinG = proteinGVal;
  if (typeof carbsGVal === "number") summary.carbsG = carbsGVal;
  if (typeof fatGVal === "number") summary.fatG = fatGVal;

  const parts: string[] = [];
  if (typeof totalKcalVal === "number") parts.push(`${totalKcalVal.toLocaleString()} kcal`);
  if (typeof proteinGVal === "number") parts.push(`P ${proteinGVal}g`);
  if (typeof carbsGVal === "number") parts.push(`C ${carbsGVal}g`);
  if (typeof fatGVal === "number") parts.push(`F ${fatGVal}g`);

  const description = parts.length ? `Today: ${parts.join(" • ")}` : "No nutrition metrics yet.";

  return {
    state: "ready",
    title: "Nutrition",
    description,
    summary,
    showLogCta: false,
    showFailuresCta: hasFailures,
  };
}
