/**
 * Source-lab reference visualization model for Phase 3D-C trend charts.
 * Geometry only — never invents Oli clinical classifications.
 */

export type LabChartReferenceOverlayReason =
  | "missing_reference"
  | "qualitative"
  | "pattern"
  | "inequality_history"
  | "incompatible_reference_history"
  | "unsupported_reference_format"
  | "not_numeric_graph"
  | "provider_categories_deferred";

export type LabChartReferenceOverlayCategory = {
  label: string;
  min: number | null;
  max: number | null;
  minInclusive: boolean;
  maxInclusive: boolean;
};

export type LabChartReferenceOverlay =
  | {
      kind: "bounded";
      lower: number;
      upper: number;
      lowerInclusive: boolean;
      upperInclusive: boolean;
      providerName: string | null;
      rawReference: string;
    }
  | {
      kind: "upper_bound";
      upper: number;
      inclusive: boolean;
      providerName: string | null;
      rawReference: string;
    }
  | {
      kind: "lower_bound";
      lower: number;
      inclusive: boolean;
      providerName: string | null;
      rawReference: string;
    }
  | {
      kind: "provider_categories";
      providerName: string | null;
      categories: readonly LabChartReferenceOverlayCategory[];
      rawReference: string | null;
    }
  | {
      kind: "none";
      reason: LabChartReferenceOverlayReason;
    };
