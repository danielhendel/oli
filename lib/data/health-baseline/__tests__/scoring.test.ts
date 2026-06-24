// lib/data/health-baseline/__tests__/scoring.test.ts
import { computeBaselineConfidence, computeDataCompleteness } from "@/lib/data/health-baseline/scoring";
import type { HealthBaseline } from "@/lib/data/health-baseline/types";

function slice(status: "ready" | "partial" | "missing") {
  return { status, metrics: [] };
}

function baselineWithStatuses(
  statuses: Record<
    keyof Pick<
      HealthBaseline,
      "bodyComposition" | "activity" | "strength" | "cardio" | "nutrition" | "recovery" | "labs"
    >,
    "ready" | "partial" | "missing"
  >,
): Omit<HealthBaseline, "dataCompleteness" | "baselineConfidence"> {
  return {
    bodyComposition: { ...slice(statuses.bodyComposition), weightKg: null, bodyFatPercent: null, leanMassKg: null, waistCm: null, bmi: null, weightClassification: null },
    activity: { ...slice(statuses.activity), averageStepsPerDay: null, activeMinutesToday: null, weeklyMovementSummary: null },
    strength: { ...slice(statuses.strength), estimatedOneRmKg: null, trainingFrequencyPerWeek: null, weeklyVolumeMinutes: null, consistencyLabel: null },
    cardio: { ...slice(statuses.cardio), restingHeartRateBpm: null, averageDurationMinutesPerWeek: null, averageDistanceMilesPerWeek: null, averagePaceMinPerKm: null, vo2Estimate: null },
    nutrition: { ...slice(statuses.nutrition), averageCaloriesPerDay: null, averageProteinG: null, averageCarbsG: null, averageFatG: null, loggingConsistencyDaysPerWeek: null },
    recovery: { ...slice(statuses.recovery), sleepDurationMinutes: null, sleepConsistencyLabel: null, hrvRmssd: null, restingHeartRateBpm: null },
    labs: { ...slice(statuses.labs), latestLabsAvailable: false, labRecencyDays: null, biomarkerCount: 0, availableBiomarkers: [] },
    generatedAt: "2026-06-23T12:00:00.000Z",
  };
}

describe("baseline scoring", () => {
  it("computes completeness as percent of usable categories", () => {
    const partial = baselineWithStatuses({
      bodyComposition: "ready",
      activity: "ready",
      strength: "missing",
      cardio: "missing",
      nutrition: "partial",
      recovery: "missing",
      labs: "missing",
    });
    expect(computeDataCompleteness(partial)).toBe(43);
  });

  it("scores confidence low for sparse data", () => {
    const sparse = baselineWithStatuses({
      bodyComposition: "missing",
      activity: "partial",
      strength: "missing",
      cardio: "missing",
      nutrition: "missing",
      recovery: "missing",
      labs: "missing",
    });
    const completeness = computeDataCompleteness(sparse);
    expect(computeBaselineConfidence(sparse, completeness)).toBe("low");
  });

  it("scores confidence high when most categories are ready", () => {
    const rich = baselineWithStatuses({
      bodyComposition: "ready",
      activity: "ready",
      strength: "ready",
      cardio: "ready",
      nutrition: "ready",
      recovery: "ready",
      labs: "ready",
    });
    const completeness = computeDataCompleteness(rich);
    expect(completeness).toBe(100);
    expect(computeBaselineConfidence(rich, completeness)).toBe("high");
  });
});
