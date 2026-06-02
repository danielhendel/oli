/**
 * Workout Physiology v1 — Heart-rate zone presentation helpers.
 *
 * Single source of truth for how heart-rate zones are formatted on the Strength /
 * Cardio HR detail modals (durations, range labels, route-param fallbacks).
 *
 * - **Durations**: `heartRateZoneMinutes` is a fractional-minute tuple (`round2()` per
 *   session in {@link computeHeartRateZoneMinutes}). We render as `m:ss` (Apple Fitness
 *   parity) so a 32.816-minute zone shows as `32:49`, never invented or rounded away.
 * - **Range labels**: derived from {@link WorkoutHrZoneThresholdsResolution.thresholdsBpm}.
 *   When a zone basis was emitted alongside the tuple we use ITS thresholds; otherwise we
 *   fall back to {@link DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM} (the only
 *   `default_thresholds_v1` produced by Phase B enrichment).
 * - **Route-param fallback codec**: encodes the picked session's zone tuple into a stable,
 *   comma-separated string so the modal can render real durations even when the daily
 *   aggregate is missing (e.g. before `recomputeForDay` re-runs after the Phase C deploy).
 *   No raw mutation. No invented zones. Encoder rejects malformed tuples.
 */

import { DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM } from "@/lib/integrations/appleHealth/resolveWorkoutHrZoneThresholds";

/** Phase B fixed length zone tuple. Mirrors raw/canonical/dailyFacts contracts. */
export type HeartRateZoneMinutesTuple = readonly [number, number, number, number, number];

/** 1-based zone label used by both modal UIs and tests. */
export const HEART_RATE_ZONE_LABELS: readonly [string, string, string, string, string] = [
  "Zone 1",
  "Zone 2",
  "Zone 3",
  "Zone 4",
  "Zone 5",
] as const;

/**
 * Format a single zone's accumulated minutes (fractional) as Apple-Fitness-style `m:ss`.
 * - `0`, `0.0`, `0.004` (< 1 sec) → `"0:00"` (still rendered — zero is meaningful truth).
 * - `null`/`undefined`/`NaN`/negative → returns `null` so callers can render `"—"`.
 *
 * Implementation note: convert minutes → integer seconds with `Math.round`. This matches
 * Apple Fitness rounding for partial seconds (32.816 min × 60 = 1968.96s → 1969s → 32:49).
 */
export function formatZoneDurationMinSec(minutes: number | null | undefined): string | null {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0) return null;
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds - m * 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Format a zone's HR-bpm range from the resolved thresholds tuple.
 *
 * Given `[t1, t2, t3, t4]` (ascending) where:
 *  - Zone 1: bpm < t1     → `"<{t1} bpm"`
 *  - Zone 2: t1 ≤ bpm < t2 → `"{t1}–{t2 - 1} bpm"`
 *  - Zone 3: t2 ≤ bpm < t3 → `"{t2}–{t3 - 1} bpm"`
 *  - Zone 4: t3 ≤ bpm < t4 → `"{t3}–{t4 - 1} bpm"`
 *  - Zone 5: bpm ≥ t4     → `"{t4}+ bpm"`
 *
 * Uses an en-dash (U+2013) so the rendered range matches typography elsewhere
 * (e.g. "+110–185 kcal" in Daily Energy formatting).
 */
export function formatZoneRangeBpm(
  zoneIndex: 0 | 1 | 2 | 3 | 4,
  thresholdsBpm: readonly [number, number, number, number],
): string {
  const t = thresholdsBpm;
  switch (zoneIndex) {
    case 0:
      return `<${t[0]} bpm`;
    case 1:
      return `${t[0]}\u2013${t[1] - 1} bpm`;
    case 2:
      return `${t[1]}\u2013${t[2] - 1} bpm`;
    case 3:
      return `${t[2]}\u2013${t[3] - 1} bpm`;
    case 4:
      return `${t[3]}+ bpm`;
  }
}

/**
 * Resolve the thresholds tuple to use for range labels.
 *
 * Prefers the basis tuple emitted alongside the zone payload (forward-compat with future
 * personalized models). Falls back to the Phase B `default_thresholds_v1` constants so
 * the UI can still render ranges when only a tuple is supplied (e.g. a session-level
 * fallback that didn't carry the basis).
 */
export function resolveZoneDisplayThresholdsBpm(
  basis?: { thresholdsBpm?: readonly [number, number, number, number] } | null,
): readonly [number, number, number, number] {
  if (
    basis != null &&
    Array.isArray(basis.thresholdsBpm) &&
    basis.thresholdsBpm.length === 4 &&
    basis.thresholdsBpm.every((n) => typeof n === "number" && Number.isFinite(n) && n > 0)
  ) {
    return basis.thresholdsBpm;
  }
  return DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM;
}

/**
 * Validate a candidate zone-minutes tuple. Returns the validated tuple when all five
 * entries are finite non-negative numbers; returns `null` otherwise.
 *
 * Used by both daily-aggregate readers and the session-level route-param fallback codec.
 * Never coerces NaN → 0 (would invent zones). Length is strict (5).
 */
export function validateHeartRateZoneMinutesTuple(
  candidate: unknown,
): HeartRateZoneMinutesTuple | null {
  if (!Array.isArray(candidate) || candidate.length !== 5) return null;
  const out: number[] = [];
  for (const v of candidate) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
    out.push(v);
  }
  return [out[0]!, out[1]!, out[2]!, out[3]!, out[4]!] as const;
}

/**
 * Encode a zone-minutes tuple as a comma-separated string suitable for an Expo Router
 * route param. Uses up to 4 fractional digits (more than enough for `round2()` Phase B
 * output) to preserve `m:ss` rendering equality on the receiving modal. Returns `null`
 * when the input doesn't validate — caller must not pass an invented placeholder.
 */
export function encodeHeartRateZoneMinutesForRoute(
  tuple: HeartRateZoneMinutesTuple | null | undefined,
): string | null {
  const validated = tuple != null ? validateHeartRateZoneMinutesTuple(tuple) : null;
  if (validated == null) return null;
  return validated.map((n) => trimNumber(n)).join(",");
}

/**
 * Decode a route-param zone-minutes string emitted by {@link encodeHeartRateZoneMinutesForRoute}.
 * Returns `null` on any parse failure — the modal then renders the standard
 * "zones aren't available yet" fallback rather than fabricating values.
 */
export function decodeHeartRateZoneMinutesFromRoute(
  raw: string | string[] | undefined,
): HeartRateZoneMinutesTuple | null {
  const v = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : null;
  if (v == null || v.length === 0) return null;
  const parts = v.split(",");
  if (parts.length !== 5) return null;
  const parsed: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n) || n < 0) return null;
    parsed.push(n);
  }
  return [parsed[0]!, parsed[1]!, parsed[2]!, parsed[3]!, parsed[4]!] as const;
}

function trimNumber(n: number): string {
  if (n === 0) return "0";
  const s = n.toFixed(4);
  return s.replace(/\.?0+$/, "");
}

/**
 * Sum a zone tuple — used by the progress-bar layout to compute per-zone width
 * proportional to total zone duration. Always returns a finite non-negative number
 * (the tuple validator already enforced non-negative finiteness).
 */
export function sumHeartRateZoneMinutes(tuple: HeartRateZoneMinutesTuple): number {
  return tuple[0] + tuple[1] + tuple[2] + tuple[3] + tuple[4];
}
