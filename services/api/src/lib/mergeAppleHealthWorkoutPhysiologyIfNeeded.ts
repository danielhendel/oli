// services/api/src/lib/mergeAppleHealthWorkoutPhysiologyIfNeeded.ts
//
// Workout Physiology v1 — Phase B idempotent-replay merge.
//
// When POST /ingest hits an Apple Health workout idempotency collision, the default
// behavior is a no-op (the doc already exists). This merge function self-heals
// historical workouts ingested before Phase B (no physiology fields) — or workouts
// re-synced after a transient HealthKit miss — by additively patching the raw
// payload with the new physiology fields, then bumping `receivedAt` so the
// workout-aware update trigger
// (`services/functions/src/normalization/onRawEventUpdatedForNormalization.ts`)
// re-runs normalization and the canonical doc absorbs the new fields via the
// additive supersede gate in `writeCanonicalEventImmutable`.
//
// Contracts:
// - **Additive-only.** Existing values are NEVER overwritten — only absent→present.
// - **Apple Health workouts only.** Other providers/kinds skipped.
// - **Validation in / validation out.** Both the existing payload and the merged
//   result must pass `rawEventDocSchema`.
// - **No throw.** Returns `true` when a merge happened, `false` otherwise.

import { rawEventDocSchema } from "@oli/contracts";
import type { IngestRawEventBody } from "../types/events";

/** Physiology fields the merge will copy when incoming has them and existing does not. */
const PHYSIOLOGY_FIELDS_SIMPLE = [
  "averageHeartRateBpm",
  "maxHeartRateBpm",
  "activeEnergyKcal",
  "basalEnergyKcal",
  "totalEnergyKcal",
] as const;

const PHYSIOLOGY_FIELDS_OBJECT = [
  "heartRateZoneMinutes",
  "heartRateZoneBasis",
  "postWorkoutHeartRate",
] as const;

/**
 * Additively merge Workout Physiology v1 fields into an existing Apple Health workout
 * raw payload. Returns true when the merge wrote new fields; false when nothing changed
 * (e.g. existing payload already has every value, or the incoming payload has none).
 *
 * @param params.body          The incoming POST /ingest body (replay attempt).
 * @param params.existingData  Raw Firestore doc data for the existing rawEvent.
 * @param params.update        Async update fn; receives the merged `payload`.
 */
export async function mergeAppleHealthWorkoutPhysiologyIfNeeded(params: {
  body: IngestRawEventBody;
  existingData: unknown;
  update: (payload: Record<string, unknown>) => Promise<unknown>;
}): Promise<boolean> {
  const { body, existingData, update } = params;

  if (body.provider !== "apple_health" || body.kind !== "workout") return false;

  const incoming = body.payload;
  if (incoming == null || typeof incoming !== "object" || Array.isArray(incoming)) {
    return false;
  }
  const inc = incoming as Record<string, unknown>;

  const parsedExisting = rawEventDocSchema.safeParse(existingData);
  if (!parsedExisting.success) return false;
  const doc = parsedExisting.data;
  if (doc.provider !== "apple_health" || doc.kind !== "workout") return false;

  const prev = { ...(doc.payload as Record<string, unknown>) };
  let changed = false;

  // Simple numeric fields — copy when incoming is finite positive AND existing is absent/falsy.
  for (const k of PHYSIOLOGY_FIELDS_SIMPLE) {
    const inv = inc[k];
    if (typeof inv !== "number" || !Number.isFinite(inv) || inv < 0) continue;
    const prevVal = prev[k];
    if (typeof prevVal === "number" && Number.isFinite(prevVal) && prevVal > 0) continue;
    prev[k] = inv;
    changed = true;
  }

  // Object-shaped fields — copy when incoming is present AND existing is absent.
  // Special-case: heartRateZoneMinutes + heartRateZoneBasis MUST travel together.
  const incomingZones = inc["heartRateZoneMinutes"];
  const incomingBasis = inc["heartRateZoneBasis"];
  const incomingZonesValid =
    Array.isArray(incomingZones) &&
    incomingZones.length === 5 &&
    incomingZones.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0) &&
    incomingBasis != null &&
    typeof incomingBasis === "object";
  const existingZonesPresent =
    Array.isArray(prev["heartRateZoneMinutes"]) ||
    (prev["heartRateZoneBasis"] != null && typeof prev["heartRateZoneBasis"] === "object");
  if (incomingZonesValid && !existingZonesPresent) {
    prev["heartRateZoneMinutes"] = incomingZones;
    prev["heartRateZoneBasis"] = incomingBasis;
    changed = true;
  }

  for (const k of PHYSIOLOGY_FIELDS_OBJECT) {
    if (k === "heartRateZoneMinutes" || k === "heartRateZoneBasis") continue; // handled above
    const inv = inc[k];
    if (inv == null || typeof inv !== "object" || Array.isArray(inv)) continue;
    if (prev[k] != null) continue;
    prev[k] = inv;
    changed = true;
  }

  // physiologyVersion stamp: take it whenever any other physiology field landed.
  if (changed && prev["physiologyVersion"] !== 1) {
    prev["physiologyVersion"] = 1;
  }

  if (!changed) return false;

  const mergedDoc = { ...doc, payload: prev };
  const validatedMerged = rawEventDocSchema.safeParse(mergedDoc);
  if (!validatedMerged.success) return false;

  await update(validatedMerged.data.payload as Record<string, unknown>);
  return true;
}
