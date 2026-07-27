/**
 * Shared types for Phase 2F-C2 readiness contributor detail experiences.
 * Provider-owned Oura 0–100 contributor scores — not raw physiology.
 */

import type { ReadinessRangeContributorKey } from "@oli/contracts/ouraVendor";
import type { OuraRatingLabel } from "@/lib/format/ouraScore";
import type { DayKey } from "@/lib/ui/calendar/types";

export type ReadinessContributorDetailMetric =
  | "hrv_balance"
  | "body_temperature"
  | "recovery_index"
  | "sleep_balance";

/** Exhaustive list — keep in sync with {@link ReadinessContributorDetailMetric}. */
export const READINESS_CONTRIBUTOR_DETAIL_METRICS = [
  "hrv_balance",
  "body_temperature",
  "recovery_index",
  "sleep_balance",
] as const satisfies readonly ReadinessContributorDetailMetric[];

export type ReadinessContributorDetailHistoryStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";

export type ReadinessContributorDetailExplainerSection = {
  heading: string;
  body: string;
};

export type ReadinessContributorPatternRowId = "7d" | "30d" | "90d";

export type ReadinessContributorPatternRow = {
  id: ReadinessContributorPatternRowId;
  label: string;
  value: string;
  statusLabel: OuraRatingLabel | null;
  accessibilitySummary: string;
};

export type ReadinessContributorPatternComparison = {
  heading: "Your Pattern";
  sevenDay: ReadinessContributorPatternRow;
  thirtyDay: ReadinessContributorPatternRow;
  ninetyDay: ReadinessContributorPatternRow;
};

/**
 * Presentation-ready four-zone provider-score bar.
 * Zone widths are true 0–100 proportional fractions (documented in builder).
 */
export type ReadinessContributorScoreBarPresentation = {
  supportingLabel: "Oura contributor score";
  payAttentionLabel: "Pay Attention";
  fairLabel: "Fair";
  goodLabel: "Good";
  optimalLabel: "Optimal";
  payAttentionRangeText: "0–59";
  fairRangeText: "60–69";
  goodRangeText: "70–84";
  optimalRangeText: "85–100";
  /** True proportional widths: 60 / 10 / 15 / 15 over continuous 0–100. */
  zoneFractions: {
    payAttention: number;
    fair: number;
    good: number;
    optimal: number;
  };
  /** score / 100, clamped to [0, 1]. */
  currentMarkerPosition01: number;
  currentDisplayScore: number;
  currentClassification: OuraRatingLabel;
  accessibilitySummary: string;
};

export type ReadinessContributorDetailViewModel = {
  metricId: ReadinessContributorDetailMetric;
  contributorKey: ReadinessRangeContributorKey;
  selectedDay: DayKey;
  title: string;
  /** Unrounded validated score when present. */
  currentScore: number | null;
  /** Rounded 0–100 for hero display. */
  currentDisplayScore: number | null;
  currentFormatted: string;
  currentClassification: OuraRatingLabel | null;
  currentPresence: "present" | "absent";
  supportingLabel: "Oura contributor score";
  statusSentence: string | null;
  scoreBar: ReadinessContributorScoreBarPresentation | null;
  pattern: ReadinessContributorPatternComparison | null;
  explainers: readonly ReadinessContributorDetailExplainerSection[];
  dataAccuracyBody: string;
  historyStatus: ReadinessContributorDetailHistoryStatus;
  historyErrorMessage: string | null;
  canRetryHistory: boolean;
  isHistoryLoading: boolean;
  accessibilitySummary: string;
};

export function assertReadinessContributorDetailMetric(
  value: string,
): asserts value is ReadinessContributorDetailMetric {
  if (
    value !== "hrv_balance" &&
    value !== "body_temperature" &&
    value !== "recovery_index" &&
    value !== "sleep_balance"
  ) {
    throw new Error(`Unknown readiness contributor detail metric: ${value}`);
  }
}

export function isReadinessContributorDetailMetric(
  value: string,
): value is ReadinessContributorDetailMetric {
  return (
    value === "hrv_balance" ||
    value === "body_temperature" ||
    value === "recovery_index" ||
    value === "sleep_balance"
  );
}
