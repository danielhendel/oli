// lib/features/profile/digitalTwin/types.ts
// Digital Twin view-model types. Pure data shapes — no Firebase, no hooks, no on-device scoring.

import type {
  DailyFactsDto,
  HealthScoreDoc,
  HealthSignalDoc,
  IntelligenceContextDto,
  InsightsResponseDto,
  UserProfileMain,
} from "@/lib/contracts";

/** Canonical Digital Twin system identifiers (General + 13 top-level cards; used in routes + registry). */
export type DigitalTwinSystemId =
  | "general"
  | "cardiovascular"
  | "metabolic"
  | "body-composition"
  | "fitness"
  | "sleep-recovery"
  | "hormones-thyroid"
  | "organ-function"
  | "nutritional-status"
  | "inflammation-immune"
  | "cancer-prevention"
  | "genetics"
  | "brain-cognitive"
  | "environment-gut-data";

/** Metric importance tier within a system. */
export type MetricTier = "northStar" | "supporting" | "reference";

/**
 * User-facing system status. Derived ONLY from server truths (HealthScore tiers,
 * HealthSignals status) and data presence — never from an invented numeric score.
 */
export type SystemStatus = "strong" | "good" | "watch" | "needsData" | "unavailable";

/** Mass / length display units (mirrors preferences). */
export type MassUnit = "kg" | "lb";
export type LengthUnit = "cm" | "in";

/**
 * Resolved truth payloads passed from {@link useDigitalTwinHome} into the pure builders.
 * Each mirrors the `status` discriminant used by the underlying hooks.
 */
export type TwinDataContext = {
  healthScore:
    | { status: "partial" | "missing" | "error" }
    | { status: "ready"; data: HealthScoreDoc };
  healthSignals:
    | { status: "partial" | "missing" | "error" }
    | { status: "ready"; data: HealthSignalDoc };
  intelligence:
    | { status: "partial" | "missing" | "error" }
    | { status: "ready"; data: IntelligenceContextDto };
  insights:
    | { status: "partial" | "missing" | "error" }
    | { status: "ready"; data: InsightsResponseDto };
  dailyFacts:
    | { status: "partial" | "missing" | "error" }
    | { status: "ready"; data: DailyFactsDto };
  profile: UserProfileMain | null;
  labs:
    | { status: "partial" | "error" }
    | { status: "ready"; data: { items: readonly unknown[] } };
  uploads:
    | { status: "partial" | "error" }
    | { status: "ready"; data: { count: number; latest: unknown } };
  failures:
    | { status: "partial" | "error" }
    | { status: "ready"; data: { items: readonly unknown[] } };
  massUnit: MassUnit;
  lengthUnit: LengthUnit;
  signedOut: boolean;
};

/**
 * A single metric definition in the registry.
 * `description` is the short copy/frequency shown on the row (no fake values yet).
 * `read` is an optional pure resolver over {@link TwinDataContext} for future data binding.
 */
export type MetricDefinition = {
  id: string;
  label: string;
  tier: MetricTier;
  /** Short description / cadence shown on the metric row (e.g. "Annual lipid panel"). */
  description?: string;
  unit?: string;
  /** Optional pure resolver → display string when data exists, else null. Never throws. */
  read?: (ctx: TwinDataContext) => string | null;
  /**
   * Optional explicit module detail href. Omit to use the profile metric fallback.
   * Must reference a route that exists in the app router.
   */
  moduleHref?: string;
};

/** Static system descriptor (registry entry). */
export type DigitalTwinSystem = {
  id: DigitalTwinSystemId;
  title: string;
  shortTitle: string;
  description: string;
  /** Copy shown when the system has no data yet but is trackable. */
  needsDataCopy: string;
  /** Preferred CTA route for empty/needs-data state. Must exist in the router. */
  ctaRoute: string | null;
  ctaLabel: string | null;
  metrics: MetricDefinition[];
};

/** A supporting metric row in a system card / system page. */
export type MetricRowVm = {
  id: string;
  label: string;
  tier: MetricTier;
  /** Short description / cadence shown under the label, or null. */
  description: string | null;
  /** Display value, or null when no data exists (row still renders with a placeholder). */
  value: string | null;
  href: string;
  accessibilityLabel: string;
};

/** Per-system card / page view model. */
export type SystemVm = {
  id: DigitalTwinSystemId;
  title: string;
  shortTitle: string;
  description: string;
  status: SystemStatus;
  statusLabel: string;
  /** North-star headline value, or null when missing. */
  mainMetric: string | null;
  subtitle: string;
  rows: MetricRowVm[];
  /** True when this system has no real data and should render a Needs-Data card. */
  needsData: boolean;
  ctaRoute: string | null;
  ctaLabel: string | null;
  href: string;
  accessibilityLabel: string;
};

/** Digital Twin Overview card view model. */
export type OverviewVm = {
  /** Composite score 0–100 when HealthScore is ready, else null. */
  compositeScore: number | null;
  compositeTierLabel: string | null;
  /** "Stable" | "Attention Required" when HealthSignals ready, else null. */
  signalStatusLabel: string | null;
  signalAttention: boolean;
  /** True when HealthScore reports insufficient_data — UI must avoid fake zeroes. */
  insufficientData: boolean;
  systemsTracked: number;
  systemsNeedingData: number;
  systemsTrackable: number;
  completenessLabel: string;
  /** ISO timestamp from a server source when available, else null. */
  lastUpdated: string | null;
  loading: boolean;
  signedOut: boolean;
};

export type PriorityGroupKey = "attention" | "opportunities" | "missingData";

export type PriorityRowVm = {
  id: string;
  group: PriorityGroupKey;
  label: string;
  detail: string | null;
  href: string;
  accessibilityLabel: string;
};

export type PrioritiesVm = {
  groups: {
    key: PriorityGroupKey;
    title: string;
    rows: PriorityRowVm[];
  }[];
  isEmpty: boolean;
  emptyCopy: string;
};

/** Per-system completeness state. Aligned with — never conflicting with — HealthScore status. */
export type CompletenessSystemState =
  | "strong"
  | "good"
  | "watch"
  | "needsData"
  | "unavailable";

export type CompletenessVm = {
  systemsWithData: number;
  systemsTrackable: number;
  systemsNeedingData: number;
  bySystem: Record<DigitalTwinSystemId, CompletenessSystemState>;
};

/** Full Digital Twin Home view model. */
export type DigitalTwinHomeVm = {
  overview: OverviewVm;
  priorities: PrioritiesVm;
  systems: SystemVm[];
  completeness: CompletenessVm;
  signedOut: boolean;
};
