/**
 * Body Composition Goal Score V1 — progress toward the user’s selected primary
 * body-composition goal (weight | bodyFat | leanMass). Not a medical or
 * population score.
 */
import { z } from "zod";

import { dayKeySchema } from "./day";
import { isoDateTimeStringSchema } from "./rawEvent";

export const BODY_COMPOSITION_GOAL_VERSION = 1 as const;

export const bodyCompositionPrimaryMetricSchema = z.enum(["weight", "bodyFat", "leanMass"]);
export type BodyCompositionPrimaryMetric = z.infer<typeof bodyCompositionPrimaryMetricSchema>;

/**
 * Canonical storage units:
 * - weight / leanMass → kg
 * - bodyFat → percent
 */
export const bodyCompositionGoalUnitSchema = z.enum(["kg", "percent"]);
export type BodyCompositionGoalUnit = z.infer<typeof bodyCompositionGoalUnitSchema>;

export const bodyCompositionGoalV1Schema = z
  .object({
    version: z.literal(BODY_COMPOSITION_GOAL_VERSION),
    primaryMetric: bodyCompositionPrimaryMetricSchema,
    baselineValue: z.number().finite(),
    targetValue: z.number().finite(),
    unit: bodyCompositionGoalUnitSchema,
    /** ISO timestamp of the measurement used as baseline. */
    baselineAt: isoDateTimeStringSchema,
    createdAt: isoDateTimeStringSchema,
    updatedAt: isoDateTimeStringSchema,
  })
  .strip()
  .superRefine((val, ctx) => {
    if (val.baselineValue === val.targetValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetValue"],
        message: "targetValue must differ from baselineValue",
      });
    }
    if (val.primaryMetric === "bodyFat" && val.unit !== "percent") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unit"],
        message: "bodyFat goals must use unit percent",
      });
    }
    if (
      (val.primaryMetric === "weight" || val.primaryMetric === "leanMass") &&
      val.unit !== "kg"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unit"],
        message: "weight and leanMass goals must use unit kg",
      });
    }
  });

export type BodyCompositionGoalV1 = z.infer<typeof bodyCompositionGoalV1Schema>;

export function canonicalUnitForBodyCompositionMetric(
  metric: BodyCompositionPrimaryMetric,
): BodyCompositionGoalUnit {
  return metric === "bodyFat" ? "percent" : "kg";
}

export type BodyCompositionScoreInput = {
  primaryMetric: BodyCompositionPrimaryMetric;
  baselineValue: number;
  targetValue: number;
  latestTrustedValue: number;
  measurementUnit: BodyCompositionGoalUnit;
  goalUnit: BodyCompositionGoalUnit;
  goalPrimaryMetric: BodyCompositionPrimaryMetric;
  baselineAt: string;
  latestMeasurementAt: string;
  goalVersion: number;
};

export type BodyCompositionScoreResult =
  | { available: true; score0to100: number }
  | { available: false; reason: BodyCompositionScoreUnavailableReason };

export type BodyCompositionScoreUnavailableReason =
  | "missing_goal"
  | "missing_baseline"
  | "missing_target"
  | "missing_latest"
  | "baseline_equals_target"
  | "malformed_value"
  | "non_finite"
  | "unit_mismatch"
  | "metric_mismatch"
  | "version_mismatch";

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Pure Body Composition Goal Score V1.
 *
 * rawProgress = (latest - baseline) / (target - baseline)
 * score = round(clamp(rawProgress, 0, 1) × 100)
 */
export function computeBodyCompositionGoalScoreV1(
  input: BodyCompositionScoreInput | null | undefined,
): BodyCompositionScoreResult {
  if (input == null) {
    return { available: false, reason: "missing_goal" };
  }
  if (input.goalVersion !== BODY_COMPOSITION_GOAL_VERSION) {
    return { available: false, reason: "version_mismatch" };
  }
  if (input.primaryMetric !== input.goalPrimaryMetric) {
    return { available: false, reason: "metric_mismatch" };
  }
  if (input.measurementUnit !== input.goalUnit) {
    return { available: false, reason: "unit_mismatch" };
  }
  if (!isFiniteNumber(input.baselineValue)) {
    return { available: false, reason: "missing_baseline" };
  }
  if (!isFiniteNumber(input.targetValue)) {
    return { available: false, reason: "missing_target" };
  }
  if (!isFiniteNumber(input.latestTrustedValue)) {
    return { available: false, reason: "missing_latest" };
  }
  if (input.baselineValue === input.targetValue) {
    return { available: false, reason: "baseline_equals_target" };
  }
  if (
    typeof input.baselineAt !== "string" ||
    input.baselineAt.length === 0 ||
    typeof input.latestMeasurementAt !== "string" ||
    input.latestMeasurementAt.length === 0
  ) {
    return { available: false, reason: "malformed_value" };
  }

  const denom = input.targetValue - input.baselineValue;
  if (!Number.isFinite(denom) || denom === 0) {
    return { available: false, reason: "baseline_equals_target" };
  }
  const rawProgress = (input.latestTrustedValue - input.baselineValue) / denom;
  if (!Number.isFinite(rawProgress)) {
    return { available: false, reason: "non_finite" };
  }
  const clamped = Math.min(1, Math.max(0, rawProgress));
  return { available: true, score0to100: Math.round(clamped * 100) };
}

/** Optional day-key helper for goal UX timestamps that are calendar days. */
export const optionalDayKeySchema = dayKeySchema.optional();
