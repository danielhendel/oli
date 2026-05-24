/**
 * Pure planning helpers for `scripts/admin/repair-apple-health-workout-steps.mjs`.
 *
 * CommonJS so both the `.mjs` admin runner (via `createRequire`) and the Jest
 * `.test.ts` suite (via plain `require`) can consume it without
 * `--experimental-vm-modules`.
 *
 * Isolated from any Firestore / firebase-admin imports so unit tests can exercise
 * validation + per-workout plan decisions without touching network or admin SDK.
 *
 * Conventions:
 * - `null` measured steps ⇒ skip with `device_reported_no_samples` (preserves the
 *   intentional Phase 2A fail-closed behavior: NEAT residual stays honest).
 * - Already-positive raw or canonical steps, or an existing audit marker, ⇒ skip with
 *   `already_repaired_or_nonzero` (script is idempotent).
 * - Measured 0 (numeric) ⇒ skip with `measured_zero_no_op` (writing 0 is a no-op and we
 *   avoid spurious audit fields).
 * - Positive measured steps ⇒ rounded to nearest integer (HealthKit cumulative-sum
 *   queries may return fractional values), audit marker captured on raw payload only,
 *   canonical receives only `steps` + bumped `updatedAt`.
 */

"use strict";

const REPAIR_AUDIT_KEY = "appleHealthWorkoutStepsRepairV1";
const REPAIR_VERSION = 1;
const REPAIR_SOURCE = "device_debug_measurement";

function isYmd(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isNonEmptyString(s) {
  return typeof s === "string" && s.trim().length > 0;
}

/**
 * @param {unknown} input parsed JSON object
 * @param {string} expectedUid CLI-supplied uid
 * @param {string} expectedDay CLI-supplied day
 * @returns {{ ok: true, measurements: { rawEventId: string, steps: number | null }[] } | { ok: false, error: string }}
 */
function validateMeasurementsFile(input, expectedUid, expectedDay) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Measurements JSON must be a top-level object." };
  }
  const obj = input;
  const uid = obj["uid"];
  const day = obj["day"];
  const measurements = obj["measurements"];

  if (!isNonEmptyString(uid)) {
    return { ok: false, error: "Missing/invalid `uid` in measurements JSON." };
  }
  if (!isYmd(day)) {
    return {
      ok: false,
      error: "Missing/invalid `day` in measurements JSON (expected YYYY-MM-DD).",
    };
  }
  if (uid !== expectedUid) {
    return {
      ok: false,
      error: `uid mismatch: JSON has "${uid}", CLI has "${expectedUid}".`,
    };
  }
  if (day !== expectedDay) {
    return {
      ok: false,
      error: `day mismatch: JSON has "${day}", CLI has "${expectedDay}".`,
    };
  }
  if (!Array.isArray(measurements)) {
    return { ok: false, error: "`measurements` must be an array." };
  }
  if (measurements.length === 0) {
    return { ok: false, error: "`measurements` must contain at least one entry." };
  }

  const seen = new Set();
  const out = [];
  for (let i = 0; i < measurements.length; i++) {
    const m = measurements[i];
    if (!m || typeof m !== "object" || Array.isArray(m)) {
      return { ok: false, error: `measurements[${i}] must be an object.` };
    }
    const rec = m;
    const rawEventId = rec["rawEventId"];
    const steps = rec["steps"];
    if (!isNonEmptyString(rawEventId)) {
      return { ok: false, error: `measurements[${i}].rawEventId missing/invalid.` };
    }
    if (seen.has(rawEventId)) {
      return {
        ok: false,
        error: `measurements[${i}].rawEventId duplicated: "${rawEventId}".`,
      };
    }
    seen.add(rawEventId);
    if (steps === null) {
      out.push({ rawEventId, steps: null });
      continue;
    }
    if (typeof steps !== "number" || !Number.isFinite(steps) || steps < 0) {
      return {
        ok: false,
        error: `measurements[${i}].steps must be null or a finite non-negative number (got ${JSON.stringify(
          steps,
        )}).`,
      };
    }
    out.push({ rawEventId, steps });
  }
  return { ok: true, measurements: out };
}

/**
 * Decide the per-workout repair plan.
 *
 * @param {object} params
 * @param {string} params.rawEventId
 * @param {number | null} params.measuredSteps device-reported step total for the workout window
 * @param {Record<string, unknown> | null | undefined} params.rawDoc live raw doc (or null if missing)
 * @param {Record<string, unknown> | null | undefined} params.canonicalDoc live canonical doc (or null if missing)
 * @param {string} params.appliedAt ISO-8601 timestamp
 */
function planRepairForWorkout(params) {
  const { rawEventId, measuredSteps, rawDoc, canonicalDoc, appliedAt } = params;

  if (!isNonEmptyString(rawEventId)) {
    return { action: "error", error: "rawEventId missing/invalid." };
  }
  if (!isNonEmptyString(appliedAt)) {
    return { action: "error", error: "appliedAt missing/invalid." };
  }

  if (!rawDoc || typeof rawDoc !== "object") {
    return { action: "skip", reason: "raw_event_not_found" };
  }
  if (rawDoc["kind"] !== "workout") {
    return {
      action: "skip",
      reason: `raw_kind_not_workout (got "${String(rawDoc["kind"])}")`,
    };
  }
  if (rawDoc["provider"] !== "apple_health") {
    return {
      action: "skip",
      reason: `raw_provider_not_apple_health (got "${String(rawDoc["provider"])}")`,
    };
  }

  const payload = rawDoc["payload"];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { action: "skip", reason: "raw_payload_missing" };
  }
  const rawPayload = payload;

  if (!canonicalDoc || typeof canonicalDoc !== "object") {
    return { action: "skip", reason: "canonical_event_not_found" };
  }
  if (canonicalDoc["kind"] !== "workout") {
    return {
      action: "skip",
      reason: `canonical_kind_not_workout (got "${String(canonicalDoc["kind"])}")`,
    };
  }
  if (canonicalDoc["id"] !== rawEventId) {
    return {
      action: "skip",
      reason: `canonical_id_mismatch (canonical.id="${String(
        canonicalDoc["id"],
      )}", expected "${rawEventId}")`,
    };
  }

  if (measuredSteps === null) {
    return { action: "skip", reason: "device_reported_no_samples" };
  }
  if (
    typeof measuredSteps !== "number" ||
    !Number.isFinite(measuredSteps) ||
    measuredSteps < 0
  ) {
    return {
      action: "error",
      error: `measuredSteps invalid: ${JSON.stringify(measuredSteps)}`,
    };
  }

  const correctedStepsValue = Math.round(measuredSteps);

  const previousRawStepsRaw = rawPayload["steps"];
  const previousCanonicalStepsRaw = canonicalDoc["steps"];

  const previousRawSteps =
    typeof previousRawStepsRaw === "number" && Number.isFinite(previousRawStepsRaw)
      ? previousRawStepsRaw
      : null;
  const previousCanonicalSteps =
    typeof previousCanonicalStepsRaw === "number" &&
    Number.isFinite(previousCanonicalStepsRaw)
      ? previousCanonicalStepsRaw
      : null;

  const hasAuditMarker =
    rawPayload[REPAIR_AUDIT_KEY] != null &&
    typeof rawPayload[REPAIR_AUDIT_KEY] === "object";
  const rawAlreadyPositive = previousRawSteps !== null && previousRawSteps > 0;
  const canonicalAlreadyPositive =
    previousCanonicalSteps !== null && previousCanonicalSteps > 0;

  if (hasAuditMarker || rawAlreadyPositive || canonicalAlreadyPositive) {
    return {
      action: "skip",
      reason: "already_repaired_or_nonzero",
      details: {
        previousRawSteps,
        previousCanonicalSteps,
        hasAuditMarker,
      },
    };
  }

  if (correctedStepsValue === 0) {
    return {
      action: "skip",
      reason: "measured_zero_no_op",
      details: { previousRawSteps, previousCanonicalSteps },
    };
  }

  const auditMarker = {
    version: REPAIR_VERSION,
    appliedAt,
    previousStepsValue: previousRawSteps,
    correctedStepsValue,
    source: REPAIR_SOURCE,
  };

  const rawPayloadPatch = {
    ...rawPayload,
    steps: correctedStepsValue,
    [REPAIR_AUDIT_KEY]: auditMarker,
  };

  const canonicalPatch = {
    steps: correctedStepsValue,
    updatedAt: appliedAt,
  };

  return {
    action: "patch",
    correctedStepsValue,
    previousRawSteps,
    previousCanonicalSteps,
    rawPayloadPatch,
    canonicalPatch,
    auditMarker,
  };
}

/**
 * Verify the post-recompute DailyFacts allocation partition invariant.
 *
 * @param {{ steps: number, allocation: { neatSteps: number, strengthSteps: number, cardioSteps: number } }} input
 */
function verifyAllocationPartition(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "invalid input to verifyAllocationPartition" };
  }
  const total = input.steps;
  const a = input.allocation;
  if (!a || typeof a !== "object") return { ok: false, error: "allocation missing" };
  const n = a.neatSteps;
  const s = a.strengthSteps;
  const c = a.cardioSteps;
  if (
    typeof total !== "number" ||
    !Number.isFinite(total) ||
    typeof n !== "number" ||
    !Number.isFinite(n) ||
    typeof s !== "number" ||
    !Number.isFinite(s) ||
    typeof c !== "number" ||
    !Number.isFinite(c)
  ) {
    return { ok: false, error: "allocation/steps fields not finite numbers" };
  }
  const sum = Math.round(n) + Math.round(s) + Math.round(c);
  if (sum !== Math.round(total)) {
    return {
      ok: false,
      error: `partition_violation neat+strength+cardio=${sum} !== activity.steps=${Math.round(
        total,
      )}`,
    };
  }
  return { ok: true };
}

/**
 * Validate a **batch** measurements JSON of the shape produced by
 * `buildBatchHistoricalRepairJsonObject` in `/debug/integrations`.
 *
 * Shape:
 *   {
 *     "uid": "...",
 *     "generatedAt": "...",            // optional ISO string; informational only
 *     "days": [
 *       { "day": "YYYY-MM-DD", "measurements": [{ rawEventId, steps }, ...] },
 *       ...
 *     ]
 *   }
 *
 * Each day is independently re-validated by `validateMeasurementsFile`, so the same
 * idempotency / shape / fail-closed rules apply per day. Duplicate `day` keys across
 * entries are rejected (operator error guard).
 *
 * @param {unknown} input parsed JSON object
 * @param {string} expectedUid CLI-supplied uid
 * @returns {{
 *   ok: true,
 *   uid: string,
 *   generatedAt: string | null,
 *   days: { day: string, measurements: { rawEventId: string, steps: number | null }[] }[],
 * } | { ok: false, error: string }}
 */
function validateBatchMeasurementsFile(input, expectedUid) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Batch measurements JSON must be a top-level object." };
  }
  const obj = input;
  const uid = obj["uid"];
  const days = obj["days"];
  const generatedAtRaw = obj["generatedAt"];

  if (!isNonEmptyString(uid)) {
    return { ok: false, error: "Missing/invalid `uid` in batch measurements JSON." };
  }
  if (uid !== expectedUid) {
    return {
      ok: false,
      error: `uid mismatch: JSON has "${uid}", CLI has "${expectedUid}".`,
    };
  }
  if (!Array.isArray(days)) {
    return { ok: false, error: "`days` must be an array." };
  }
  if (days.length === 0) {
    return { ok: false, error: "`days` must contain at least one entry." };
  }

  const seenDays = new Set();
  const validated = [];
  for (let i = 0; i < days.length; i++) {
    const entry = days[i];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `days[${i}] must be an object.` };
    }
    const day = entry["day"];
    if (!isYmd(day)) {
      return {
        ok: false,
        error: `days[${i}].day missing/invalid (expected YYYY-MM-DD).`,
      };
    }
    if (seenDays.has(day)) {
      return { ok: false, error: `days[${i}].day "${day}" duplicated in batch.` };
    }
    seenDays.add(day);
    // Re-use the per-day validator. Synthesise a single-day object so we get the same
    // diagnostics surface; we already know uid + day match by construction.
    const perDay = validateMeasurementsFile(
      { uid, day, measurements: entry["measurements"] },
      uid,
      day,
    );
    if (!perDay.ok) {
      return {
        ok: false,
        error: `days[${i}] (${day}): ${perDay.error}`,
      };
    }
    validated.push({ day, measurements: perDay.measurements });
  }

  const generatedAt = isNonEmptyString(generatedAtRaw) ? generatedAtRaw : null;
  return { ok: true, uid, generatedAt, days: validated };
}

module.exports = {
  REPAIR_AUDIT_KEY,
  REPAIR_VERSION,
  REPAIR_SOURCE,
  isYmd,
  isNonEmptyString,
  validateMeasurementsFile,
  validateBatchMeasurementsFile,
  planRepairForWorkout,
  verifyAllocationPartition,
};
