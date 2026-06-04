import type { DayKey } from "@/lib/ui/calendar/types";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";
import { classifyWorkoutType } from "@/lib/data/workouts/workoutMarkerFlags";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  deriveOverviewTabSessionCounts,
  sortWorkoutsChronologicalAsc,
} from "@/lib/data/workouts/workoutsCalendarModel";

/** Minimal canonical workout shapes for server dailyFacts aggregation (no functions types dep). */
export type CanonicalWorkoutEventForReconcile =
  | {
      kind: "workout";
      id: string;
      sourceId: string;
      start: string;
      end: string;
      sport: string;
      durationMinutes: number;
      distanceMeters?: number | null;
      /** IANA zone (canonical `timezone`); used to pick the offset-matching duplicate variant. */
      timezone?: string;
      /** Canonical audit field; tie-break when no timezone match. */
      updatedAt?: string;
    }
  | {
      kind: "strength_workout";
      id: string;
      sourceId: string;
      start: string;
      end: string;
      exercises: readonly { exercise: string }[];
      timezone?: string;
      updatedAt?: string;
    };

function durationMinutesFromStartEnd(start: string, end: string): number | null {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return Math.max(1, Math.round((endMs - startMs) / 60_000));
}

/**
 * Stable HealthKit source/device UUID embedded in Apple Health canonical ids, e.g.
 * `appleHealth:v2:workout:..._50_com.apple.health.<UUID>`.
 *
 * IMPORTANT: this UUID identifies the *source device*, not a single workout — the same watch
 * emits many workouts that all share it (confirmed in prod: a day with three distinct workouts
 * carried one shared `52A581D0-…` suffix). It is therefore necessary but NOT sufficient to
 * identify a duplicate; the duplicate key also requires an identical UTC time window
 * (see {@link appleHealthWorkoutDuplicateKey}). Returns null for non-Apple ids.
 */
export function extractAppleHealthWorkoutUuid(id: string): string | null {
  const m = /com\.apple\.health\.([0-9A-Fa-f-]+)/.exec(id);
  return m && m[1] ? m[1] : null;
}

/**
 * Duplicate-collapse key for an Apple Health workout canonical, or null when the row is not an
 * Apple Health workout with a resolvable device UUID + finite UTC window.
 *
 * Apple re-renders one physical workout as multiple canonical docs that differ only by the local
 * offset of the window (e.g. `…-0400` vs `…+0200`); those share the device UUID **and** resolve to
 * the same UTC `start`/`end` instants. Two genuinely separate workouts from the same device share
 * the UUID but have different instants, so including the window keeps them distinct.
 */
export function appleHealthWorkoutDuplicateKey(
  e: CanonicalWorkoutEventForReconcile & { kind: "workout" },
): string | null {
  const uuid = extractAppleHealthWorkoutUuid(e.id);
  if (uuid == null) return null;
  const startMs = Date.parse(e.start);
  const endMs = Date.parse(e.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return `${uuid}|${startMs}|${endMs}`;
}

/** Parse the trailing UTC offset (in minutes) from an ISO string like `...-0400` / `...+02:00` / `...Z`. */
function offsetMinutesFromIso(iso: string): number | null {
  if (/[zZ]$/.test(iso)) return 0;
  const m = /([+-])(\d{2}):?(\d{2})$/.exec(iso);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number(m[2]);
  const mm = Number(m[3]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return sign * (hh * 60 + mm);
}

/** Offset (minutes) of an IANA timezone at a given instant, or null when unresolvable. */
function offsetMinutesForTimeZoneAtInstant(timeZone: string, instantMs: number): number | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" });
    const part = fmt.formatToParts(new Date(instantMs)).find((p) => p.type === "timeZoneName");
    const value = part?.value ?? "";
    if (/^(GMT|UTC)$/.test(value)) return 0;
    const m = /(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/.exec(value);
    if (!m) return null;
    const sign = m[1] === "-" ? -1 : 1;
    const hh = Number(m[2]);
    const mm = m[3] != null ? Number(m[3]) : 0;
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return sign * (hh * 60 + mm);
  } catch {
    return null;
  }
}

type AppleWorkoutCanonical = CanonicalWorkoutEventForReconcile & { kind: "workout" };

/**
 * Pick the single representative among Apple Health workout canonicals sharing one duplicate key
 * (same device UUID + identical UTC window — i.e. local-offset re-renders of one physical workout).
 * Preference: (1) the variant whose `start` offset matches its IANA `timezone` at that instant;
 * (2) latest `updatedAt`, then latest `start`/`observedAt`; (3) deterministic id sort.
 */
function pickRepresentativeAppleWorkout(group: AppleWorkoutCanonical[]): AppleWorkoutCanonical {
  if (group.length === 1) return group[0]!;

  const offsetMatched = group.filter((e) => {
    if (!e.timezone) return false;
    const startMs = Date.parse(e.start);
    if (!Number.isFinite(startMs)) return false;
    const isoOffset = offsetMinutesFromIso(e.start);
    if (isoOffset == null) return false;
    const tzOffset = offsetMinutesForTimeZoneAtInstant(e.timezone, startMs);
    return tzOffset != null && tzOffset === isoOffset;
  });

  const pool = offsetMatched.length > 0 ? offsetMatched : group;

  return [...pool].sort((a, b) => {
    const ua = a.updatedAt ?? "";
    const ub = b.updatedAt ?? "";
    if (ua !== ub) return ua < ub ? 1 : -1; // latest updatedAt first
    const sa = a.start ?? "";
    const sb = b.start ?? "";
    if (sa !== sb) return sa < sb ? 1 : -1; // latest start first
    return a.id.localeCompare(b.id);
  })[0]!;
}

/**
 * Collapse Apple Health workout canonicals that represent the same physical HK workout
 * (same device UUID **and** identical UTC window) down to one representative. This targets the
 * local-offset re-render duplicates (e.g. `-0400` vs `+0200`) without merging genuinely separate
 * workouts that share the device UUID at different times.
 *
 * `strength_workout` rows, Apple workouts without a resolvable duplicate key, and any other rows
 * are preserved verbatim so they still merge in {@link reconcileWorkoutSessionsForDay}
 * (e.g. a manual `strength_workout` merging with the surviving Apple workout).
 */
export function collapseAppleHealthDuplicateWorkoutCanonicals(
  events: readonly CanonicalWorkoutEventForReconcile[],
): CanonicalWorkoutEventForReconcile[] {
  const byKey = new Map<string, AppleWorkoutCanonical[]>();
  const passthrough: CanonicalWorkoutEventForReconcile[] = [];

  for (const e of events) {
    const key = e.kind === "workout" ? appleHealthWorkoutDuplicateKey(e) : null;
    if (e.kind === "workout" && key != null) {
      const group = byKey.get(key);
      if (group) group.push(e);
      else byKey.set(key, [e]);
    } else {
      passthrough.push(e);
    }
  }

  const collapsed: CanonicalWorkoutEventForReconcile[] = [];
  for (const group of byKey.values()) {
    collapsed.push(pickRepresentativeAppleWorkout(group));
  }
  return [...collapsed, ...passthrough];
}

function workoutCanonicalToHistoryItem(e: CanonicalWorkoutEventForReconcile & { kind: "workout" }): WorkoutHistoryItem {
  const sport = e.sport;
  const title = sport.trim().length > 0 ? sport : "";
  const workoutType = classifyWorkoutType({
    rawKind: "workout",
    title,
    sport,
    distanceMeters: e.distanceMeters,
  });
  return {
    id: e.id,
    observedAt: e.start,
    sourceId: e.sourceId,
    provider: e.sourceId,
    rawKind: "workout",
    title,
    ...(workoutType != null ? { workoutType } : {}),
    sport,
    start: e.start,
    end: e.end,
    durationMinutes: e.durationMinutes,
    calories: null,
    ...(e.distanceMeters != null ? { distanceMeters: e.distanceMeters } : {}),
  };
}

function strengthWorkoutCanonicalToHistoryItem(
  e: CanonicalWorkoutEventForReconcile & { kind: "strength_workout" },
): WorkoutHistoryItem {
  const firstEx = e.exercises[0]?.exercise?.trim() ?? "";
  const title = firstEx.length > 0 ? firstEx : "Strength workout";
  return {
    id: e.id,
    observedAt: e.start,
    sourceId: e.sourceId,
    provider: e.sourceId,
    rawKind: "strength_workout",
    title,
    workoutType: "strength",
    start: e.start,
    end: e.end,
    durationMinutes: durationMinutesFromStartEnd(e.start, e.end),
    calories: null,
  };
}

export function workoutHistoryItemsFromCanonicalWorkoutEvents(
  events: readonly CanonicalWorkoutEventForReconcile[],
): WorkoutHistoryItem[] {
  const out: WorkoutHistoryItem[] = [];
  for (const e of events) {
    if (e.kind === "workout") out.push(workoutCanonicalToHistoryItem(e));
    else out.push(strengthWorkoutCanonicalToHistoryItem(e));
  }
  return out;
}

/**
 * Strength-tab session count for a calendar day — same rules as Strength Overview / This Week
 * ({@link reconcileWorkoutSessionsForDay} + {@link deriveOverviewTabSessionCounts}).
 */
export function countReconciledStrengthTabSessionsForDay(
  day: DayKey,
  events: readonly CanonicalWorkoutEventForReconcile[],
): number {
  const deduped = collapseAppleHealthDuplicateWorkoutCanonicals(events);
  const items = sortWorkoutsChronologicalAsc(workoutHistoryItemsFromCanonicalWorkoutEvents(deduped));
  const sessions = reconcileWorkoutSessionsForDay(day, items);
  return deriveOverviewTabSessionCounts(sessions).strengthSessionCount;
}
