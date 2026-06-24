// lib/data/health-baseline/buildHealthBaselineSummary.ts
/**
 * Pure informational summary — no recommendations or goals.
 */
import type { HealthBaselineSummary, HealthBaselineSummaryInput } from "@/lib/data/health-baseline/types";
import { categoryHasUsableData } from "@/lib/data/health-baseline/scoring";

const CATEGORY_LABELS: Record<string, string> = {
  "body-composition": "Body composition",
  activity: "Activity",
  strength: "Strength training",
  cardio: "Cardio fitness",
  nutrition: "Nutrition logging",
  recovery: "Recovery & sleep",
  labs: "Lab biomarkers",
};

function categoryStrengthCopy(
  category: keyof typeof CATEGORY_LABELS,
  baseline: HealthBaselineSummaryInput["baseline"],
): string | null {
  switch (category) {
    case "body-composition": {
      if (baseline.bodyComposition.status !== "ready") return null;
      if (baseline.bodyComposition.weightKg != null) return "Current body composition metrics on file";
      return null;
    }
    case "activity": {
      if (!categoryHasUsableData(baseline.activity.status)) return null;
      if (baseline.activity.averageStepsPerDay != null) return "Consistent activity data";
      return "Activity tracking available";
    }
    case "strength": {
      if (!categoryHasUsableData(baseline.strength.status)) return null;
      if (baseline.strength.trainingFrequencyPerWeek != null) return "Strong workout history";
      return "Strength training data available";
    }
    case "cardio": {
      if (!categoryHasUsableData(baseline.cardio.status)) return null;
      return "Cardio session history available";
    }
    case "nutrition": {
      if (!categoryHasUsableData(baseline.nutrition.status)) return null;
      if (baseline.nutrition.loggingConsistencyDaysPerWeek != null) {
        return "Nutrition logging history available";
      }
      return "Nutrition data partially available";
    }
    case "recovery": {
      if (!categoryHasUsableData(baseline.recovery.status)) return null;
      if (baseline.recovery.sleepDurationMinutes != null) return "Sleep duration baseline available";
      return "Recovery signals partially available";
    }
    case "labs": {
      if (baseline.labs.latestLabsAvailable) return "Recent lab results on file";
      return null;
    }
    default:
      return null;
  }
}

function categoryMissingCopy(
  category: keyof typeof CATEGORY_LABELS,
  baseline: HealthBaselineSummaryInput["baseline"],
): string | null {
  const slice =
    category === "body-composition"
      ? baseline.bodyComposition
      : category === "activity"
        ? baseline.activity
        : category === "strength"
          ? baseline.strength
          : category === "cardio"
            ? baseline.cardio
            : category === "nutrition"
              ? baseline.nutrition
              : category === "recovery"
                ? baseline.recovery
                : baseline.labs;

  if (slice.status !== "missing") return null;
  return `No ${CATEGORY_LABELS[category]?.toLowerCase() ?? category} data`;
}

function reliableMetrics(baseline: HealthBaselineSummaryInput["baseline"]): string[] {
  const reliable: string[] = [];
  const candidates: { label: string; ready: boolean }[] = [
    {
      label: "90-day activity steps",
      ready: baseline.activity.status === "ready" && baseline.activity.averageStepsPerDay != null,
    },
    {
      label: "90-day strength frequency",
      ready:
        baseline.strength.status === "ready" && baseline.strength.trainingFrequencyPerWeek != null,
    },
    {
      label: "90-day cardio volume",
      ready:
        baseline.cardio.status === "ready" &&
        baseline.cardio.averageDistanceMilesPerWeek != null,
    },
    {
      label: "90-day sleep duration",
      ready:
        baseline.recovery.status === "ready" && baseline.recovery.sleepDurationMinutes != null,
    },
    {
      label: "Current weight",
      ready: baseline.bodyComposition.status === "ready" && baseline.bodyComposition.weightKg != null,
    },
    {
      label: "Lab biomarkers",
      ready: baseline.labs.status === "ready" && baseline.labs.biomarkerCount > 0,
    },
  ];

  for (const c of candidates) {
    if (c.ready) reliable.push(c.label);
  }
  return reliable;
}

function incompleteMetrics(baseline: HealthBaselineSummaryInput["baseline"]): string[] {
  const incomplete: string[] = [];

  const allSlices = [
    { name: "Body composition scan", slice: baseline.bodyComposition },
    { name: "Waist measurement", slice: baseline.bodyComposition },
    { name: "Estimated 1RM", slice: baseline.strength },
    { name: "VO₂ estimate", slice: baseline.cardio },
    { name: "Recent labs", slice: baseline.labs },
    { name: "HRV trend", slice: baseline.recovery },
    { name: "Macro averages", slice: baseline.nutrition },
  ];

  for (const item of allSlices) {
    if (item.slice.status === "missing") {
      incomplete.push(item.name);
      continue;
    }
    const unavailable = item.slice.metrics.filter((m) => !m.available);
    for (const m of unavailable) {
      if (!incomplete.includes(m.label)) incomplete.push(m.label);
    }
  }

  return incomplete.slice(0, 8);
}

export function buildHealthBaselineSummary(input: HealthBaselineSummaryInput): HealthBaselineSummary {
  const { baseline, currentStateProfile } = input;

  const strengths: string[] = [];
  for (const key of Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]) {
    const copy = categoryStrengthCopy(key, baseline);
    if (copy != null) strengths.push(copy);
  }

  if (currentStateProfile?.recoveryCapacity === "high" && !strengths.includes("Strong recovery signals")) {
    strengths.push("Assessment reports strong recovery capacity");
  }

  const areasMissingData: string[] = [];
  for (const key of Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]) {
    const copy = categoryMissingCopy(key, baseline);
    if (copy != null) areasMissingData.push(copy);
  }

  if (currentStateProfile != null && currentStateProfile.completionPercent < 50) {
    areasMissingData.push("Health assessment incomplete");
  }

  const mostReliableMetrics = reliableMetrics(baseline);
  const mostIncompleteMetrics = incompleteMetrics(baseline);

  return {
    strengths: strengths.slice(0, 6),
    areasMissingData: areasMissingData.slice(0, 6),
    mostReliableMetrics: mostReliableMetrics.slice(0, 5),
    mostIncompleteMetrics: mostIncompleteMetrics.slice(0, 5),
    baselineConfidence: baseline.baselineConfidence,
    dataCompleteness: baseline.dataCompleteness,
  };
}
