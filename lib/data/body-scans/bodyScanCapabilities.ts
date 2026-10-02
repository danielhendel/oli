/**
 * Body Scan method/device-family capability metadata (Phase A).
 *
 * Answers: can this method (and optionally device family) populate a metric?
 * Not a full InBody/Evolt adapter — boundaries only.
 */

import type { BodyScanMetricId, BodyScanMethod } from "@oli/contracts";

import { BODY_SCAN_METRIC_REGISTRY } from "./bodyScanMetricRegistry";

/** Device / report families — separate from scientific method. */
export type BodyScanDeviceFamily =
  | "ge_lunar"
  | "hologic"
  | "inbody"
  | "evolt"
  | "bod_pod"
  | "unknown";

export type BodyScanCapabilityLevel = "supported" | "optional" | "unsupported" | "deferred_ui";

export type BodyScanMetricCapability = {
  metricId: BodyScanMetricId;
  method: BodyScanMethod;
  deviceFamily?: BodyScanDeviceFamily;
  level: BodyScanCapabilityLevel;
  notes?: string;
};

/**
 * DXA (GE Lunar / Live Lean class) capabilities.
 * Optional = vendor/layout dependent; deferred_ui = ontology may map but V1 UI off.
 */
export const BODY_SCAN_DXA_CAPABILITIES: readonly BodyScanMetricCapability[] = [
  { metricId: "total_mass", method: "dxa", deviceFamily: "ge_lunar", level: "supported" },
  { metricId: "fat_percent", method: "dxa", deviceFamily: "ge_lunar", level: "supported" },
  { metricId: "fat_mass", method: "dxa", deviceFamily: "ge_lunar", level: "supported" },
  { metricId: "lean_mass", method: "dxa", deviceFamily: "ge_lunar", level: "supported" },
  {
    metricId: "fat_free_mass",
    method: "dxa",
    deviceFamily: "ge_lunar",
    level: "optional",
    notes: "Only when source labels Fat-Free Mass",
  },
  { metricId: "bone_mineral_content", method: "dxa", deviceFamily: "ge_lunar", level: "supported" },
  {
    metricId: "bone_mineral_density",
    method: "dxa",
    deviceFamily: "ge_lunar",
    level: "optional",
    notes: "When total-body bone table present",
  },
  {
    metricId: "visceral_fat_mass",
    method: "dxa",
    deviceFamily: "ge_lunar",
    level: "optional",
    notes: "VAT Mass / bare Mass column only; never invent from volume",
  },
  {
    metricId: "visceral_fat_volume",
    method: "dxa",
    deviceFamily: "ge_lunar",
    level: "optional",
    notes: "Vendor VAT module; never invent from mass",
  },
  {
    metricId: "android_gynoid_ratio",
    method: "dxa",
    deviceFamily: "ge_lunar",
    level: "optional",
  },
  {
    metricId: "t_score",
    method: "dxa",
    deviceFamily: "ge_lunar",
    level: "deferred_ui",
    notes: "Source may report; Stage 3E UI deferred; no diagnosis",
  },
  {
    metricId: "z_score",
    method: "dxa",
    deviceFamily: "ge_lunar",
    level: "deferred_ui",
    notes: "Source may report; Stage 3E UI deferred; no diagnosis",
  },
  {
    metricId: "skeletal_muscle_mass",
    method: "dxa",
    deviceFamily: "ge_lunar",
    level: "unsupported",
    notes: "Never map DXA lean_mass → skeletal_muscle_mass",
  },
];

/** Future BIA boundary: what BIA may / must not claim vs DXA. */
export const BODY_SCAN_BIA_BOUNDARY: {
  mayPopulate: readonly BodyScanMetricId[];
  mustNotPopulate: readonly BodyScanMetricId[];
} = {
  mayPopulate: [
    "total_mass",
    "fat_percent",
    "fat_mass",
    "lean_mass",
    "fat_free_mass",
    "skeletal_muscle_mass",
  ],
  mustNotPopulate: [
    "bone_mineral_density",
    "bone_mineral_content",
    "visceral_fat_volume",
    "visceral_fat_mass",
    "android_gynoid_ratio",
    "t_score",
    "z_score",
  ],
};

export function bodyScanDxaCapabilityFor(
  metricId: BodyScanMetricId,
): BodyScanMetricCapability | undefined {
  return BODY_SCAN_DXA_CAPABILITIES.find((c) => c.metricId === metricId);
}

export function bodyScanDxaMayEmit(metricId: BodyScanMetricId): boolean {
  const cap = bodyScanDxaCapabilityFor(metricId);
  if (!cap) return false;
  if (cap.level === "unsupported") return false;
  // deferred_ui: ontology yes, current DXA adapter must not emit candidates yet
  if (cap.level === "deferred_ui") return false;
  const def = BODY_SCAN_METRIC_REGISTRY[metricId];
  return def.allowedMethods.includes("dxa") && def.productStatus !== "future";
}
