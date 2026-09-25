/**
 * Body Scan metric catalog (pure).
 *
 * Labeling posture is binding:
 * - Lean Mass is Lean Mass. It is never relabelled Skeletal Muscle Mass or Muscle Mass.
 * - Total-body BMD is not a diagnostic hip/spine osteoporosis exam.
 * - No Oli score, banding, or interpretation is produced here.
 */

import type {
  BodyScanMetricId,
  BodyScanMethod,
  BodyScanRegion,
  BodyScanSectionId,
  BodyScanUnit,
} from "@oli/contracts";

export const BODY_SCAN_METRIC_LABELS: Record<BodyScanMetricId, string> = {
  fat_percent: "Fat",
  fat_mass: "Fat Mass",
  lean_mass: "Lean Mass",
  total_mass: "Total Mass",
  bone_mineral_content: "Bone Mineral Content",
  bone_mineral_density: "Bone Mineral Density",
  visceral_fat_mass: "Visceral Fat Mass",
  android_gynoid_ratio: "Android / Gynoid Ratio",
};

export const BODY_SCAN_REGION_LABELS: Record<BodyScanRegion, string> = {
  total: "Total Body",
  head: "Head",
  trunk: "Trunk",
  android: "Android",
  gynoid: "Gynoid",
  arms: "Arms",
  legs: "Legs",
  left_arm: "Left Arm",
  right_arm: "Right Arm",
  left_leg: "Left Leg",
  right_leg: "Right Leg",
};

export const BODY_SCAN_SECTION_TITLES: Record<BodyScanSectionId, string> = {
  overview: "Overview",
  fat_distribution: "Fat Distribution",
  regional_composition: "Regional Composition",
  regional_lean_balance: "Regional Lean Balance",
  total_body_bone: "Total Body Bone",
  source: "Source",
};

/** Restrained, non-diagnostic context shown under a section. */
export const BODY_SCAN_SECTION_NOTES: Partial<Record<BodyScanSectionId, string>> = {
  regional_composition:
    "Regional Lean Mass includes muscle, organs, connective tissue, and water. It is not a direct muscle measurement.",
  regional_lean_balance:
    "Side-to-side differences reflect Lean Mass, not measured muscle strength or function.",
  total_body_bone:
    "Total-body bone density is a composition measure. It is not a diagnostic hip or spine osteoporosis exam.",
};

const MASS_REGIONS: readonly BodyScanRegion[] = [
  "trunk",
  "arms",
  "legs",
  "left_arm",
  "right_arm",
  "left_leg",
  "right_leg",
  "head",
];

const LATERAL_PAIRS: readonly (readonly [BodyScanRegion, BodyScanRegion])[] = [
  ["left_arm", "right_arm"],
  ["left_leg", "right_leg"],
];

export function bodyScanLateralPairs(): readonly (readonly [BodyScanRegion, BodyScanRegion])[] {
  return LATERAL_PAIRS;
}

export function bodyScanMetricLabel(metricId: BodyScanMetricId): string {
  return BODY_SCAN_METRIC_LABELS[metricId];
}

export function bodyScanRegionLabel(region: BodyScanRegion): string {
  return BODY_SCAN_REGION_LABELS[region];
}

/** Human label for a metric at a region, e.g. "Left Arm Lean Mass". */
export function bodyScanMetricDisplayLabel(args: {
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
}): string {
  if (args.region === "total") {
    return args.metricId === "fat_percent"
      ? "Total Body Fat"
      : BODY_SCAN_METRIC_LABELS[args.metricId];
  }
  return `${BODY_SCAN_REGION_LABELS[args.region]} ${BODY_SCAN_METRIC_LABELS[args.metricId]}`;
}

export function bodyScanUnitSuffix(unit: BodyScanUnit): string {
  switch (unit) {
    case "percent":
      return "%";
    case "kg":
      return " kg";
    case "lb":
      return " lb";
    case "g":
      return " g";
    case "g_per_cm2":
      return " g/cm²";
    case "ratio":
      return "";
    default: {
      const _exhaustive: never = unit;
      return _exhaustive;
    }
  }
}

/**
 * Section a metric belongs to in the designed detail page.
 * `source` is never returned here — it is provenance, not a metric.
 */
export function bodyScanSectionForMetric(args: {
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
}): Exclude<BodyScanSectionId, "source"> {
  if (args.metricId === "bone_mineral_content" || args.metricId === "bone_mineral_density") {
    return "total_body_bone";
  }
  if (
    args.metricId === "visceral_fat_mass" ||
    args.metricId === "android_gynoid_ratio" ||
    args.region === "android" ||
    args.region === "gynoid"
  ) {
    return "fat_distribution";
  }
  if (args.region === "total") return "overview";
  if (args.metricId === "lean_mass" && isLateralRegion(args.region)) {
    return "regional_lean_balance";
  }
  if (MASS_REGIONS.includes(args.region)) return "regional_composition";
  return "overview";
}

export function isLateralRegion(region: BodyScanRegion): boolean {
  return LATERAL_PAIRS.some(([left, right]) => left === region || right === region);
}

/**
 * Comparability group — the only key permitted for future scan-to-scan comparison.
 * Comparing across methods or vendors is forbidden, so both are part of the key.
 */
export function bodyScanComparabilityGroup(args: {
  method: BodyScanMethod;
  manufacturer: string | null;
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
}): string {
  const vendor = (args.manufacturer ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${args.method}:${vendor || "unknown"}:${args.metricId}:${args.region}`;
}
