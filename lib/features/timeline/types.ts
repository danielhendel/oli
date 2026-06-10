// lib/features/timeline/types.ts
// Typed model for the single-day Timeline log (Phase 1). Pure types only — no hooks, no Firebase.

import type { FailureKind } from "@/lib/api/http";

/** Visual + routing category for a timeline item. */
export type TimelineSourceType =
  | "sleep_wake"
  | "sleep"
  | "nutrition"
  | "supplement"
  | "caffeine"
  | "workout_strength"
  | "workout_cardio"
  | "workout"
  | "steps"
  | "activity"
  | "weight"
  | "body_composition"
  | "recovery"
  | "readiness"
  | "hrv"
  | "lab"
  | "upload"
  | "insight"
  | "manual_note"
  | "incomplete"
  | "unknown";

/**
 * One chronological entry in a day's timeline. Built from canonical events, raw events
 * (with payload), the resolved sleep night, and (optionally) insights.
 */
export type TimelineDayItem = {
  /** Stable key for virtualization. Raw id, canonical id, or a synthetic `sleep_wake:{day}`. */
  id: string;
  /** YYYY-MM-DD this item belongs to. */
  day: string;
  /** ISO timestamp used for chronological ordering and time labels. */
  timestamp: string;
  /** Deterministic sort key: `${timestamp}#${id}` (ascending). */
  sortKey: string;
  /** Primary label, e.g. "Coffee", "Upper Body Workout". */
  title: string;
  /** Optional secondary label, e.g. "7h 45m sleep", "320 kcal". */
  subtitle?: string;
  sourceType: TimelineSourceType;
  /** Origin record id (rawEventId or canonicalEventId), or synthetic id. */
  sourceId: string;
  /** Ionicons name used by the rail/card. */
  icon: string;
  /** Provenance confidence when available. */
  confidence?: "low" | "moderate" | "high";
  /** Provenance source when available (manual, oura, apple_health, correction, …). */
  provenance?: string;
  /** Resolved navigable route for tapping the item. */
  href: string;
  /** false for passive/ingested data, true for manual or incomplete entries. */
  isPassive: boolean;
  /** Stable accessibility label (time is prepended by the card at render). */
  accessibilityLabel: string;
};

/** Optional, lightweight day-at-a-glance summary derived from DailyFacts (no heavy aggregation). */
export type TimelineDaySummary = {
  steps?: number;
  totalKcal?: number;
  sleepMinutes?: number;
};

/** View model for a single day's timeline. */
export type TimelineDayVm = {
  day: string;
  items: readonly TimelineDayItem[];
  isEmpty: boolean;
  summary: TimelineDaySummary | null;
};

/**
 * Discriminated status for the orchestrating hook (canonical readiness vocabulary).
 * Only the primary source (canonical events) gates `partial` / `error`.
 */
export type TimelineDayStatus =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | { status: "ready"; vm: TimelineDayVm };
