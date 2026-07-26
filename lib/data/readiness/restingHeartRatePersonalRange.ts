/**
 * Versioned personal usual-range model for overnight lowest heart rate (Phase 2F-B).
 *
 * modelId: resting-heart-rate-personal-range
 * modelVersion: resting-heart-rate-personal-range-v1
 *
 * Statistical method (deterministic, robust):
 * - Collect valid attributed overnight lowestHeartRateBpm samples from the
 *   selected-day–inclusive 90-day window (see averages collector).
 * - Require ≥ {@link RESTING_HEART_RATE_PERSONAL_RANGE_MIN_VALID_NIGHTS} samples.
 * - Sort ascending; compute median and the closed interquartile range (IQR):
 *   lower bound = 25th percentile, upper bound = 75th percentile, using linear
 *   interpolation on sorted ranks (Hyndman & Fan type-7 / common R default).
 * - When Q1 === Q3 (identical mid-distribution), expand the usual band to
 *   median ± {@link RESTING_HEART_RATE_PERSONAL_RANGE_MIN_HALF_WIDTH_BPM} so the
 *   inclusive classification still has a meaningful middle zone.
 *
 * Descriptive only — not optimal, recommended, healthy, normal, or clinical.
 * Does not imply lower is better. Pure domain: no React, I/O, or Firebase.
 */

export const RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_ID =
  "resting-heart-rate-personal-range" as const;

export const RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_VERSION =
  "resting-heart-rate-personal-range-v1" as const;

/** Minimum valid nights in the 90-day window to build a usual range. */
export const RESTING_HEART_RATE_PERSONAL_RANGE_MIN_VALID_NIGHTS = 30 as const;

/**
 * When IQR collapses to a point, expand half-width (bpm) around the median so
 * the usual zone remains classifiable and visually meaningful.
 */
export const RESTING_HEART_RATE_PERSONAL_RANGE_MIN_HALF_WIDTH_BPM = 1 as const;

/** Visual padding floor (bpm) outside the usual zone. */
export const RESTING_HEART_RATE_VISUAL_MIN_PADDING_BPM = 4 as const;

/** Visual padding = max(floor, usualWidth × this scale). */
export const RESTING_HEART_RATE_VISUAL_PADDING_SCALE = 1.25 as const;

export type RestingHeartRatePersonalRangeStatus =
  | "below_usual"
  | "in_usual"
  | "above_usual";

/** Full status sentence under the hero. */
export type RestingHeartRatePersonalRangeLabel =
  | "Below your usual range"
  | "In your usual range"
  | "Above your usual range";

/** Short Your Pattern row labels. */
export type RestingHeartRatePatternStatusLabel =
  | "Below usual range"
  | "In usual range"
  | "Above usual range";

export type RestingHeartRatePersonalRangeResult = {
  status: RestingHeartRatePersonalRangeStatus;
  label: RestingHeartRatePersonalRangeLabel;
  lowerBoundBpm: number;
  upperBoundBpm: number;
  medianBpm: number;
  validSampleCount: number;
  modelId: typeof RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_ID;
  modelVersion: typeof RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_VERSION;
};

export type RestingHeartRatePersonalRangeBounds = {
  lowerBoundBpm: number;
  upperBoundBpm: number;
  medianBpm: number;
  validSampleCount: number;
  modelId: typeof RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_ID;
  modelVersion: typeof RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_VERSION;
};

export type RestingHeartRateVisualDomain = {
  visualMinBpm: number;
  visualMaxBpm: number;
  paddingBpm: number;
};

/**
 * Linear-interpolation percentile on a sorted ascending finite array (type-7).
 * `p` in [0, 1]. Deterministic for a given sorted input.
 */
export function percentileLinearSorted(sortedAscending: readonly number[], p: number): number {
  const n = sortedAscending.length;
  if (n === 0) return Number.NaN;
  if (n === 1) return sortedAscending[0]!;
  const clampedP = Math.min(1, Math.max(0, p));
  const index = (n - 1) * clampedP;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sortedAscending[lo]!;
  const weight = index - lo;
  return sortedAscending[lo]! * (1 - weight) + sortedAscending[hi]! * weight;
}

/** Median of a sorted ascending finite array. */
export function medianSorted(sortedAscending: readonly number[]): number {
  return percentileLinearSorted(sortedAscending, 0.5);
}

/**
 * Build IQR usual-range bounds from valid bpm samples.
 * Returns null when fewer than the minimum sample count.
 * Does not classify a current value.
 */
export function buildRestingHeartRatePersonalRangeBounds(
  samplesBpm: readonly number[],
): RestingHeartRatePersonalRangeBounds | null {
  const finite = samplesBpm.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (finite.length < RESTING_HEART_RATE_PERSONAL_RANGE_MIN_VALID_NIGHTS) return null;

  const sorted = [...finite].sort((a, b) => a - b);
  const medianBpm = medianSorted(sorted);
  let lowerBoundBpm = percentileLinearSorted(sorted, 0.25);
  let upperBoundBpm = percentileLinearSorted(sorted, 0.75);

  if (!(Number.isFinite(lowerBoundBpm) && Number.isFinite(upperBoundBpm) && Number.isFinite(medianBpm))) {
    return null;
  }

  if (upperBoundBpm < lowerBoundBpm) {
    const tmp = lowerBoundBpm;
    lowerBoundBpm = upperBoundBpm;
    upperBoundBpm = tmp;
  }

  if (upperBoundBpm === lowerBoundBpm) {
    const half = RESTING_HEART_RATE_PERSONAL_RANGE_MIN_HALF_WIDTH_BPM;
    lowerBoundBpm = medianBpm - half;
    upperBoundBpm = medianBpm + half;
  }

  return {
    lowerBoundBpm,
    upperBoundBpm,
    medianBpm,
    validSampleCount: sorted.length,
    modelId: RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_ID,
    modelVersion: RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_VERSION,
  };
}

export function restingHeartRatePersonalRangeStatusLabel(
  status: RestingHeartRatePersonalRangeStatus,
): RestingHeartRatePersonalRangeLabel {
  if (status === "below_usual") return "Below your usual range";
  if (status === "above_usual") return "Above your usual range";
  return "In your usual range";
}

export function restingHeartRatePatternStatusLabel(
  status: RestingHeartRatePersonalRangeStatus,
): RestingHeartRatePatternStatusLabel {
  if (status === "below_usual") return "Below usual range";
  if (status === "above_usual") return "Above usual range";
  return "In usual range";
}

/**
 * Classify a bpm value against inclusive usual bounds.
 * Classification uses the unrounded value when available.
 */
export function classifyRestingHeartRateAgainstUsualRange(input: {
  bpm: number | null | undefined;
  bounds: RestingHeartRatePersonalRangeBounds;
}): RestingHeartRatePersonalRangeResult | null {
  const { bpm, bounds } = input;
  if (typeof bpm !== "number" || !Number.isFinite(bpm)) return null;

  let status: RestingHeartRatePersonalRangeStatus;
  if (bpm < bounds.lowerBoundBpm) status = "below_usual";
  else if (bpm > bounds.upperBoundBpm) status = "above_usual";
  else status = "in_usual";

  return {
    status,
    label: restingHeartRatePersonalRangeStatusLabel(status),
    lowerBoundBpm: bounds.lowerBoundBpm,
    upperBoundBpm: bounds.upperBoundBpm,
    medianBpm: bounds.medianBpm,
    validSampleCount: bounds.validSampleCount,
    modelId: bounds.modelId,
    modelVersion: bounds.modelVersion,
  };
}

/**
 * Bounded visual domain centered on the personal usual range.
 * Extreme current values clamp on the marker only — classification is unchanged.
 */
export function restingHeartRateVisualDomain(
  bounds: RestingHeartRatePersonalRangeBounds,
): RestingHeartRateVisualDomain {
  const width = Math.max(0, bounds.upperBoundBpm - bounds.lowerBoundBpm);
  const paddingBpm = Math.max(
    RESTING_HEART_RATE_VISUAL_MIN_PADDING_BPM,
    width * RESTING_HEART_RATE_VISUAL_PADDING_SCALE,
  );
  return {
    visualMinBpm: bounds.lowerBoundBpm - paddingBpm,
    visualMaxBpm: bounds.upperBoundBpm + paddingBpm,
    paddingBpm,
  };
}

export function restingHeartRatePersonalRangeZoneFractions(
  bounds: RestingHeartRatePersonalRangeBounds,
): { below: number; usual: number; above: number } {
  const domain = restingHeartRateVisualDomain(bounds);
  const span = domain.visualMaxBpm - domain.visualMinBpm;
  if (!(span > 0)) {
    return { below: 1 / 3, usual: 1 / 3, above: 1 / 3 };
  }
  const lower = Math.max(domain.visualMinBpm, Math.min(domain.visualMaxBpm, bounds.lowerBoundBpm));
  const upper = Math.max(domain.visualMinBpm, Math.min(domain.visualMaxBpm, bounds.upperBoundBpm));
  const below = Math.max(0, (lower - domain.visualMinBpm) / span);
  const usual = Math.max(0, (upper - lower) / span);
  const above = Math.max(0, 1 - below - usual);
  return { below, usual, above };
}

/**
 * Marker position 0–1 on the visual rail. Clamped for edge visibility only.
 */
export function restingHeartRatePersonalRangeMarkerPosition01(input: {
  bpm: number;
  bounds: RestingHeartRatePersonalRangeBounds;
}): number {
  const domain = restingHeartRateVisualDomain(input.bounds);
  const span = domain.visualMaxBpm - domain.visualMinBpm;
  if (!Number.isFinite(input.bpm) || !(span > 0)) return 0.5;
  const raw = (input.bpm - domain.visualMinBpm) / span;
  return Math.min(0.98, Math.max(0.02, raw));
}

/** Integer bpm labels for zone range text (display only). */
export function formatRestingHeartRateBoundDisplay(bpm: number): number {
  return Math.round(bpm);
}

export function restingHeartRatePersonalRangeZoneCopy(
  bounds: RestingHeartRatePersonalRangeBounds,
): {
  belowLabel: "Below Usual";
  usualLabel: "Your Usual";
  aboveLabel: "Above Usual";
  belowRangeText: string;
  usualRangeText: string;
  aboveRangeText: string;
} {
  const lower = formatRestingHeartRateBoundDisplay(bounds.lowerBoundBpm);
  const upper = formatRestingHeartRateBoundDisplay(bounds.upperBoundBpm);
  return {
    belowLabel: "Below Usual",
    usualLabel: "Your Usual",
    aboveLabel: "Above Usual",
    belowRangeText: `<${lower} bpm`,
    usualRangeText: `${lower}–${upper} bpm`,
    aboveRangeText: `>${upper} bpm`,
  };
}

export function restingHeartRatePersonalRangeAccessibilitySummary(input: {
  displayBpm: number;
  result: RestingHeartRatePersonalRangeResult;
}): string {
  const lower = formatRestingHeartRateBoundDisplay(input.result.lowerBoundBpm);
  const upper = formatRestingHeartRateBoundDisplay(input.result.upperBoundBpm);
  const statusPhrase =
    input.result.status === "below_usual"
      ? "This is below your usual range."
      : input.result.status === "above_usual"
        ? "This is above your usual range."
        : "This is in your usual range.";
  return [
    `${input.displayBpm} beats per minute.`,
    statusPhrase,
    `Your usual range is ${lower} to ${upper} beats per minute.`,
  ].join(" ");
}
