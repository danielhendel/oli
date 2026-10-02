/**
 * Body Scan presentation catalog (thin adapter over the canonical registry).
 *
 * The registry owns labels, groups, units, and visibility. This module only
 * provides region labels, section titles/notes, unit suffixes, and display
 * label composition for Review/Detail.
 *
 * Labeling posture is binding:
 * - Lean Mass is Lean Mass. It is never relabelled Skeletal Muscle Mass or Muscle Mass.
 * - Total Body BMD is not a diagnostic hip/spine osteoporosis exam.
 * - No Oli score, banding, or interpretation is produced here.
 */

import type {
  BodyScanMetricId,
  BodyScanMethod,
  BodyScanRegion,
  BodyScanSectionId,
  BodyScanUnit,
} from "@oli/contracts";

import {
  BODY_SCAN_METRIC_REGISTRY,
  bodyScanRegistryGroupForMetric,
  bodyScanSectionIdForRegistryGroup,
} from "./bodyScanMetricRegistry";

/** @deprecated Prefer registry labels via bodyScanMetricLabel — kept as a derived mirror. */
export const BODY_SCAN_METRIC_LABELS: Record<BodyScanMetricId, string> = Object.fromEntries(
  (Object.keys(BODY_SCAN_METRIC_REGISTRY) as BodyScanMetricId[]).map((key) => [
    key,
    BODY_SCAN_METRIC_REGISTRY[key].label,
  ]),
) as Record<BodyScanMetricId, string>;

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
  regional_lean_balance: "Regional Lean",
  total_body_bone: "Bone",
  source: "Source",
};

/** Restrained, non-diagnostic context shown under a section. */
export const BODY_SCAN_SECTION_NOTES: Partial<Record<BodyScanSectionId, string>> = {
  regional_composition:
    "Regional Lean Mass is soft tissue, not a direct muscle measurement.",
  regional_lean_balance:
    "Side-to-side differences reflect Lean Mass, not measured muscle strength or function.",
  total_body_bone:
    "Total-body bone density is a composition measure. It is not a diagnostic hip or spine osteoporosis exam.",
};

/** Stable bilateral order for Regional Lean (right then left). */
const LATERAL_PAIRS: readonly (readonly [BodyScanRegion, BodyScanRegion])[] = [
  ["right_arm", "left_arm"],
  ["right_leg", "left_leg"],
];

/** Regional composition region order (mobile-first cards). */
export const BODY_SCAN_REGIONAL_COMPOSITION_ORDER: readonly BodyScanRegion[] = [
  "arms",
  "legs",
  "trunk",
  "android",
  "gynoid",
  "head",
];

/** Bilateral lean region order. */
export const BODY_SCAN_BILATERAL_LEAN_ORDER: readonly BodyScanRegion[] = [
  "right_arm",
  "left_arm",
  "right_leg",
  "left_leg",
];

/** Within-group metric sort (lower = earlier). Unknowns sort last. */
export const BODY_SCAN_METRIC_SORT_INDEX: Readonly<Partial<Record<BodyScanMetricId, number>>> = {
  total_mass: 10,
  fat_percent: 20,
  fat_mass: 30,
  lean_mass: 40,
  fat_free_mass: 50,
  visceral_fat_mass: 10,
  visceral_fat_volume: 20,
  android_gynoid_ratio: 80,
  bone_mineral_content: 10,
  bone_mineral_density: 20,
};

export function bodyScanLateralPairs(): readonly (readonly [BodyScanRegion, BodyScanRegion])[] {
  return LATERAL_PAIRS;
}

export function bodyScanMetricLabel(metricId: BodyScanMetricId): string {
  return BODY_SCAN_METRIC_REGISTRY[metricId].label;
}

export function bodyScanRegionLabel(region: BodyScanRegion): string {
  return BODY_SCAN_REGION_LABELS[region];
}

/**
 * Human label for a metric at a region.
 * Registry owns the metric label; region is prefixed only when non-total.
 * BMD already includes "Total Body" in the registry label — do not double-prefix.
 */
export function bodyScanMetricDisplayLabel(args: {
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
}): string {
  const base = bodyScanMetricLabel(args.metricId);
  if (args.region === "total") return base;
  return `${BODY_SCAN_REGION_LABELS[args.region]} ${base}`;
}

/** Compact label inside a region card (metric only — region is the card title). */
export function bodyScanMetricLabelInRegion(metricId: BodyScanMetricId): string {
  return bodyScanMetricLabel(metricId);
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
    case "cm3":
      return " cm³";
    case "ratio":
    case "score":
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
 * Delegates group resolution to the canonical registry; maps group → section id.
 */
export function bodyScanSectionForMetric(args: {
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
}): Exclude<BodyScanSectionId, "source"> {
  return bodyScanSectionIdForRegistryGroup(
    bodyScanRegistryGroupForMetric(args.metricId, args.region),
  );
}

export function isLateralRegion(region: BodyScanRegion): boolean {
  return LATERAL_PAIRS.some(([right, left]) => left === region || right === region);
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
