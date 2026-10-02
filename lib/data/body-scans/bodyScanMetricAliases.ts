/**
 * Centralized Body Scan metric alias / compatibility map (Phase B).
 *
 * Old or alternate names → canonical registry key + default region.
 * No destructive migration; deterministic remapping only.
 */

import type { BodyScanMetricId, BodyScanRegion } from "@oli/contracts";

export type BodyScanMetricAliasTarget = {
  metricId: BodyScanMetricId;
  /** Default region when the alias does not encode one. */
  defaultRegion: BodyScanRegion;
};

/**
 * Alternate product/spec names and accidental combinatorial forms.
 * Canonical storage keys remain snake_case registry ids (e.g. fat_percent).
 */
export const BODY_SCAN_METRIC_ALIASES: Readonly<Record<string, BodyScanMetricAliasTarget>> = {
  body_fat_percent: { metricId: "fat_percent", defaultRegion: "total" },
  bodyFatPercent: { metricId: "fat_percent", defaultRegion: "total" },
  total_body_bmd: { metricId: "bone_mineral_density", defaultRegion: "total" },
  totalBodyBmd: { metricId: "bone_mineral_density", defaultRegion: "total" },
  bmd: { metricId: "bone_mineral_density", defaultRegion: "total" },
  vat_mass: { metricId: "visceral_fat_mass", defaultRegion: "total" },
  vat_volume: { metricId: "visceral_fat_volume", defaultRegion: "total" },
  ag_ratio: { metricId: "android_gynoid_ratio", defaultRegion: "total" },
  a_g_ratio: { metricId: "android_gynoid_ratio", defaultRegion: "total" },
  total_body_t_score: { metricId: "t_score", defaultRegion: "total" },
  total_body_z_score: { metricId: "z_score", defaultRegion: "total" },
  // Combinatorial forms — never first-class ontology keys.
  right_arm_lean_mass: { metricId: "lean_mass", defaultRegion: "right_arm" },
  left_arm_lean_mass: { metricId: "lean_mass", defaultRegion: "left_arm" },
  right_leg_lean_mass: { metricId: "lean_mass", defaultRegion: "right_leg" },
  left_leg_lean_mass: { metricId: "lean_mass", defaultRegion: "left_leg" },
  android_fat_percent: { metricId: "fat_percent", defaultRegion: "android" },
  gynoid_fat_percent: { metricId: "fat_percent", defaultRegion: "gynoid" },
};

/** fieldId patterns like `right_arm:lean_mass` or `total:fat_percent` (current Stage 3E). */
const FIELD_ID_PATTERN = /^(total|head|trunk|android|gynoid|arms|legs|left_arm|right_arm|left_leg|right_leg):([a-z0-9_]+)$/;

export function resolveBodyScanMetricAlias(rawKey: string): BodyScanMetricAliasTarget | null {
  const trimmed = rawKey.trim();
  if (!trimmed) return null;

  const fieldMatch = FIELD_ID_PATTERN.exec(trimmed);
  if (fieldMatch) {
    const region = fieldMatch[1] as BodyScanRegion;
    const metricId = fieldMatch[2] as BodyScanMetricId;
    return { metricId, defaultRegion: region };
  }

  const direct = BODY_SCAN_METRIC_ALIASES[trimmed];
  if (direct) return direct;

  // Case-insensitive alias lookup
  const lower = trimmed.toLowerCase();
  for (const [alias, target] of Object.entries(BODY_SCAN_METRIC_ALIASES)) {
    if (alias.toLowerCase() === lower) return target;
  }

  return null;
}

/**
 * Resolve a candidate identifier to metricId + region.
 * Prefer explicit metricId/region; fall back to fieldId / alias.
 */
export function resolveBodyScanMetricRef(args: {
  metricId?: string | null;
  region?: string | null;
  fieldId?: string | null;
}): { metricId: BodyScanMetricId; region: BodyScanRegion } | null {
  if (args.metricId && args.region) {
    return {
      metricId: args.metricId as BodyScanMetricId,
      region: args.region as BodyScanRegion,
    };
  }
  if (args.fieldId) {
    const fromField = resolveBodyScanMetricAlias(args.fieldId);
    if (fromField) return { metricId: fromField.metricId, region: fromField.defaultRegion };
  }
  if (args.metricId) {
    const fromAlias = resolveBodyScanMetricAlias(args.metricId);
    if (fromAlias) {
      return {
        metricId: fromAlias.metricId,
        region: (args.region as BodyScanRegion | undefined) ?? fromAlias.defaultRegion,
      };
    }
  }
  return null;
}
