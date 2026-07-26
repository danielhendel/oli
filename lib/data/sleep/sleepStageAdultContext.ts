/**
 * Versioned educational adult-context bands for Deep / REM stage percentages.
 *
 * Broad sleep-architecture context for ages 18–64 only — not a medical diagnosis,
 * not an overall sleep-quality score, and not “more is better.”
 *
 * Pure domain: no React, I/O, or Firebase.
 */

import type { SleepNightResolution } from "@oli/contracts";

import type { SleepStageMetricId } from "@/lib/data/sleep/sleepStageMetric";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";

export const SLEEP_STAGE_ADULT_CONTEXT_MODEL_ID = "sleep-stage-adult-context" as const;
export const SLEEP_STAGE_ADULT_CONTEXT_MODEL_VERSION =
  "sleep-stage-adult-context-v1" as const;

export const SLEEP_STAGE_ADULT_CONTEXT_EVIDENCE_IDS = [
  "nsf-sleep-quality-architecture-2017",
  "adult-sleep-architecture-context",
] as const;

/** Inclusive typical Deep % of total sleep (adults 18–64). */
export const DEEP_SLEEP_ADULT_CONTEXT_LOWER_PERCENT = 16 as const;
export const DEEP_SLEEP_ADULT_CONTEXT_UPPER_PERCENT = 20 as const;

/** Inclusive typical REM % of total sleep (adults 18–64). */
export const REM_SLEEP_ADULT_CONTEXT_LOWER_PERCENT = 21 as const;
export const REM_SLEEP_ADULT_CONTEXT_UPPER_PERCENT = 30 as const;

export const SLEEP_STAGE_ADULT_CONTEXT_MIN_AGE = 18 as const;
export const SLEEP_STAGE_ADULT_CONTEXT_MAX_AGE = 64 as const;

export type SleepStageAdultContextStatus =
  | "below_typical"
  | "within_typical"
  | "above_typical";

export type SleepStageAdultContextLabel =
  | "Below typical adult context"
  | "Within typical adult context"
  | "Above typical adult context";

export type SleepStageAdultContextResult = {
  metricId: SleepStageMetricId;
  status: SleepStageAdultContextStatus;
  label: SleepStageAdultContextLabel;
  lowerPercent: number;
  upperPercent: number;
  /** Unrounded equivalent minutes from that night's totalSleepMinutes. */
  equivalentLowerMinutes: number;
  equivalentUpperMinutes: number;
  modelId: typeof SLEEP_STAGE_ADULT_CONTEXT_MODEL_ID;
  modelVersion: typeof SLEEP_STAGE_ADULT_CONTEXT_MODEL_VERSION;
  evidenceIds: typeof SLEEP_STAGE_ADULT_CONTEXT_EVIDENCE_IDS;
};

export type SleepStageAdultContextWithheldReason =
  | "unknown_age"
  | "minor"
  | "older_adult"
  | "missing_inputs"
  | "none";

export function sleepStageAdultContextBand(metricId: SleepStageMetricId): {
  lowerPercent: number;
  upperPercent: number;
} {
  if (metricId === "deep_sleep") {
    return {
      lowerPercent: DEEP_SLEEP_ADULT_CONTEXT_LOWER_PERCENT,
      upperPercent: DEEP_SLEEP_ADULT_CONTEXT_UPPER_PERCENT,
    };
  }
  if (metricId === "rem_sleep") {
    return {
      lowerPercent: REM_SLEEP_ADULT_CONTEXT_LOWER_PERCENT,
      upperPercent: REM_SLEEP_ADULT_CONTEXT_UPPER_PERCENT,
    };
  }
  const _exhaustive: never = metricId;
  return _exhaustive;
}

export function classifySleepStageAdultContextStatus(
  stagePercentUnrounded: number,
  lowerPercent: number,
  upperPercent: number,
): SleepStageAdultContextStatus {
  if (stagePercentUnrounded < lowerPercent) return "below_typical";
  if (stagePercentUnrounded <= upperPercent) return "within_typical";
  return "above_typical";
}

export function sleepStageAdultContextStatusLabel(
  status: SleepStageAdultContextStatus,
): SleepStageAdultContextLabel {
  if (status === "below_typical") return "Below typical adult context";
  if (status === "within_typical") return "Within typical adult context";
  if (status === "above_typical") return "Above typical adult context";
  const _exhaustive: never = status;
  return _exhaustive;
}

/**
 * Symmetric visual scale max so the typical band sits between equal outer zones.
 * Geometry only — classification uses absolute percentages.
 */
export function sleepStageAdultContextVisualScaleMax(metricId: SleepStageMetricId): number {
  const { lowerPercent, upperPercent } = sleepStageAdultContextBand(metricId);
  return lowerPercent + upperPercent;
}

export function sleepStageAdultContextZoneFractions(metricId: SleepStageMetricId): {
  below: number;
  typical: number;
  above: number;
} {
  const { lowerPercent, upperPercent } = sleepStageAdultContextBand(metricId);
  const scaleMax = sleepStageAdultContextVisualScaleMax(metricId);
  return {
    below: lowerPercent / scaleMax,
    typical: (upperPercent - lowerPercent) / scaleMax,
    above: lowerPercent / scaleMax,
  };
}

/**
 * Marker position on the visual rail (0–1). Clamped for edge visibility only;
 * does not alter the classified result.
 */
export function sleepStageAdultContextMarkerPosition01(input: {
  metricId: SleepStageMetricId;
  stagePercentUnrounded: number;
}): number {
  const scaleMax = sleepStageAdultContextVisualScaleMax(input.metricId);
  if (!Number.isFinite(input.stagePercentUnrounded) || scaleMax <= 0) return 0.5;
  const raw = input.stagePercentUnrounded / scaleMax;
  return Math.min(0.98, Math.max(0.02, raw));
}

export function formatSleepStageAdultContextEquivalentMinutes(input: {
  totalSleepMinutes: number;
  lowerPercent: number;
  upperPercent: number;
}): {
  equivalentLowerMinutes: number;
  equivalentUpperMinutes: number;
  formattedLower: string;
  formattedUpper: string;
  equivalentSentence: string;
} {
  const equivalentLowerMinutes = (input.totalSleepMinutes * input.lowerPercent) / 100;
  const equivalentUpperMinutes = (input.totalSleepMinutes * input.upperPercent) / 100;
  const formattedLower = formatSleepDurationMinutes(Math.round(equivalentLowerMinutes));
  const formattedUpper = formatSleepDurationMinutes(Math.round(equivalentUpperMinutes));
  return {
    equivalentLowerMinutes,
    equivalentUpperMinutes,
    formattedLower,
    formattedUpper,
    equivalentSentence: `About ${formattedLower}–${formattedUpper} for this sleep duration`,
  };
}

export function sleepStageAdultContextAccessibilitySummary(input: {
  label: SleepStageAdultContextLabel;
  lowerPercent: number;
  upperPercent: number;
  equivalentSentence: string;
}): string {
  return `${input.label}. Typical adult context is ${input.lowerPercent} to ${input.upperPercent} percent, which is ${input.equivalentSentence.toLowerCase()}.`;
}

/**
 * Classify current-night stage % against the educational adult band.
 * Returns null when population context must be withheld.
 */
export function classifySleepStageAdultContext(input: {
  metricId: SleepStageMetricId;
  stageMinutes: number | null | undefined;
  totalSleepMinutes: number | null | undefined;
  /** Unrounded stage percentage for classification. */
  stagePercentUnrounded: number | null | undefined;
  ageYears: number | null | undefined;
  isComplete?: boolean | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
}): SleepStageAdultContextResult | null {
  const {
    metricId,
    stageMinutes,
    totalSleepMinutes,
    stagePercentUnrounded,
    ageYears,
    isComplete,
    resolution,
  } = input;

  if (resolution === "latest_completed_prior_night") return null;
  if (isComplete === false) return null;

  if (ageYears == null || !Number.isFinite(ageYears)) return null;
  if (ageYears < SLEEP_STAGE_ADULT_CONTEXT_MIN_AGE) return null;
  if (ageYears > SLEEP_STAGE_ADULT_CONTEXT_MAX_AGE) return null;

  if (
    typeof stageMinutes !== "number" ||
    !Number.isFinite(stageMinutes) ||
    stageMinutes < 0
  ) {
    return null;
  }
  if (
    typeof totalSleepMinutes !== "number" ||
    !Number.isFinite(totalSleepMinutes) ||
    totalSleepMinutes <= 0
  ) {
    return null;
  }
  if (
    typeof stagePercentUnrounded !== "number" ||
    !Number.isFinite(stagePercentUnrounded)
  ) {
    return null;
  }

  const { lowerPercent, upperPercent } = sleepStageAdultContextBand(metricId);
  const status = classifySleepStageAdultContextStatus(
    stagePercentUnrounded,
    lowerPercent,
    upperPercent,
  );
  const equivalents = formatSleepStageAdultContextEquivalentMinutes({
    totalSleepMinutes,
    lowerPercent,
    upperPercent,
  });

  return {
    metricId,
    status,
    label: sleepStageAdultContextStatusLabel(status),
    lowerPercent,
    upperPercent,
    equivalentLowerMinutes: equivalents.equivalentLowerMinutes,
    equivalentUpperMinutes: equivalents.equivalentUpperMinutes,
    modelId: SLEEP_STAGE_ADULT_CONTEXT_MODEL_ID,
    modelVersion: SLEEP_STAGE_ADULT_CONTEXT_MODEL_VERSION,
    evidenceIds: SLEEP_STAGE_ADULT_CONTEXT_EVIDENCE_IDS,
  };
}

export function resolveSleepStageAdultContextWithheldReason(input: {
  ageYears: number | null | undefined;
  result: SleepStageAdultContextResult | null;
}): SleepStageAdultContextWithheldReason {
  if (input.result != null) return "none";
  const age = input.ageYears;
  if (age == null || !Number.isFinite(age)) return "unknown_age";
  if (age < SLEEP_STAGE_ADULT_CONTEXT_MIN_AGE) return "minor";
  if (age > SLEEP_STAGE_ADULT_CONTEXT_MAX_AGE) return "older_adult";
  return "missing_inputs";
}
