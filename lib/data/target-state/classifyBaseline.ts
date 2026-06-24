// lib/data/target-state/classifyBaseline.ts
/**
 * Maps HealthBaseline numeric fields to classification domain inputs.
 * Does not fabricate missing values.
 */
import type { HealthBaseline } from "@/lib/data/health-baseline/types";
import {
  classifyActivity,
  classifyBodyComposition,
  classifyCardio,
  classifyLabs,
  classifyNutrition,
  classifyRecovery,
  classifyStrength,
} from "@/lib/classifications/classifyDomains";
import type { DomainClassificationResult } from "@/lib/classifications/types";

export function classifyHealthBaseline(
  baseline: HealthBaseline,
  sex: "male" | "female" | null,
): DomainClassificationResult[] {
  const { bodyComposition, activity, cardio, nutrition, recovery } = baseline;

  const proteinGPerKg =
    nutrition.averageProteinG != null &&
    bodyComposition.weightKg != null &&
    bodyComposition.weightKg > 0
      ? nutrition.averageProteinG / bodyComposition.weightKg
      : null;

  const sleepHours =
    recovery.sleepDurationMinutes != null
      ? recovery.sleepDurationMinutes / 60
      : null;

  return [
    classifyBodyComposition({
      sex,
      bodyFatPercent: bodyComposition.bodyFatPercent,
      bmi: bodyComposition.bmi,
      waistToHeightRatio: null,
    }),
    classifyActivity({
      dailySteps: activity.averageStepsPerDay,
      weeklyActivityMinutes: null,
    }),
    classifyStrength({
      sex,
      benchPressKg: null,
      squatKg: null,
      bodyWeightKg: bodyComposition.weightKg,
    }),
    classifyCardio({
      restingHeartRateBpm: cardio.restingHeartRateBpm ?? recovery.restingHeartRateBpm,
      vo2MaxPercentile: null,
    }),
    classifyNutrition({
      proteinGPerKg,
      fiberGPerDay: null,
    }),
    classifyRecovery({
      sleepDurationHours: sleepHours,
      bedtimeVarianceMinutes: null,
    }),
    classifyLabs({
      hba1cPercent: null,
      systolicBp: null,
      diastolicBp: null,
    }),
  ];
}
