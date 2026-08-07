/**
 * Source-lab reference visualization model for Phase 3D-C trend charts.
 * Geometry only — never invents Oli clinical classifications.
 */

export type LabChartReferenceOverlayScope = "persistent" | "latest";

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

type LabChartReferenceOverlayBase = {
  providerName: string | null;
  rawReference: string;
  /** persistent = historically compatible; latest = latest-source band with explicit attribution */
  scope: LabChartReferenceOverlayScope;
};

export type LabChartReferenceOverlay =
  | (LabChartReferenceOverlayBase & {
      kind: "bounded";
      lower: number;
      upper: number;
      lowerInclusive: boolean;
      upperInclusive: boolean;
    })
  | (LabChartReferenceOverlayBase & {
      kind: "upper_bound";
      upper: number;
      inclusive: boolean;
    })
  | (LabChartReferenceOverlayBase & {
      kind: "lower_bound";
      lower: number;
      inclusive: boolean;
    })
  | {
      kind: "provider_categories";
      providerName: string | null;
      categories: readonly LabChartReferenceOverlayCategory[];
      rawReference: string | null;
      scope: LabChartReferenceOverlayScope;
    }
  | {
      kind: "none";
      reason: LabChartReferenceOverlayReason;
    };
