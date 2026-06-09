// lib/data/program/types.ts
/**
 * Program domain — first-version, future-safe types for Oli's comprehensive program builder.
 *
 * Scope (v1): power the Program Home command center (active program, four builders,
 * saved/shared sections). These types are intentionally small but shaped to grow into
 * the full programming model (strength volume targets, cardio zones, nutrition macros,
 * recovery readiness) described in product programming docs.
 *
 * Persistence: NONE is implemented in v1. The repo's trust boundary forbids Firebase/API
 * calls in screens (see scripts/ci/assert-client-trust-boundary.mjs); server truth is read
 * through Zod-validated `lib/data/*` hooks. When persistence is approved, a Program is
 * intended to be a user-owned document at `users/{uid}/programs/{programId}` (mirroring the
 * existing user-owned data convention), read via a future `lib/data/program/useProgram*`
 * hook. Until then, Program Home is built from a pure, deterministic local selector.
 */

/** The four builders that compose a complete personal health program. */
export type ProgramBuilderType = "workout" | "cardio" | "nutrition" | "recovery";

/** Stable display order for the four builders (Workout → Cardio → Nutrition → Recovery). */
export const PROGRAM_BUILDER_ORDER: readonly ProgramBuilderType[] = [
  "workout",
  "cardio",
  "nutrition",
  "recovery",
] as const;

/**
 * Completion / availability state for a single builder.
 * `missing` is the v1 default (canonical readiness vocabulary) until the deep builder
 * for that domain ships; see lib/contracts/readiness.ts.
 */
export type ProgramBuilderStatus = "missing" | "not_started" | "in_progress" | "complete";

/**
 * Lifecycle of a saved program. `active` is the one currently driving the user's plan.
 * Designed for future save / use / edit / duplicate / archive flows.
 */
export type ProgramStatus = "active" | "draft" | "archived";

/**
 * Capabilities the Program architecture is designed to support. Not all are wired in v1 —
 * this union documents the intended surface so the model and UI can grow without reshaping.
 */
export type ProgramCapability =
  | "save"
  | "use"
  | "edit"
  | "duplicate"
  | "share"
  | "export"
  | "coachAssign"
  | "versionHistory";

/**
 * View-model for a single builder card on Program Home.
 * UI concerns (icon glyph) are mapped in the UI layer to keep this model presentation-agnostic.
 */
export type ProgramBuilderCardModel = {
  type: ProgramBuilderType;
  title: string;
  description: string;
  status: ProgramBuilderStatus;
  /** Human label for the status pill, e.g. "Coming soon". */
  statusLabel: string;
  /** Primary action label, e.g. "Build" or "Start". */
  ctaLabel: string;
  /** When true, the card opens an accessible disabled "coming soon" state instead of navigating. */
  disabled: boolean;
  /** Future deep-builder route. Null in v1 (no builder routes exist yet). */
  href: string | null;
};

/**
 * Summary of a saved/active/shared program. Future-safe shape for Firestore-backed,
 * user-owned program documents. Kept minimal in v1; extend per-builder detail later.
 */
export type ProgramSummary = {
  id: string;
  name: string;
  status: ProgramStatus;
  /** Owner user id — designed for user-owned docs at `users/{uid}/programs/{id}`. Null when local-only. */
  ownerUserId: string | null;
  /** ISO timestamps; replace with server timestamps when persistence lands. */
  createdAtIso: string;
  updatedAtIso: string;
  /** Monotonic version counter for future version history. */
  version: number;
  /** Per-builder completion snapshot (future-safe). */
  builderStatus: Record<ProgramBuilderType, ProgramBuilderStatus>;
};

/** Complete view-model for the Program Home screen. */
export type ProgramHomeModel = {
  /** The user's active program, or null when none has been created. */
  activeProgram: ProgramSummary | null;
  /** Ordered builder cards (always four, Workout → Cardio → Nutrition → Recovery). */
  builders: ProgramBuilderCardModel[];
  /** Saved programs (empty in v1). */
  savedPrograms: ProgramSummary[];
  /** Programs shared with the user / by the user (empty in v1). */
  sharedPrograms: ProgramSummary[];
};

/** Stack route hrefs for the four routed builder pages (under app/(app)/program/*). */
export type ProgramBuilderRoute =
  | "/(app)/program/workout"
  | "/(app)/program/cardio"
  | "/(app)/program/nutrition"
  | "/(app)/program/recovery";

/** Canonical mapping from builder type to its routed page. Single source of truth for navigation. */
export const PROGRAM_BUILDER_ROUTE: Record<ProgramBuilderType, ProgramBuilderRoute> = {
  workout: "/(app)/program/workout",
  cardio: "/(app)/program/cardio",
  nutrition: "/(app)/program/nutrition",
  recovery: "/(app)/program/recovery",
};

/**
 * View-model for a premium "coming soon" builder placeholder page (cardio / nutrition / recovery).
 * Pure copy; no data hooks. `capabilities` previews what the builder will support.
 */
export type PlaceholderBuilderModel = {
  type: Exclude<ProgramBuilderType, "workout">;
  title: string;
  /** Short explanation shown under the header. */
  intro: string;
  /** Status pill copy, e.g. "Coming soon". */
  comingSoonLabel: string;
  /** Bulleted preview of future capabilities. */
  capabilities: string[];
};
