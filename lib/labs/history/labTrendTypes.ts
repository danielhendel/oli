/**
 * Pure lab trend series types for Phase 3D-C graphs.
 * No Firebase, network, or UI imports.
 */

import type { LabMetricChange } from "./calculateLabMetricChange";

export type LabTrendGraphEligibility =
  | "numeric_graph"
  | "single_numeric_point"
  | "qualitative_timeline"
  | "pattern_timeline"
  | "inequality_timeline"
  | "incompatible_history"
  | "missing_collection_date"
  | "not_graphable";

export type LabTrendPoint = {
  acceptedResultId: string;
  canonicalMetricId: string;
  collectedDate: string;
  epochMs: number | null;
  value: number;
  displayValue: string;
  unit: string | null;
  reportFlag: string | null;
  rawReferenceRange: string | null;
  sourceDocumentId: string;
  sourcePage: number | null;
  panelId: string | null;
  specimenType: string | null;
  methodId: string | null;
  measuredOrCalculated: "measured" | "calculated" | "reported_unknown";
  laboratoryName: string | null;
};

export type LabTrendSeries = {
  metricKey: string;
  displayName: string | null;
  points: readonly LabTrendPoint[];
  latest: LabTrendPoint | null;
  prior: LabTrendPoint | null;
  change: LabMetricChange | null;
  graphEligibility: LabTrendGraphEligibility;
  unit: string | null;
};

export type LabTrendRangeKey = "all" | "1y" | "3y" | "5y";

export type LabChartDomain = {
  xMinMs: number;
  xMaxMs: number;
  yMin: number;
  yMax: number;
  /** True when all plotted values are equal (flat line / zero span before padding). */
  flat: boolean;
};
