/**
 * Body Scan Canonical Metric Registry (Stage 3E Phase A).
 *
 * Authoritative product/science ontology. Adapters map source fields into these
 * keys; UI (Phase D/E) will group from this registry. Storage remains
 * metricId + region on bodyScans / bodyScanDrafts / bodyScanFacts.
 *
 * Direction lock:
 *   PRODUCT/SCIENCE → REGISTRY → CAPABILITIES → ADAPTERS → CANDIDATES → REVIEW → VERIFIED
 *
 * Not owned here: score math, Evidence Resolver, Review/Detail redesign.
 */

import type {
  BodyScanMetricGroupId,
  BodyScanMetricId,
  BodyScanMetricProductStatus,
  BodyScanMethod,
  BodyScanQuantity,
  BodyScanRegion,
  BodyScanScoringConstructId,
  BodyScanSectionId,
  BodyScanUnit,
} from "@oli/contracts";

export type BodyScanMetricDefinition = {
  key: BodyScanMetricId;
  label: string;
  /** Registry group (product/science). */
  group: BodyScanMetricGroupId;
  quantity: BodyScanQuantity;
  canonicalUnit: BodyScanUnit;
  supportedSourceUnits: readonly BodyScanUnit[];
  sourceReportedOnly: boolean;
  allowedRegions: readonly BodyScanRegion[];
  allowedMethods: readonly BodyScanMethod[];
  productStatus: BodyScanMetricProductStatus;
  /** Always false for Body Scan registry entries (trend firewall). */
  continuousTrendEligible: false;
  /** Soft construct tags only — never weights. */
  scoringConstructEligibility: readonly BodyScanScoringConstructId[];
  description: string;
  /** When false, Stage 3E Review/Detail must not surface the metric. */
  uiEnabled: boolean;
  /** Absolute ban on disease classification from this metric. */
  diagnosticClassification: false;
};

/** Maps registry group → persisted/UI section id (backward compatible). */
export const BODY_SCAN_GROUP_TO_SECTION: Record<
  Exclude<BodyScanMetricGroupId, "source">,
  Exclude<BodyScanSectionId, "source">
> = {
  overview: "overview",
  fat_distribution: "fat_distribution",
  regional_composition: "regional_composition",
  regional_lean: "regional_lean_balance",
  bone: "total_body_bone",
};

const TOTAL_ONLY: readonly BodyScanRegion[] = ["total"];

const COMPOSITION_REGIONS: readonly BodyScanRegion[] = [
  "total",
  "head",
  "trunk",
  "android",
  "gynoid",
  "arms",
  "legs",
  "left_arm",
  "right_arm",
  "left_leg",
  "right_leg",
];

const MASS_METHODS: readonly BodyScanMethod[] = ["dxa", "bia", "air_displacement", "other"];
const DXA_ONLY: readonly BodyScanMethod[] = ["dxa"];
const BIA_ONLY: readonly BodyScanMethod[] = ["bia"];

function def(
  partial: Omit<BodyScanMetricDefinition, "continuousTrendEligible" | "diagnosticClassification">,
): BodyScanMetricDefinition {
  return {
    ...partial,
    continuousTrendEligible: false,
    diagnosticClassification: false,
  };
}

/**
 * Canonical registry. Keys match `bodyScanMetricIdSchema`.
 * Android/gynoid fat % = `fat_percent` @ android/gynoid (no combinatorial keys).
 */
export const BODY_SCAN_METRIC_REGISTRY: Record<BodyScanMetricId, BodyScanMetricDefinition> = {
  total_mass: def({
    key: "total_mass",
    label: "Total Mass",
    group: "overview",
    quantity: "mass",
    canonicalUnit: "kg",
    supportedSourceUnits: ["kg", "lb", "g"],
    sourceReportedOnly: false,
    allowedRegions: COMPOSITION_REGIONS,
    allowedMethods: MASS_METHODS,
    productStatus: "core_v1",
    scoringConstructEligibility: [],
    description: "Whole-body mass reported by the scan.",
    uiEnabled: true,
  }),
  fat_percent: def({
    key: "fat_percent",
    label: "Body Fat",
    group: "overview",
    quantity: "percent",
    canonicalUnit: "percent",
    supportedSourceUnits: ["percent"],
    sourceReportedOnly: false,
    allowedRegions: COMPOSITION_REGIONS,
    allowedMethods: MASS_METHODS,
    productStatus: "core_v1",
    scoringConstructEligibility: ["H2", "P3", "H4"],
    description: "Body fat percentage as reported for the region.",
    uiEnabled: true,
  }),
  fat_mass: def({
    key: "fat_mass",
    label: "Fat Mass",
    group: "overview",
    quantity: "mass",
    canonicalUnit: "kg",
    supportedSourceUnits: ["kg", "lb", "g"],
    sourceReportedOnly: false,
    allowedRegions: COMPOSITION_REGIONS,
    allowedMethods: MASS_METHODS,
    productStatus: "core_v1",
    scoringConstructEligibility: ["H2"],
    description: "Absolute fat tissue mass for the region.",
    uiEnabled: true,
  }),
  lean_mass: def({
    key: "lean_mass",
    label: "Lean Mass",
    group: "overview",
    quantity: "mass",
    canonicalUnit: "kg",
    supportedSourceUnits: ["kg", "lb", "g"],
    sourceReportedOnly: false,
    allowedRegions: COMPOSITION_REGIONS,
    allowedMethods: ["dxa", "bia", "other"],
    productStatus: "core_v1",
    scoringConstructEligibility: ["H3", "P1", "P2"],
    description:
      "Non-fat soft tissue reported by the scan (includes muscle, organs, connective tissue, and water). Not a direct muscle measurement.",
    uiEnabled: true,
  }),
  fat_free_mass: def({
    key: "fat_free_mass",
    label: "Fat-Free Mass",
    group: "overview",
    quantity: "mass",
    canonicalUnit: "kg",
    supportedSourceUnits: ["kg", "lb", "g"],
    sourceReportedOnly: true,
    allowedRegions: TOTAL_ONLY,
    allowedMethods: ["dxa", "bia", "air_displacement", "other"],
    productStatus: "optional_v1",
    scoringConstructEligibility: ["H3", "P1"],
    description:
      "Everything that is not fat when the report labels Fat-Free Mass separately from Lean Mass.",
    uiEnabled: true,
  }),
  bone_mineral_content: def({
    key: "bone_mineral_content",
    label: "Bone Mineral Content",
    group: "bone",
    quantity: "mass",
    // Stage 3E persisted unit remains grams (do not silently change).
    canonicalUnit: "g",
    supportedSourceUnits: ["g", "kg", "lb"],
    sourceReportedOnly: false,
    allowedRegions: COMPOSITION_REGIONS,
    allowedMethods: DXA_ONLY,
    productStatus: "core_v1",
    scoringConstructEligibility: [],
    description: "Bone mineral content for the region. Distinct from bone mineral density.",
    uiEnabled: true,
  }),
  bone_mineral_density: def({
    key: "bone_mineral_density",
    label: "Bone Mineral Density",
    group: "bone",
    quantity: "density",
    canonicalUnit: "g_per_cm2",
    supportedSourceUnits: ["g_per_cm2"],
    sourceReportedOnly: true,
    allowedRegions: TOTAL_ONLY,
    allowedMethods: DXA_ONLY,
    productStatus: "core_v1",
    scoringConstructEligibility: [],
    description:
      "Whole-body bone density from this scan. Not the same as a diagnostic hip or spine osteoporosis exam.",
    uiEnabled: true,
  }),
  visceral_fat_mass: def({
    key: "visceral_fat_mass",
    label: "Visceral Fat Mass",
    group: "fat_distribution",
    quantity: "mass",
    canonicalUnit: "kg",
    supportedSourceUnits: ["kg", "g", "lb"],
    sourceReportedOnly: true,
    allowedRegions: TOTAL_ONLY,
    allowedMethods: DXA_ONLY,
    productStatus: "optional_v1",
    scoringConstructEligibility: ["H1"],
    description: "Visceral (intra-abdominal) fat mass when explicitly reported by the scan module.",
    uiEnabled: true,
  }),
  visceral_fat_volume: def({
    key: "visceral_fat_volume",
    label: "Visceral Fat Volume",
    group: "fat_distribution",
    quantity: "volume",
    canonicalUnit: "cm3",
    supportedSourceUnits: ["cm3"],
    sourceReportedOnly: true,
    allowedRegions: TOTAL_ONLY,
    allowedMethods: DXA_ONLY,
    productStatus: "optional_v1",
    scoringConstructEligibility: ["H1"],
    description:
      "Visceral fat volume when explicitly reported. Never inferred from visceral fat mass.",
    uiEnabled: true,
  }),
  android_gynoid_ratio: def({
    key: "android_gynoid_ratio",
    label: "Android / Gynoid Ratio",
    group: "fat_distribution",
    quantity: "ratio",
    canonicalUnit: "ratio",
    supportedSourceUnits: ["ratio"],
    sourceReportedOnly: true,
    allowedRegions: TOTAL_ONLY,
    allowedMethods: DXA_ONLY,
    productStatus: "optional_v1",
    scoringConstructEligibility: ["H4"],
    description: "Android-to-gynoid fat ratio as printed by the source.",
    uiEnabled: true,
  }),
  t_score: def({
    key: "t_score",
    label: "Total Body T-score",
    group: "bone",
    quantity: "score",
    canonicalUnit: "score",
    supportedSourceUnits: ["score", "ratio"],
    sourceReportedOnly: true,
    allowedRegions: TOTAL_ONLY,
    allowedMethods: DXA_ONLY,
    productStatus: "deferred",
    scoringConstructEligibility: [],
    description:
      "Total-body T-score when source-reported. Ontology only in Stage 3E; not a diagnosis.",
    uiEnabled: false,
  }),
  z_score: def({
    key: "z_score",
    label: "Total Body Z-score",
    group: "bone",
    quantity: "score",
    canonicalUnit: "score",
    supportedSourceUnits: ["score", "ratio"],
    sourceReportedOnly: true,
    allowedRegions: TOTAL_ONLY,
    allowedMethods: DXA_ONLY,
    productStatus: "deferred",
    scoringConstructEligibility: [],
    description:
      "Total-body Z-score when source-reported. Ontology only in Stage 3E; not a diagnosis.",
    uiEnabled: false,
  }),
  skeletal_muscle_mass: def({
    key: "skeletal_muscle_mass",
    label: "Skeletal Muscle Mass",
    group: "overview",
    quantity: "mass",
    canonicalUnit: "kg",
    supportedSourceUnits: ["kg", "lb", "g"],
    sourceReportedOnly: true,
    allowedRegions: TOTAL_ONLY,
    allowedMethods: BIA_ONLY,
    productStatus: "future",
    scoringConstructEligibility: ["P1"],
    description:
      "Skeletal muscle mass only when a device explicitly reports it. Never derived from DXA lean mass.",
    uiEnabled: false,
  }),
};

export function bodyScanMetricDefinition(key: BodyScanMetricId): BodyScanMetricDefinition {
  return BODY_SCAN_METRIC_REGISTRY[key];
}

export function bodyScanMetricRegistryList(): readonly BodyScanMetricDefinition[] {
  return Object.values(BODY_SCAN_METRIC_REGISTRY);
}

export function bodyScanRegistryGroupForMetric(
  metricId: BodyScanMetricId,
  region: BodyScanRegion,
): Exclude<BodyScanMetricGroupId, "source"> {
  const base = BODY_SCAN_METRIC_REGISTRY[metricId];
  // Regional lean bilateral → regional_lean group even though lean_mass defaults to overview.
  if (metricId === "lean_mass" && (region === "left_arm" || region === "right_arm" || region === "left_leg" || region === "right_leg")) {
    return "regional_lean";
  }
  // Android/gynoid composition → fat distribution.
  if (
    (metricId === "fat_percent" || metricId === "fat_mass") &&
    (region === "android" || region === "gynoid")
  ) {
    return "fat_distribution";
  }
  // Non-total composition masses → regional composition (except bone metrics).
  if (
    region !== "total" &&
    (metricId === "fat_percent" ||
      metricId === "fat_mass" ||
      metricId === "lean_mass" ||
      metricId === "total_mass" ||
      metricId === "bone_mineral_content") &&
    base.group !== "bone"
  ) {
    if (metricId === "lean_mass" && (region === "arms" || region === "legs" || region === "trunk" || region === "head")) {
      return "regional_composition";
    }
    if (metricId !== "lean_mass") return "regional_composition";
  }
  if (base.group === "source") return "overview";
  return base.group as Exclude<BodyScanMetricGroupId, "source">;
}

export function bodyScanSectionIdForRegistryGroup(
  group: Exclude<BodyScanMetricGroupId, "source">,
): Exclude<BodyScanSectionId, "source"> {
  return BODY_SCAN_GROUP_TO_SECTION[group];
}

export function isRegionAllowedForMetric(metricId: BodyScanMetricId, region: BodyScanRegion): boolean {
  return BODY_SCAN_METRIC_REGISTRY[metricId].allowedRegions.includes(region);
}

export function isUnitCompatibleWithMetric(metricId: BodyScanMetricId, unit: BodyScanUnit): boolean {
  const d = BODY_SCAN_METRIC_REGISTRY[metricId];
  return d.canonicalUnit === unit || d.supportedSourceUnits.includes(unit);
}

export function isMethodAllowedForMetric(metricId: BodyScanMetricId, method: BodyScanMethod): boolean {
  return BODY_SCAN_METRIC_REGISTRY[metricId].allowedMethods.includes(method);
}
