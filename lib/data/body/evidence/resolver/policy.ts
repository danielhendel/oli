/**
 * Versioned Body Composition Evidence Resolver policy (draft v1).
 *
 * Encodes ONLY frozen Dual Score relationships. Eligibility ≠ precedence.
 * Exact recency half-lives, confidence coefficients, and score transforms remain OPEN.
 *
 * Frozen matrix (draft v1):
 * - H1 / P2 / H4: complementary channels (no ordered winner)
 * - H2 / P3: FMI over total Body Fat % only
 * - H3: ALMI over FFMI only
 * - P1: no frozen ordered secondary chain (FFMI/FFM/Lean unranked when competing)
 *
 * Same-day DXA precedence is conceptually authorized but INACTIVE until a
 * measurement-day boundary ADR freezes timezone/calendar rules.
 */

import type {
  BodyCompositionConstructId,
  BodyCompositionEvidenceMetricKey,
} from "@oli/contracts";
import { BODY_COMPOSITION_RESOLVER_VERSION } from "@oli/contracts";

export const RESOLVER_POLICY_VERSION = BODY_COMPOSITION_RESOLVER_VERSION;

export type ResolverChannelDefinition = {
  channelId: string;
  metricKeys: readonly BodyCompositionEvidenceMetricKey[];
  requiresStandardizedWaistProtocol?: boolean;
  allowedRegions?: readonly (string | null)[];
  requireTotalRegion?: boolean;
  requireLimbRegion?: boolean;
  /**
   * When another channel is the frozen primary, this channel may be retained
   * as governed supporting (lower-specificity / redundancy) — not as a
   * frozen ordered tertiary primary.
   */
  governedSupportingWhenPrimary?: readonly string[];
};

/** Explicit frozen pair: primary beats supporting when both resolve. */
export type FrozenPrecedencePair = {
  primaryChannelId: string;
  supportingChannelId: string;
};

export type ResolverConstructPolicy = {
  constructId: BodyCompositionConstructId;
  publicLabel: string;
  role: "core" | "explanatory" | "optional";
  /** Eligible channels — presence ≠ preferred primary. */
  eligibleChannels: readonly ResolverChannelDefinition[];
  /** Only explicitly frozen primary→supporting pairs. */
  frozenPrecedencePairs: readonly FrozenPrecedencePair[];
  /**
   * When true, multiple resolved channels without a frozen pair are
   * complementary → multiple_valid (not policy_not_frozen).
   */
  complementary: boolean;
  /**
   * Channel ids that compete without frozen ranking when 2+ are active
   * and no frozen pair applies → policy_not_frozen.
   */
  openPrecedenceChannelIds: readonly string[];
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
    complementary: true,
    frozenPrecedencePairs: [],
    openPrecedenceChannelIds: [],
    eligibleChannels: [
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
    complementary: false,
    // Frozen: FMI over total Body Fat % only (Appendix B).
    frozenPrecedencePairs: [{ primaryChannelId: "fmi", supportingChannelId: "body_fat_percent" }],
    // Fat Mass vs BF% without FMI is open; Fat Mass alone may resolve.
    openPrecedenceChannelIds: ["body_fat_percent", "fat_mass"],
    eligibleChannels: [
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
        // When FMI is primary, Fat Mass is redundant input — governed supporting.
        governedSupportingWhenPrimary: ["fmi"],
      },
    ],
  },
  {
    constructId: "H3",
    publicLabel: "Lean Reserve",
    role: "core",
    complementary: false,
    // Frozen: ALMI over FFMI only.
    frozenPrecedencePairs: [{ primaryChannelId: "almi", supportingChannelId: "ffmi" }],
    openPrecedenceChannelIds: ["fat_free_mass", "lean_mass_total"],
    eligibleChannels: [
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
        governedSupportingWhenPrimary: ["almi", "ffmi"],
      },
      {
        channelId: "lean_mass_total",
        metricKeys: ["lean_mass"],
        requireTotalRegion: true,
        governedSupportingWhenPrimary: ["almi", "ffmi"],
      },
    ],
  },
  {
    constructId: "H4",
    publicLabel: "Fat Distribution",
    role: "explanatory",
    complementary: true,
    frozenPrecedencePairs: [],
    openPrecedenceChannelIds: [],
    eligibleChannels: [
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
    complementary: false,
    // No frozen FFMI → FFM → Lean chain in draft v1.
    frozenPrecedencePairs: [],
    openPrecedenceChannelIds: ["ffmi", "fat_free_mass", "lean_mass_total"],
    eligibleChannels: [
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
    complementary: true,
    frozenPrecedencePairs: [],
    openPrecedenceChannelIds: [],
    eligibleChannels: [
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
    complementary: false,
    frozenPrecedencePairs: [{ primaryChannelId: "fmi", supportingChannelId: "body_fat_percent" }],
    openPrecedenceChannelIds: ["body_fat_percent", "fat_mass"],
    eligibleChannels: [
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
        governedSupportingWhenPrimary: ["fmi"],
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
  for (const ch of policy.eligibleChannels) {
    for (const k of ch.metricKeys) keys.add(k);
  }
  return keys;
}

/** Frozen precedence pairs only — never inferred from array order. */
export function frozenPrecedencePairsFor(
  constructId: BodyCompositionConstructId,
): readonly FrozenPrecedencePair[] {
  return resolverConstructPolicy(constructId).frozenPrecedencePairs;
}
