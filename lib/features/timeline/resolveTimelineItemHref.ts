// lib/features/timeline/resolveTimelineItemHref.ts
// Pure source → route resolution for timeline items. Never returns a route that does not
// exist in the app router. Verified against app/(app)/** at implementation time.

import type { TimelineSourceType } from "@/lib/features/timeline/types";

export type ResolveHrefInput = {
  sourceType: TimelineSourceType;
  day: string;
  /** Present when the item is backed by a canonical event (enables event detail fallback). */
  canonicalEventId?: string;
};

/** Canonical event detail route (always exists: app/(app)/event/[id].tsx). */
export function eventDetailHref(canonicalEventId: string): string {
  return `/(app)/event/${encodeURIComponent(canonicalEventId)}`;
}

/**
 * Resolve a timeline item to a navigable href.
 *
 * Preference order:
 * 1. Module day/overview screens by category (richer than raw event detail).
 * 2. Canonical event detail when the item is canonical-backed.
 * 3. Timeline day route as a safe fallback (keeps incomplete resolve reachable).
 */
export function resolveTimelineItemHref(input: ResolveHrefInput): string {
  const { sourceType, day, canonicalEventId } = input;

  switch (sourceType) {
    case "nutrition":
    case "caffeine":
    case "supplement":
      return `/(app)/nutrition/day/${day}`;

    case "workout_strength":
    case "workout":
      return `/(app)/workouts/day/${day}`;

    case "workout_cardio":
      return `/(app)/cardio/day/${day}`;

    case "steps":
    case "activity":
      return `/(app)/activity/day/${day}`;

    case "weight":
    case "body_composition":
      return `/(app)/body/day/${day}`;

    case "sleep_wake":
    case "sleep":
      return `/(app)/recovery/sleep?day=${day}`;

    case "recovery":
    case "readiness":
    case "hrv":
      return `/(app)/recovery/readiness`;

    case "lab":
    case "upload":
      return `/(app)/labs`;

    case "insight":
      return `/(app)/dash/daily-recap`;

    case "incomplete":
    case "manual_note":
      // Keep the existing resolve modal (timeline day screen) reachable for manual fix-ups.
      return `/(app)/(tabs)/timeline/${day}`;

    case "unknown":
    default:
      return canonicalEventId
        ? eventDetailHref(canonicalEventId)
        : `/(app)/(tabs)/timeline/${day}`;
  }
}
