/**
 * Presentation-only types for Stage 3B Body Composition metric summary cards.
 * Adapts existing overview values for display — does not create official classification.
 */

export type BodyMetricReferenceBarTone = "muted" | "reference" | "caution" | "elevated";

export type BodyMetricReferenceBarSegment = {
  readonly id: string;
  readonly label: string;
  /** Relative start along the bar (0–1). */
  readonly start: number;
  /** Relative end along the bar (0–1). */
  readonly end: number;
  readonly tone: BodyMetricReferenceBarTone;
};

export type BodyMetricReferenceBarModel = {
  readonly segments: readonly BodyMetricReferenceBarSegment[];
  /** Null when no personal comparison is authorized. */
  readonly markerPosition: number | null;
  readonly markerLabel: string | null;
  readonly accessibleSummary: string;
};

export type BodyMetricCardMetric = "weight" | "bodyFat" | "leanTissue";

export type BodyMetricCardReadiness =
  | "missing"
  | "partial"
  | "referenceAvailable"
  | "stale"
  | "conflicting"
  | "error";

export type BodyMetricCardProvenance = {
  readonly transportLabel: string | null;
  readonly sourceApplicationLabel: string | null;
  readonly measurementMethodLabel: string | null;
  readonly measuredAtLabel: string | null;
};

export type BodyMetricCardModel = {
  readonly metric: BodyMetricCardMetric;
  readonly title: string;
  readonly value: number | null;
  readonly formattedValue: string | null;
  readonly unit: string | null;
  readonly readiness: BodyMetricCardReadiness;
  readonly statusLabel: string;
  readonly referenceLabel: string | null;
  readonly referenceContextLabel: string | null;
  readonly referenceBar: BodyMetricReferenceBarModel | null;
  readonly provenance: BodyMetricCardProvenance;
  readonly detailHref: string;
  readonly addDataHref: string | null;
  readonly accessibilityLabel: string;
};
