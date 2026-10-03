/**
 * Versioned Body Composition Evidence Resolver policy (draft v1).
 *
 * Encodes frozen Dual Score construct channels and authorized precedence only.
 * Exact recency half-lives, confidence coefficients, and score transforms remain OPEN.
 */

import type {
  BodyCompositionConstructId,
  BodyCompositionEvidenceMetricKey,
} from "@oli/contracts";
import { BODY_COMPOSITION_RESOLVER_VERSION } from "@oli/contracts";

export const RESOLVER_POLICY_VERSION = BODY_COMPOSITION_RESOLVER_VERSION;

export type ResolverChannelPrecedenceMode =
  | "sole_when_present"
  | "frozen_primary_among_channels"
  | "complementary_multiple_valid"
  | "optional_explanatory";

export type ResolverChannelDefinition = {
  channelId: string;
  /** Metrics that may populate this channel. */
  metricKeys: readonly BodyCompositionEvidenceMetricKey[];
  /**
   * When true, waist/WHtR primary path requires WHO midpoint protocol on the
   * waist observation (or a waist input ref that carries that protocol).
   */
  requiresStandardizedWaistProtocol?: boolean;
  /** Region constraint; omit = any region allowed by metric semantics. */
  allowedRegions?: readonly (string | null)[];
  /**
   * Total-body lean/FFM only (excludes limb regions) when set.
   */
  requireTotalRegion?: boolean;
  /**
   * Limb/regional lean only.
   */
  requireLimbRegion?: boolean;
};

export type ResolverConstructPolicy = {
  constructId: BodyCompositionConstructId;
  publicLabel: string;
  role: "core" | "explanatory" | "optional";
  channels: readonly ResolverChannelDefinition[];
  /**
   * Ordered channel ids for frozen primary selection across channels.
   * Empty ⇒ complementary / multiple_valid when >1 channel resolves.
   */
  frozenChannelPrecedence: readonly string[];
  channelPrecedenceMode: ResolverChannelPrecedenceMode;
};

/**
 * ALMI is Dual-Score H3 primary when available even though the Bridge soft-tag
 * currently lists ALMI as P2-only. Policy — not observation tags — authorizes H3.
 */
export const BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES: readonly ResolverConstructPolicy[] = [
  {
    constructId: "H1",
    publicLabel: "Central Adiposity",
    role: "core",
    channelPrecedenceMode: "complementary_multiple_valid",
    frozenChannelPrecedence: [],
    channels: [
      {
        channelId: "whtr_standardized",
        metricKeys: ["whtr"],
        requiresStandardizedWaistProtocol: true,
        requireTotalRegion: true,
      },
      {
        channelId: "vat_mass",
        metricKeys: ["visceral_fat_mass"],
        requireTotalRegion: true,
      },
      {
        channelId: "vat_volume",
        metricKeys: ["visceral_fat_volume"],
        requireTotalRegion: true,
      },
    ],
  },
  {
    constructId: "H2",
    publicLabel: "Total Adiposity",
    role: "core",
    channelPrecedenceMode: "frozen_primary_among_channels",
    // FMI preferred when available; else BF%; fat mass is supporting channel only.
    frozenChannelPrecedence: ["fmi", "body_fat_percent", "fat_mass"],
    channels: [
      {
        channelId: "fmi",
        metricKeys: ["fmi"],
        requireTotalRegion: true,
      },
      {
        channelId: "body_fat_percent",
        metricKeys: ["fat_percent"],
        requireTotalRegion: true,
      },
      {
        channelId: "fat_mass",
        metricKeys: ["fat_mass"],
        requireTotalRegion: true,
      },
    ],
  },
  {
    constructId: "H3",
    publicLabel: "Lean Reserve",
    role: "core",
    channelPrecedenceMode: "frozen_primary_among_channels",
    // ALMI primary when available (Dual Score freeze); else FFMI; then FFM; Lean supporting.
    frozenChannelPrecedence: ["almi", "ffmi", "fat_free_mass", "lean_mass_total"],
    channels: [
      {
        channelId: "almi",
        metricKeys: ["almi"],
        requireTotalRegion: true,
      },
      {
        channelId: "ffmi",
        metricKeys: ["ffmi"],
        requireTotalRegion: true,
      },
      {
        channelId: "fat_free_mass",
        metricKeys: ["fat_free_mass"],
        requireTotalRegion: true,
      },
      {
        channelId: "lean_mass_total",
        metricKeys: ["lean_mass"],
        requireTotalRegion: true,
      },
    ],
  },
  {
    constructId: "H4",
    publicLabel: "Fat Distribution",
    role: "explanatory",
    channelPrecedenceMode: "optional_explanatory",
    frozenChannelPrecedence: ["android_gynoid_ratio", "android_fat_percent", "gynoid_fat_percent"],
    channels: [
      {
        channelId: "android_gynoid_ratio",
        metricKeys: ["android_gynoid_ratio"],
        requireTotalRegion: true,
      },
      {
        channelId: "android_fat_percent",
        metricKeys: ["fat_percent"],
        allowedRegions: ["android"],
      },
      {
        channelId: "gynoid_fat_percent",
        metricKeys: ["fat_percent"],
        allowedRegions: ["gynoid"],
      },
    ],
  },
  {
    constructId: "P1",
    publicLabel: "Muscularity",
    role: "core",
    channelPrecedenceMode: "frozen_primary_among_channels",
    // FFMI primary for muscularity; ALMI is not a second P1 vote (P2 owns appendicular).
    frozenChannelPrecedence: ["ffmi", "fat_free_mass", "lean_mass_total"],
    channels: [
      {
        channelId: "ffmi",
        metricKeys: ["ffmi"],
        requireTotalRegion: true,
      },
      {
        channelId: "fat_free_mass",
        metricKeys: ["fat_free_mass"],
        requireTotalRegion: true,
      },
      {
        channelId: "lean_mass_total",
        metricKeys: ["lean_mass"],
        requireTotalRegion: true,
      },
    ],
  },
  {
    constructId: "P2",
    publicLabel: "Regional Lean",
    role: "optional",
    channelPrecedenceMode: "complementary_multiple_valid",
    frozenChannelPrecedence: [],
    channels: [
      {
        channelId: "almi",
        metricKeys: ["almi"],
        requireTotalRegion: true,
      },
      {
        channelId: "lean_left_arm",
        metricKeys: ["lean_mass"],
        allowedRegions: ["left_arm"],
      },
      {
        channelId: "lean_right_arm",
        metricKeys: ["lean_mass"],
        allowedRegions: ["right_arm"],
      },
      {
        channelId: "lean_left_leg",
        metricKeys: ["lean_mass"],
        allowedRegions: ["left_leg"],
      },
      {
        channelId: "lean_right_leg",
        metricKeys: ["lean_mass"],
        allowedRegions: ["right_leg"],
      },
    ],
  },
  {
    constructId: "P3",
    publicLabel: "Performance Adiposity",
    role: "core",
    channelPrecedenceMode: "frozen_primary_among_channels",
    frozenChannelPrecedence: ["fmi", "body_fat_percent", "fat_mass"],
    channels: [
      {
        channelId: "fmi",
        metricKeys: ["fmi"],
        requireTotalRegion: true,
      },
      {
        channelId: "body_fat_percent",
        metricKeys: ["fat_percent"],
        requireTotalRegion: true,
      },
      {
        channelId: "fat_mass",
        metricKeys: ["fat_mass"],
        requireTotalRegion: true,
      },
    ],
  },
] as const;

export function resolverConstructPolicy(
  constructId: BodyCompositionConstructId,
): ResolverConstructPolicy {
  const found = BODY_COMPOSITION_RESOLVER_CONSTRUCT_POLICIES.find(
    (p) => p.constructId === constructId,
  );
  if (!found) {
    throw new Error(`missing_resolver_construct_policy:${constructId}`);
  }
  return found;
}

/** Metrics authorized for a construct by policy (independent of soft bridge tags). */
export function policyEligibleMetricsForConstruct(
  constructId: BodyCompositionConstructId,
): ReadonlySet<BodyCompositionEvidenceMetricKey> {
  const policy = resolverConstructPolicy(constructId);
  const keys = new Set<BodyCompositionEvidenceMetricKey>();
  for (const ch of policy.channels) {
    for (const k of ch.metricKeys) keys.add(k);
  }
  return keys;
}
