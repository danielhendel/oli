/**
 * Stage 3C composition-share graph — measurement proportion only.
 *
 * This is NOT a reference classification, health rating, performance rating,
 * population percentile, or target zone.
 */

export const BODY_COMPOSITION_SHARE_CAPTION = "Share of total mass" as const;

export type BodyCompositionShareMetric = "bodyFat" | "leanMass";

export type BodyCompositionShareMeaning =
  | "measured_percentage"
  | "compatible_calculated_percentage";

export type BodyCompositionShareGraphStatus =
  | "ready"
  | "missing"
  | "incompatible"
  | "stale"
  | "conflicting"
  | "error";

/**
 * Presentation model for a personal composition-share rail.
 * `normalizedPosition` is 0–1 along the 0–100% domain when placeable; null otherwise.
 * `personalClassification` and `target` are always null by construction.
 */
export type BodyCompositionShareGraphModel = {
  readonly kind: "composition_share";
  readonly metric: BodyCompositionShareMetric;
  readonly status: BodyCompositionShareGraphStatus;
  /** 0–1 fill/marker position; null when no placeable share. Missing is never coerced to 0. */
  readonly normalizedPosition: number | null;
  /** Capsule label (percentage or mass) for the current display view. */
  readonly valueLabel: string | null;
  readonly caption: typeof BODY_COMPOSITION_SHARE_CAPTION;
  readonly meaning: BodyCompositionShareMeaning | null;
  readonly personalClassification: null;
  readonly target: null;
  readonly accessibleSummary: string;
};
