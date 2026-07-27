/**
 * Pure provider-score bar geometry for readiness contributor details (Phase 2F-C2).
 *
 * True 0–100 proportional zone widths matching Oura provider bands:
 * - Pay attention: 0–59 → 60/100
 * - Fair: 60–69 → 10/100
 * - Good: 70–84 → 15/100
 * - Optimal: 85–100 → 16/100
 *
 * Marker position is score/100 (clamped). Labels may use a presentation floor in UI
 * for readability; the underlying score mapping is not distorted.
 *
 * No React. No medical-range wording.
 */

import { normalizeReadinessContributorScore } from "@/lib/data/readiness/readinessContributorScore";
import {
  classifyOuraProviderScore,
  normalizeOuraScore0to100,
  type OuraRatingLabel,
} from "@/lib/format/ouraScore";

/**
 * Documented true proportional zone fractions over continuous 0–100.
 * Half-open provider bands mapped to visual width (marker uses score/100):
 * - Pay attention [0, 60) → 0.60
 * - Fair [60, 70) → 0.10
 * - Good [70, 85) → 0.15
 * - Optimal [85, 100] → 0.15
 * Classification boundaries are unchanged; Optimal label remains 85–100.
 */
export const READINESS_CONTRIBUTOR_SCORE_ZONE_FRACTIONS = {
  payAttention: 60 / 100,
  fair: 10 / 100,
  good: 15 / 100,
  optimal: 15 / 100,
} as const;

export function readinessContributorScoreMarkerPosition01(score: number): number {
  const n = normalizeReadinessContributorScore(score);
  if (n == null) return 0;
  if (n <= 0) return 0;
  if (n >= 100) return 1;
  return n / 100;
}

/**
 * Classify after averaging using the existing provider-score thresholds.
 * Does not round before classification (59.99 → Pay attention; 60 → Fair).
 * Display rounding is separate via {@link formatReadinessContributorScoreDisplay}.
 */
export function classifyReadinessContributorAverageScore(
  averageScore: number | null | undefined,
): OuraRatingLabel | null {
  if (averageScore == null) return null;
  const validated = normalizeReadinessContributorScore(averageScore);
  if (validated == null) return null;
  return classifyOuraProviderScore(validated);
}

export function formatReadinessContributorScoreDisplay(
  score: number | null | undefined,
): string | null {
  const rounded = normalizeOuraScore0to100(score);
  if (rounded == null) return null;
  return String(rounded);
}

export function readinessContributorScoreBarAccessibilitySummary(input: {
  displayScore: number;
  classification: OuraRatingLabel;
}): string {
  return `${input.displayScore} out of 100. ${input.classification}. This is an Oura contributor score.`;
}
