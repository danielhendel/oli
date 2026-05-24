/**
 * DEV-ONLY pure helpers used by `/debug/integrations` to assemble the repair JSON
 * consumed by `scripts/admin/repair-apple-health-workout-steps.mjs` for **historical**
 * Apple Health workouts (ingested before the P0 HealthKit step-enrichment fix).
 *
 * The matching admin script (CommonJS planner) is the source of truth for the JSON
 * wire shape and idempotency / safety semantics. These helpers only:
 *  1. Validate that a day string is `YYYY-MM-DD`.
 *  2. Filter HealthKit workouts to the cardio/strength classes that the
 *     `buildActivityStepsAllocationV1` partition consumes (so we don't probe sports
 *     the allocator would ignore anyway).
 *  3. Serialise per-workout `(start, end, activityId, sourceId, measuredSteps)` tuples
 *     into the exact JSON shape the admin script accepts.
 *
 * No HealthKit calls, no Firestore I/O, no clipboard work — those happen in the
 * `/debug/integrations` screen so this module stays unit-testable under Jest without
 * mocking native bridges.
 */

import { classifyWorkoutSportForDailyFactsRollup } from "@/lib/shared/workoutClassification";
import { workoutIdempotencyKey } from "@/lib/integrations/appleHealth/idempotency";
import type { TodayWorkout } from "@/lib/integrations/appleHealth/types";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Strict `YYYY-MM-DD` validator. Rejects empty strings, malformed shapes, and impossible
 * calendar dates (e.g. `2026-02-30`). Matches the day-key contract used elsewhere in the
 * repo (`LOCAL_DAY_KEY_RE` in `lib/integrations/appleHealth/healthKit.ts`).
 */
export function isValidYmd(input: string | null | undefined): boolean {
  if (typeof input !== "string" || !DAY_KEY_RE.test(input)) return false;
  const [ys, ms, ds] = input.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // Roundtrip via Date to catch impossible dates (Feb 30, Apr 31, etc.).
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * Keep only the HealthKit workouts whose `activityName` classifies as cardio or strength
 * via {@link classifyWorkoutSportForDailyFactsRollup} — i.e. workouts that
 * {@link buildActivityStepsAllocationV1} would include in the partition. Workouts
 * classified as `"exclude"` (e.g. `"Other"`, unknown sports) are dropped because their
 * `payload.steps` does not affect the allocation and patching them would be wasted I/O.
 *
 * Pure / non-throwing; returns a new array in the same order as the input.
 */
export function filterHistoricalAppleWorkoutsForRepair(
  workouts: readonly TodayWorkout[],
): TodayWorkout[] {
  const out: TodayWorkout[] = [];
  for (const w of workouts) {
    if (typeof w.activityName !== "string") continue;
    const klass = classifyWorkoutSportForDailyFactsRollup(w.activityName);
    if (klass === "cardio" || klass === "strength") out.push(w);
  }
  return out;
}

export type HistoricalRepairProbeItem = {
  start: string;
  end: string;
  activityId: number;
  sourceId: string | null;
  /**
   * Result of re-running `getStepCountForDateRange(start, end)` against HealthKit on the
   * device. `null` means HealthKit returned no reliable samples; the admin planner
   * preserves fail-closed semantics and skips the workout.
   */
  measuredSteps: number | null;
};

export type HistoricalRepairJsonInput = {
  uid: string;
  day: string;
  items: readonly HistoricalRepairProbeItem[];
};

export type HistoricalRepairJsonMeasurement = {
  rawEventId: string;
  steps: number | null;
};

export type HistoricalRepairJsonObject = {
  uid: string;
  day: string;
  measurements: HistoricalRepairJsonMeasurement[];
};

/**
 * Coerce a measured step count to the integer the admin planner stores in
 * `canonical.steps` / `payload.steps`. Negative or non-finite values collapse to `null`
 * so the admin planner records `device_reported_no_samples` instead of patching with a
 * nonsense value.
 */
function normalizeMeasuredSteps(value: number | null): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  if (value < 0) return null;
  return Math.round(value);
}

/**
 * Build the deterministic JSON object that
 * `scripts/admin/repair-apple-health-workout-steps.mjs --measurements <path>` consumes.
 *
 * - `rawEventId` is `workoutIdempotencyKey({ startIso, endIso, activityId, sourceId })`,
 *   matching the Firestore doc id used by `runAnchoredWorkoutsSync` for new workouts.
 *   Historical pre-`appleHealth:v2:` workouts will not match the live doc id; the admin
 *   planner skips them safely (`plan_skip(read_failed)` / `plan_error`).
 * - Order is preserved from the input. The admin planner is order-insensitive but stable
 *   output keeps copy/paste/diff workflows predictable.
 * - Pure: no HealthKit calls, no Firestore I/O, no clipboard. Safe under Jest with no
 *   native mocking.
 */
export function buildHistoricalRepairJsonObject(
  input: HistoricalRepairJsonInput,
): HistoricalRepairJsonObject {
  const measurements: HistoricalRepairJsonMeasurement[] = input.items.map((it) => ({
    rawEventId: workoutIdempotencyKey({
      startIso: it.start,
      endIso: it.end,
      activityId: it.activityId,
      sourceId: it.sourceId ?? null,
    }),
    steps: normalizeMeasuredSteps(it.measuredSteps),
  }));
  return { uid: input.uid, day: input.day, measurements };
}

/** Same as {@link buildHistoricalRepairJsonObject}, pretty-printed with 2-space indent. */
export function buildHistoricalRepairJsonString(input: HistoricalRepairJsonInput): string {
  return JSON.stringify(buildHistoricalRepairJsonObject(input), null, 2);
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

/**
 * Parse a free-form textarea of day keys (newline / comma / whitespace separated) into
 * a deterministic list of valid `YYYY-MM-DD` day keys.
 *
 * - Trims surrounding whitespace per token.
 * - Skips blank tokens.
 * - Dedupes while preserving first-seen order.
 * - **Throws** with a descriptive message on the first invalid day token. The UI uses
 *   the throw to fail closed and refuse to probe.
 *
 * Pure / synchronous. Safe to call before any HealthKit work.
 */
export function parseHistoricalRepairDaysInput(input: string): string[] {
  if (typeof input !== "string") {
    throw new Error("parseHistoricalRepairDaysInput: input must be a string.");
  }
  const tokens = input
    .split(/[\s,]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    if (!isValidYmd(token)) {
      throw new Error(`Invalid day "${token}". Expected YYYY-MM-DD.`);
    }
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

export type BatchHistoricalRepairDayInput = {
  day: string;
  items: readonly HistoricalRepairProbeItem[];
};

export type BatchHistoricalRepairJsonInput = {
  uid: string;
  generatedAt: string;
  days: readonly BatchHistoricalRepairDayInput[];
};

export type BatchHistoricalRepairJsonDay = {
  day: string;
  measurements: HistoricalRepairJsonMeasurement[];
};

export type BatchHistoricalRepairJsonObject = {
  uid: string;
  generatedAt: string;
  days: BatchHistoricalRepairJsonDay[];
};

/**
 * Build the batch repair JSON the orchestrator script
 * `scripts/admin/repair-apple-health-workout-steps-batch.mjs` consumes.
 *
 * Rules (mirroring the per-day builder + the user's batch contract):
 * - Days with zero measurements are dropped (no empty rows).
 * - Day order from `input.days` is preserved.
 * - Within a day, workout order from `items` is preserved.
 * - Each `measurements[].steps` is normalised through the same fail-closed rounding as
 *   the per-day builder (`null` for nullish / negative / non-finite values, integer
 *   otherwise).
 * - `rawEventId` uses `workoutIdempotencyKey` so it matches the live Firestore doc id
 *   (the same key the per-day repair script uses).
 *
 * Pure: no HealthKit / Firestore / clipboard work.
 */
export function buildBatchHistoricalRepairJsonObject(
  input: BatchHistoricalRepairJsonInput,
): BatchHistoricalRepairJsonObject {
  const days: BatchHistoricalRepairJsonDay[] = [];
  for (const d of input.days) {
    if (d.items.length === 0) continue;
    const measurements = buildHistoricalRepairJsonObject({
      uid: input.uid,
      day: d.day,
      items: d.items,
    }).measurements;
    if (measurements.length === 0) continue;
    days.push({ day: d.day, measurements });
  }
  return { uid: input.uid, generatedAt: input.generatedAt, days };
}

/** Same as {@link buildBatchHistoricalRepairJsonObject}, pretty-printed with 2-space indent. */
export function buildBatchHistoricalRepairJsonString(
  input: BatchHistoricalRepairJsonInput,
): string {
  return JSON.stringify(buildBatchHistoricalRepairJsonObject(input), null, 2);
}
