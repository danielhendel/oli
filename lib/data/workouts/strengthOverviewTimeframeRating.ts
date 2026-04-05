/**
 * Per-timeframe training consistency rating for Strength Overview.
 * Primary signal: avg workouts/week. Secondary: total workouts vs expected density for elapsed days.
 * Duration is not part of the score (v1). Deterministic thresholds — tune here only.
 */

export type StrengthOverviewTimeframeKey = "ytd" | "threeMonth" | "mtd" | "thisWeek";

export type StrengthOverviewTimeframeRatingLabel = "Low" | "Developing" | "Solid" | "Strong" | "Optimal";

export type StrengthOverviewTimeframeRatingTier = "low" | "developing" | "solid" | "strong" | "optimal";

export type StrengthOverviewTimeframeRatingResult = {
  label: StrengthOverviewTimeframeRatingLabel;
  microcopy: string;
  /** 0..1 fill for a single consistency bar (not per-metric). */
  progress: number;
  tier: StrengthOverviewTimeframeRatingTier;
  /**
   * Blended score used for tier selection (avg/week + density). Used for bar marker position within tier segment.
   */
  scoringAvg: number;
};

/** Tier boundaries on the scoring average (workouts/week equivalent after dampening + density). */
export const STRENGTH_OVERVIEW_TF_RATING_DEVELOPING_MIN = 1;
export const STRENGTH_OVERVIEW_TF_RATING_SOLID_MIN = 2;
export const STRENGTH_OVERVIEW_TF_RATING_STRONG_MIN = 3;
export const STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN = 5;

/** `scoringAvg / PROGRESS_SCALE` clamped → bar fill (Optimal at 5+ lands near full). */
export const STRENGTH_OVERVIEW_TF_PROGRESS_SCALE = 5.5;

/**
 * Expected-session baseline: ~one strength session every 14 elapsed calendar days (normalization only).
 */
export const STRENGTH_OVERVIEW_TF_REFERENCE_SESSION_DAYS = 14;

/** Blend: 65% time-dampened avg/week + 35% volume-density factor. */
export const STRENGTH_OVERVIEW_TF_AVG_WEIGHT = 0.65;
export const STRENGTH_OVERVIEW_TF_DENSITY_WEIGHT = 0.35;

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/** Five equal UI segments left → right; indices match {@link tierFromScoringAvg} order. */
export const STRENGTH_OVERVIEW_MARKER_SEGMENT_COUNT = 5;

const TIER_TO_SEGMENT_INDEX: Record<StrengthOverviewTimeframeRatingTier, number> = {
  low: 0,
  developing: 1,
  solid: 2,
  strong: 3,
  optimal: 4,
};

export function getStrengthOverviewTierSegmentBounds01(
  tier: StrengthOverviewTimeframeRatingTier,
): { start: number; end: number } {
  const i = TIER_TO_SEGMENT_INDEX[tier];
  const n = STRENGTH_OVERVIEW_MARKER_SEGMENT_COUNT;
  return { start: i / n, end: (i + 1) / n };
}

/**
 * Normalized horizontal position (0–1) for the Strength Overview marker so it always lies in the segment
 * for {@link tier}, with intra-tier placement from {@link scoringAvg} vs that tier’s score bounds.
 */
export function computeStrengthOverviewMarkerPosition01(input: {
  tier: StrengthOverviewTimeframeRatingTier;
  scoringAvg: number;
}): number {
  const sRaw = input.scoringAvg;
  const s = Number.isFinite(sRaw) && sRaw > 0 ? sRaw : 0;

  const { start: segStart, end: segEnd } = getStrengthOverviewTierSegmentBounds01(input.tier);
  const segWidth = segEnd - segStart;

  let intra = 0;
  switch (input.tier) {
    case "low":
      intra = s / STRENGTH_OVERVIEW_TF_RATING_DEVELOPING_MIN;
      break;
    case "developing":
      intra =
        (s - STRENGTH_OVERVIEW_TF_RATING_DEVELOPING_MIN) /
        (STRENGTH_OVERVIEW_TF_RATING_SOLID_MIN - STRENGTH_OVERVIEW_TF_RATING_DEVELOPING_MIN);
      break;
    case "solid":
      intra =
        (s - STRENGTH_OVERVIEW_TF_RATING_SOLID_MIN) /
        (STRENGTH_OVERVIEW_TF_RATING_STRONG_MIN - STRENGTH_OVERVIEW_TF_RATING_SOLID_MIN);
      break;
    case "strong":
      intra =
        (s - STRENGTH_OVERVIEW_TF_RATING_STRONG_MIN) /
        (STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN - STRENGTH_OVERVIEW_TF_RATING_STRONG_MIN);
      break;
    case "optimal":
      intra =
        (Math.min(s, STRENGTH_OVERVIEW_TF_PROGRESS_SCALE) - STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN) /
        (STRENGTH_OVERVIEW_TF_PROGRESS_SCALE - STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN);
      break;
  }

  intra = clamp01(intra);
  let marker01 = segStart + intra * segWidth;
  if (marker01 < segStart) marker01 = segStart;
  if (marker01 > segEnd) marker01 = segEnd;
  return marker01;
}

const TIER_COPY: Record<
  StrengthOverviewTimeframeRatingTier,
  { label: StrengthOverviewTimeframeRatingLabel; microcopy: string }
> = {
  low: { label: "Low", microcopy: "Limited training consistency" },
  developing: { label: "Developing", microcopy: "Establishing consistency" },
  solid: { label: "Solid", microcopy: "Good training rhythm" },
  strong: { label: "Strong", microcopy: "Highly consistent" },
  optimal: { label: "Optimal", microcopy: "Peak consistency" },
};

function tierFromScoringAvg(scoringAvg: number): StrengthOverviewTimeframeRatingTier {
  if (scoringAvg < STRENGTH_OVERVIEW_TF_RATING_DEVELOPING_MIN) return "low";
  if (scoringAvg < STRENGTH_OVERVIEW_TF_RATING_SOLID_MIN) return "developing";
  if (scoringAvg < STRENGTH_OVERVIEW_TF_RATING_STRONG_MIN) return "solid";
  if (scoringAvg < STRENGTH_OVERVIEW_TF_RATING_OPTIMAL_MIN) return "strong";
  return "optimal";
}

/**
 * @param elapsedCalendarDays — inclusive calendar length of the timeframe (≥1 when workouts exist; use ≥1 for scoring when total>0).
 */
export function strengthOverviewTimeframeConsistencyRating(input: {
  timeframe: StrengthOverviewTimeframeKey;
  avgWorkoutsPerWeek: number | null;
  totalWorkouts: number;
  elapsedCalendarDays: number;
}): StrengthOverviewTimeframeRatingResult {
  const total = input.totalWorkouts;
  const elapsedRaw = input.elapsedCalendarDays;
  const elapsed = Number.isFinite(elapsedRaw) && elapsedRaw > 0 ? elapsedRaw : 0;

  if (total <= 0 || elapsed <= 0) {
    const tier: StrengthOverviewTimeframeRatingTier = "low";
    const { label, microcopy } = TIER_COPY[tier];
    return { label, microcopy, progress: 0, tier, scoringAvg: 0 };
  }

  const avg = typeof input.avgWorkoutsPerWeek === "number" && Number.isFinite(input.avgWorkoutsPerWeek)
    ? input.avgWorkoutsPerWeek
    : 0;

  let timeDampenedAvg = avg;
  if (input.timeframe === "thisWeek" && elapsed < 7) {
    timeDampenedAvg = avg * (elapsed / 7);
  }

  const referenceSessions = Math.max(1, elapsed / STRENGTH_OVERVIEW_TF_REFERENCE_SESSION_DAYS);
  const density = Math.min(1, total / referenceSessions);
  const scoringAvg =
    timeDampenedAvg * (STRENGTH_OVERVIEW_TF_AVG_WEIGHT + STRENGTH_OVERVIEW_TF_DENSITY_WEIGHT * density);

  const tier = tierFromScoringAvg(scoringAvg);
  const { label, microcopy } = TIER_COPY[tier];
  const progress = clamp01(scoringAvg / STRENGTH_OVERVIEW_TF_PROGRESS_SCALE);

  return { label, microcopy, progress, tier, scoringAvg };
}
