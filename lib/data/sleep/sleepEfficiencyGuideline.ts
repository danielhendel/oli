/**
 * Versioned educational Sleep Efficiency guideline (Phase 2E-D).
 *
 * National Sleep Foundation sleep-quality context supports ~85% or greater as a
 * useful typical-efficiency threshold. Educational only — not diagnostic.
 *
 * Pure domain: no React, I/O, or Firebase. No Optimal/Good/Fair tiers.
 */

export const SLEEP_EFFICIENCY_GUIDELINE_MODEL_ID = "sleep-efficiency-guideline" as const;
export const SLEEP_EFFICIENCY_GUIDELINE_MODEL_VERSION =
  "sleep-efficiency-guideline-v1" as const;

export const SLEEP_EFFICIENCY_GUIDELINE_EVIDENCE_IDS = [
  "nsf-sleep-quality-efficiency-2017",
] as const;

/** Educational threshold percent (inclusive meets). */
export const SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT = 85 as const;

/**
 * Bounded visual domain for the two-zone threshold bar.
 * Classification still uses the unrounded actual percentage; values outside
 * clamp visually only so both zones remain readable.
 *
 * Common wearable efficiencies cluster ~70–98%; 60–100 keeps <85% and ≥85%
 * both meaningful without inventing an “above guideline” tier.
 */
export const SLEEP_EFFICIENCY_VISUAL_MIN_PERCENT = 60 as const;
export const SLEEP_EFFICIENCY_VISUAL_MAX_PERCENT = 100 as const;

export type SleepEfficiencyGuidelineStatus = "below_guideline" | "meets_guideline";

export type SleepEfficiencyGuidelineLabel =
  | "Below typical guideline"
  | "Meets typical guideline";

/** Short Your Pattern row labels. */
export type SleepEfficiencyPatternStatusLabel = "Below guideline" | "Meets guideline";

export type SleepEfficiencyGuidelineResult = {
  status: SleepEfficiencyGuidelineStatus;
  label: SleepEfficiencyGuidelineLabel;
  thresholdPercent: typeof SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT;
  normalizedPercent: number;
  modelId: typeof SLEEP_EFFICIENCY_GUIDELINE_MODEL_ID;
  modelVersion: typeof SLEEP_EFFICIENCY_GUIDELINE_MODEL_VERSION;
  evidenceIds: typeof SLEEP_EFFICIENCY_GUIDELINE_EVIDENCE_IDS;
};

export function classifySleepEfficiencyGuidelineStatus(
  normalizedPercentUnrounded: number,
): SleepEfficiencyGuidelineStatus {
  if (normalizedPercentUnrounded < SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT) {
    return "below_guideline";
  }
  return "meets_guideline";
}

export function sleepEfficiencyGuidelineStatusLabel(
  status: SleepEfficiencyGuidelineStatus,
): SleepEfficiencyGuidelineLabel {
  if (status === "below_guideline") return "Below typical guideline";
  if (status === "meets_guideline") return "Meets typical guideline";
  const _exhaustive: never = status;
  return _exhaustive;
}

export function sleepEfficiencyPatternStatusLabel(
  status: SleepEfficiencyGuidelineStatus,
): SleepEfficiencyPatternStatusLabel {
  if (status === "below_guideline") return "Below guideline";
  if (status === "meets_guideline") return "Meets guideline";
  const _exhaustive: never = status;
  return _exhaustive;
}

/**
 * Classify an unrounded normalized efficiency percentage against the 85% guideline.
 * Returns null for invalid input — never fabricates.
 */
export function classifySleepEfficiencyGuideline(
  normalizedPercentUnrounded: number | null | undefined,
): SleepEfficiencyGuidelineResult | null {
  if (
    typeof normalizedPercentUnrounded !== "number" ||
    !Number.isFinite(normalizedPercentUnrounded) ||
    normalizedPercentUnrounded < 0 ||
    normalizedPercentUnrounded > 100
  ) {
    return null;
  }
  const status = classifySleepEfficiencyGuidelineStatus(normalizedPercentUnrounded);
  return {
    status,
    label: sleepEfficiencyGuidelineStatusLabel(status),
    thresholdPercent: SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT,
    normalizedPercent: normalizedPercentUnrounded,
    modelId: SLEEP_EFFICIENCY_GUIDELINE_MODEL_ID,
    modelVersion: SLEEP_EFFICIENCY_GUIDELINE_MODEL_VERSION,
    evidenceIds: SLEEP_EFFICIENCY_GUIDELINE_EVIDENCE_IDS,
  };
}

/**
 * Classify a historical average against the same guideline.
 * Returns null when data is insufficient — never fabricates.
 */
export function classifySleepEfficiencyPatternStatus(input: {
  averagePercent: number | null | undefined;
  hasEnoughData: boolean;
}): SleepEfficiencyPatternStatusLabel | null {
  if (!input.hasEnoughData) return null;
  const result = classifySleepEfficiencyGuideline(input.averagePercent);
  if (result == null) return null;
  return sleepEfficiencyPatternStatusLabel(result.status);
}

export function sleepEfficiencyGuidelineZoneFractions(): {
  below: number;
  meets: number;
} {
  const span =
    SLEEP_EFFICIENCY_VISUAL_MAX_PERCENT - SLEEP_EFFICIENCY_VISUAL_MIN_PERCENT;
  if (!(span > 0)) {
    return { below: 0.5, meets: 0.5 };
  }
  return {
    below:
      (SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT -
        SLEEP_EFFICIENCY_VISUAL_MIN_PERCENT) /
      span,
    meets:
      (SLEEP_EFFICIENCY_VISUAL_MAX_PERCENT -
        SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT) /
      span,
  };
}

/**
 * Marker position on the visual rail (0–1). Clamped for edge visibility only;
 * does not alter classification or the displayed percentage.
 */
export function sleepEfficiencyGuidelineMarkerPosition01(
  normalizedPercentUnrounded: number,
): number {
  const span =
    SLEEP_EFFICIENCY_VISUAL_MAX_PERCENT - SLEEP_EFFICIENCY_VISUAL_MIN_PERCENT;
  if (!Number.isFinite(normalizedPercentUnrounded) || !(span > 0)) return 0.5;
  const raw =
    (normalizedPercentUnrounded - SLEEP_EFFICIENCY_VISUAL_MIN_PERCENT) / span;
  return Math.min(0.98, Math.max(0.02, raw));
}

export function sleepEfficiencyGuidelineAccessibilitySummary(input: {
  label: SleepEfficiencyGuidelineLabel;
  currentPercentDisplay: number;
}): string {
  const resultPhrase =
    input.label === "Below typical guideline"
      ? "This result is below the typical guideline."
      : "This result meets the typical guideline.";
  return [
    `${input.currentPercentDisplay} percent.`,
    `The general sleep-efficiency guideline is ${SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT} percent or higher.`,
    resultPhrase,
  ].join(" ");
}
