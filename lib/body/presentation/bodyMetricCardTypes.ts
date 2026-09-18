/**
 * Presentation-only types for Stage 3B Body Composition metric summary cards
 * and visual classification charts.
 */

import type { BodyMetricClassificationTone } from "@/lib/ui/theme/bodyMetricClassificationChrome";

export type BodyMetricClassificationChartSegment = {
  readonly id: string;
  readonly label: string;
  /** Height-specific numeric range when available; null when height missing. */
  readonly formattedRange: string | null;
  readonly tone: BodyMetricClassificationTone;
  /** Domain lower bound (e.g. BMI); null = unbounded below. */
  readonly lowerBound: number | null;
  /** Domain upper bound (e.g. BMI); null = unbounded above. */
  readonly upperBound: number | null;
  readonly lowerInclusive: boolean;
  readonly upperInclusive: boolean;
};

export type BodyMetricClassificationChartMarker = {
  readonly formattedValue: string;
  readonly segmentId: string;
  /** 0–1 within the classified segment; null for open-ended stable placement. */
  readonly withinSegmentPosition: number | null;
  readonly accessibleLabel: string;
};

/**
 * Complete presentation model for BodyMetricClassificationChart.
 * Chart must not classify — it only renders this model.
 */
export type BodyMetricClassificationChartModel = {
  readonly standardId: string;
  readonly standardVersion: string;
  readonly contextLabel: string;
  readonly segments: readonly BodyMetricClassificationChartSegment[];
  readonly marker: BodyMetricClassificationChartMarker | null;
  readonly accessibleSummary: string;
};

/** @deprecated Prefer BodyMetricClassificationChartModel — kept for transitional imports. */
export type BodyMetricReferenceBarTone = "muted" | "reference" | "caution" | "elevated";

/** @deprecated Prefer BodyMetricClassificationChartSegment */
export type BodyMetricReferenceBarSegment = {
  readonly id: string;
  readonly label: string;
  readonly numericRangeLabel: string | null;
  readonly start: number;
  readonly end: number;
  readonly tone: BodyMetricReferenceBarTone;
};

/** @deprecated Prefer BodyMetricClassificationChartModel */
export type BodyMetricReferenceBarModel = {
  readonly segments: readonly BodyMetricReferenceBarSegment[];
  readonly markerPosition: number | null;
  readonly markerLabel: string | null;
  readonly accessibleSummary: string;
  readonly standardId: string | null;
  readonly standardVersion: string | null;
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
  /** Large face value without unit (e.g. "176.4"); null → em dash. */
  readonly displayValue: string | null;
  /** Unit chip on the card face (e.g. "lb", "%"); null when not applicable. */
  readonly displayUnit: string | null;
  readonly unit: string | null;
  readonly readiness: BodyMetricCardReadiness;
  /**
   * Status for accessibility / detail — not rendered on the primary card chrome.
   */
  readonly statusLabel: string;
  /** Kept for detail/tests; not rendered on primary card. */
  readonly referenceLabel: string | null;
  /** Kept for detail/tests; not rendered on primary card. */
  readonly referenceContextLabel: string | null;
  /** Visual classification chart when an approved standard applies. */
  readonly classificationChart: BodyMetricClassificationChartModel | null;
  /**
   * When true, render a premium unclassified visual scaffold (no labels/marker).
   * Used for Body Fat / Lean Tissue until standards are approved.
   */
  readonly showUnclassifiedScaffold: boolean;
  /** Accessibility for unclassified scaffold. */
  readonly unclassifiedScaffoldAccessibilityLabel: string | null;
  /** @deprecated Prefer classificationChart */
  readonly referenceBar: BodyMetricReferenceBarModel | null;
  readonly heightSpecificRangeLabel: string | null;
  readonly provenance: BodyMetricCardProvenance;
  /** Recency only on the card face (date); method stays in a11y/detail. */
  readonly recencyLabel: string | null;
  readonly detailHref: string;
  readonly addDataHref: string | null;
  readonly accessibilityLabel: string;
  /** Featured (Weight) cards may use larger vertical padding. */
  readonly featured: boolean;
};
