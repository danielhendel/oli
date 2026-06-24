// lib/classifications/classifyDomains.ts
import { classifyMetric } from "@/lib/classifications/classifyMetric";
import type { ActivityClassificationInput } from "@/lib/classifications/activity";
import { DAILY_STEPS_METRIC, WEEKLY_ACTIVITY_MINUTES_METRIC } from "@/lib/classifications/activity";
import type { BodyCompositionClassificationInput } from "@/lib/classifications/bodyComposition";
import {
  BMI_METRIC,
  BODY_FAT_PERCENT_FEMALE,
  BODY_FAT_PERCENT_MALE,
  WAIST_TO_HEIGHT_RATIO_METRIC,
} from "@/lib/classifications/bodyComposition";
import type { CardioClassificationInput } from "@/lib/classifications/cardio";
import { RESTING_HEART_RATE_METRIC, VO2_MAX_PERCENTILE_METRIC } from "@/lib/classifications/cardio";
import type { LabsClassificationInput } from "@/lib/classifications/labs";
import {
  DIASTOLIC_BP_METRIC,
  HBA1C_PERCENT_METRIC,
  SYSTOLIC_BP_METRIC,
  worseClassificationLevel,
} from "@/lib/classifications/labs";
import type { NutritionClassificationInput } from "@/lib/classifications/nutrition";
import { FIBER_G_PER_DAY_METRIC, PROTEIN_G_PER_KG_METRIC } from "@/lib/classifications/nutrition";
import type { RecoveryClassificationInput } from "@/lib/classifications/recovery";
import {
  SLEEP_CONSISTENCY_VARIANCE_METRIC,
  SLEEP_DURATION_HOURS_METRIC,
} from "@/lib/classifications/recovery";
import type { StrengthClassificationInput } from "@/lib/classifications/strength";
import {
  BENCH_PRESS_BW_FEMALE,
  BENCH_PRESS_BW_MALE,
  SQUAT_BW_FEMALE,
  SQUAT_BW_MALE,
} from "@/lib/classifications/strength";
import type { ClassificationResult, DomainClassificationResult } from "@/lib/classifications/types";
import { CLASSIFICATION_FRAMEWORK_VERSION } from "@/lib/classifications/types";

function domainResult(
  domain: DomainClassificationResult["domain"],
  metrics: ClassificationResult[],
): DomainClassificationResult {
  return {
    domain,
    version: CLASSIFICATION_FRAMEWORK_VERSION,
    metrics,
  };
}

function relativeStrengthMultiple(liftKg: number | null | undefined, bodyWeightKg: number | null | undefined): number | null {
  if (liftKg == null || bodyWeightKg == null) return null;
  if (!Number.isFinite(liftKg) || !Number.isFinite(bodyWeightKg) || bodyWeightKg <= 0) return null;
  return liftKg / bodyWeightKg;
}

export function classifyBodyComposition(
  input: BodyCompositionClassificationInput,
): DomainClassificationResult {
  const metrics: ClassificationResult[] = [];

  if (input.bodyFatPercent != null) {
    if (input.sex === "female") {
      metrics.push(classifyMetric(BODY_FAT_PERCENT_FEMALE, input.bodyFatPercent));
    } else if (input.sex === "male") {
      metrics.push(classifyMetric(BODY_FAT_PERCENT_MALE, input.bodyFatPercent));
    } else {
      metrics.push({
        status: "unavailable",
        metricId: "body-fat-percent",
        version: CLASSIFICATION_FRAMEWORK_VERSION,
        domain: "body-composition",
        reason: "unsupported_sex",
      });
    }
  }

  metrics.push(classifyMetric(BMI_METRIC, input.bmi ?? null));
  metrics.push(classifyMetric(WAIST_TO_HEIGHT_RATIO_METRIC, input.waistToHeightRatio ?? null));

  return domainResult("body-composition", metrics);
}

export function classifyActivity(input: ActivityClassificationInput): DomainClassificationResult {
  return domainResult("activity", [
    classifyMetric(DAILY_STEPS_METRIC, input.dailySteps ?? null),
    classifyMetric(WEEKLY_ACTIVITY_MINUTES_METRIC, input.weeklyActivityMinutes ?? null),
  ]);
}

export function classifyStrength(input: StrengthClassificationInput): DomainClassificationResult {
  const benchMultiple = relativeStrengthMultiple(input.benchPressKg, input.bodyWeightKg);
  const squatMultiple = relativeStrengthMultiple(input.squatKg, input.bodyWeightKg);

  if (input.sex === "female") {
    return domainResult("strength", [
      classifyMetric(BENCH_PRESS_BW_FEMALE, benchMultiple),
      classifyMetric(SQUAT_BW_FEMALE, squatMultiple),
    ]);
  }

  if (input.sex === "male") {
    return domainResult("strength", [
      classifyMetric(BENCH_PRESS_BW_MALE, benchMultiple),
      classifyMetric(SQUAT_BW_MALE, squatMultiple),
    ]);
  }

  return domainResult("strength", [
    {
      status: "unavailable",
      metricId: "bench-press-bw",
      version: CLASSIFICATION_FRAMEWORK_VERSION,
      domain: "strength",
      reason: "unsupported_sex",
    },
    {
      status: "unavailable",
      metricId: "squat-bw",
      version: CLASSIFICATION_FRAMEWORK_VERSION,
      domain: "strength",
      reason: "unsupported_sex",
    },
  ]);
}

export function classifyCardio(input: CardioClassificationInput): DomainClassificationResult {
  return domainResult("cardio", [
    classifyMetric(RESTING_HEART_RATE_METRIC, input.restingHeartRateBpm ?? null),
    classifyMetric(VO2_MAX_PERCENTILE_METRIC, input.vo2MaxPercentile ?? null),
  ]);
}

export function classifyRecovery(input: RecoveryClassificationInput): DomainClassificationResult {
  return domainResult("recovery", [
    classifyMetric(SLEEP_DURATION_HOURS_METRIC, input.sleepDurationHours ?? null),
    classifyMetric(SLEEP_CONSISTENCY_VARIANCE_METRIC, input.bedtimeVarianceMinutes ?? null),
  ]);
}

export function classifyNutrition(input: NutritionClassificationInput): DomainClassificationResult {
  return domainResult("nutrition", [
    classifyMetric(PROTEIN_G_PER_KG_METRIC, input.proteinGPerKg ?? null),
    classifyMetric(FIBER_G_PER_DAY_METRIC, input.fiberGPerDay ?? null),
  ]);
}

export function classifyLabs(input: LabsClassificationInput): DomainClassificationResult {
  const metrics: ClassificationResult[] = [
    classifyMetric(HBA1C_PERCENT_METRIC, input.hba1cPercent ?? null),
    classifyMetric(SYSTOLIC_BP_METRIC, input.systolicBp ?? null),
    classifyMetric(DIASTOLIC_BP_METRIC, input.diastolicBp ?? null),
  ];

  const sys = metrics.find((m) => m.status === "classified" && m.metricId === "systolic-bp");
  const dia = metrics.find((m) => m.status === "classified" && m.metricId === "diastolic-bp");

  if (sys?.status === "classified" && dia?.status === "classified") {
    const combinedLevel = worseClassificationLevel(sys.level, dia.level) as 1 | 2 | 3 | 4 | 5;
    metrics.push({
      status: "classified",
      metricId: "blood-pressure-combined",
      version: CLASSIFICATION_FRAMEWORK_VERSION,
      domain: "labs",
      level: combinedLevel,
      levelLabel:
        combinedLevel === 5
          ? "Optimal"
          : combinedLevel === 4
            ? "Above Average"
            : combinedLevel === 3
              ? "Average"
              : combinedLevel === 2
                ? "Below Average"
                : "High Risk",
      value: input.systolicBp ?? 0,
      displayName: "Blood pressure (combined)",
    });
  } else if (input.systolicBp != null || input.diastolicBp != null) {
    metrics.push({
      status: "unavailable",
      metricId: "blood-pressure-combined",
      version: CLASSIFICATION_FRAMEWORK_VERSION,
      domain: "labs",
      reason: "missing_value",
    });
  }

  return domainResult("labs", metrics);
}
