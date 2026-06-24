// lib/data/health-baseline/scoring.ts
import type {
  BaselineCategoryStatus,
  BaselineConfidence,
  HealthBaseline,
  HealthBaselineCategory,
} from "@/lib/data/health-baseline/types";
import { HEALTH_BASELINE_CATEGORIES } from "@/lib/data/health-baseline/types";

const LBS_PER_KG = 2.2046226218;

export function formatKgAsLbs(kg: number): string {
  return `${Math.round(kg * LBS_PER_KG)} lbs`;
}

export function formatKg(kg: number): string {
  return `${kg.toFixed(1)} kg`;
}

export function categoryHasUsableData(status: BaselineCategoryStatus): boolean {
  return status === "ready" || status === "partial";
}

export function computeDataCompleteness(baseline: Omit<HealthBaseline, "dataCompleteness" | "baselineConfidence">): number {
  const categories = HEALTH_BASELINE_CATEGORIES;
  let usable = 0;
  for (const category of categories) {
    const slice = baseline[categoryKeyToField(category)];
    if (categoryHasUsableData(slice.status)) usable += 1;
  }
  return categories.length > 0 ? Math.round((usable / categories.length) * 100) : 0;
}

function categoryKeyToField(
  category: HealthBaselineCategory,
): keyof Pick<
  HealthBaseline,
  "bodyComposition" | "activity" | "strength" | "cardio" | "nutrition" | "recovery" | "labs"
> {
  switch (category) {
    case "body-composition":
      return "bodyComposition";
    case "activity":
      return "activity";
    case "strength":
      return "strength";
    case "cardio":
      return "cardio";
    case "nutrition":
      return "nutrition";
    case "recovery":
      return "recovery";
    case "labs":
      return "labs";
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

export function computeBaselineConfidence(
  baseline: Omit<HealthBaseline, "baselineConfidence" | "dataCompleteness">,
  dataCompleteness: number,
): BaselineConfidence {
  let readyCount = 0;
  let partialCount = 0;

  for (const category of HEALTH_BASELINE_CATEGORIES) {
    const status = baseline[categoryKeyToField(category)].status;
    if (status === "ready") readyCount += 1;
    else if (status === "partial") partialCount += 1;
  }

  const weightedScore = readyCount * 2 + partialCount;

  if (dataCompleteness >= 70 && readyCount >= 5) return "high";
  if (dataCompleteness >= 85 && readyCount >= 4) return "high";
  if (weightedScore >= 8 || (dataCompleteness >= 50 && readyCount >= 3)) return "moderate";
  if (weightedScore >= 3 || dataCompleteness >= 25) return "moderate";
  return "low";
}

export function daysSinceIso(iso: string | null | undefined, nowMs: number): number | null {
  if (iso == null || iso.length === 0) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  const diffMs = nowMs - parsed;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function classifyCategoryStatus(availableMetricCount: number, primaryAvailable: boolean): BaselineCategoryStatus {
  if (primaryAvailable && availableMetricCount >= 2) return "ready";
  if (primaryAvailable || availableMetricCount >= 1) return "partial";
  return "missing";
}
