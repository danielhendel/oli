// services/functions/src/normalization/writeCanonicalEventImmutable.ts

import crypto from "node:crypto"; // ✅ ADD
import * as logger from "firebase-functions/logger";
import { admin, db } from "../firebaseAdmin";
import type {
  CanonicalEvent,
  StepsCanonicalEvent,
  WorkoutCanonicalEvent,
  YmdDateString,
} from "../types/health";
import { canonicalEquals, canonicalHash } from "./canonicalImmutability";

/**
 * Workout Physiology v1 — Phase B supersede gate.
 *
 * Returns `true` iff the incoming canonical differs from `existing` ONLY by:
 *
 *   - newly populated workout physiology fields (`activeEnergyKcal`,
 *     `basalEnergyKcal`, `totalEnergyKcal`, `heartRateZoneMinutes`,
 *     `heartRateZoneBasis`, `postWorkoutHeartRate`, `physiologyVersion`)
 *   - newly populated `averageHeartRateBpm` / `maxHeartRateBpm` (Phase B padded
 *     enrichment can recover values the strict-window summary missed —
 *     `strictHrMissedButPaddedFound` observed in Phase A diagnostics)
 *   - the `updatedAt` timestamp (carried by the raw `receivedAt` bump)
 *
 * Returns `false` if any of these are violated:
 *   - existing value present and incoming value differs (no overwrites)
 *   - any non-physiology canonical field changed (sport, durationMinutes, day,
 *     start, end, timezone, distance, steps, sets, trainingLoad, …)
 *
 * Fail-closed: any unexpected mutation → conflict path → integrity evidence.
 */
function isWorkoutPhysiologyAdditiveSupersede(
  existing: WorkoutCanonicalEvent,
  incoming: WorkoutCanonicalEvent,
): boolean {
  if (incoming.id !== existing.id) return false;

  // 1) Verify the protected "truth" fields are byte-equal.
  const protectedKeys = [
    "userId",
    "sourceId",
    "kind",
    "start",
    "end",
    "day",
    "timezone",
    "createdAt",
    "schemaVersion",
    "sport",
    "intensity",
    "durationMinutes",
    "trainingLoad",
    "distanceMeters",
    "paceMinPerKm",
    "speedMetersPerSecond",
    "sets",
    "steps",
  ] as const;
  for (const k of protectedKeys) {
    const a = (existing as unknown as Record<string, unknown>)[k];
    const b = (incoming as unknown as Record<string, unknown>)[k];
    if (!deepEqualForCanonical(a, b)) return false;
  }

  // 2) HR avg/max may only go absent→present, never present→different.
  if (
    existing.averageHeartRateBpm != null &&
    existing.averageHeartRateBpm !== incoming.averageHeartRateBpm
  ) {
    return false;
  }
  if (
    existing.maxHeartRateBpm != null &&
    existing.maxHeartRateBpm !== incoming.maxHeartRateBpm
  ) {
    return false;
  }

  // 3) Physiology fields may only go absent→present, never present→different.
  if (
    existing.activeEnergyKcal != null &&
    existing.activeEnergyKcal !== incoming.activeEnergyKcal
  ) {
    return false;
  }
  if (
    existing.basalEnergyKcal != null &&
    existing.basalEnergyKcal !== incoming.basalEnergyKcal
  ) {
    return false;
  }
  if (
    existing.totalEnergyKcal != null &&
    existing.totalEnergyKcal !== incoming.totalEnergyKcal
  ) {
    return false;
  }
  if (existing.heartRateZoneMinutes != null) {
    if (!deepEqualForCanonical(existing.heartRateZoneMinutes, incoming.heartRateZoneMinutes)) {
      return false;
    }
  }
  if (existing.heartRateZoneBasis != null) {
    if (!deepEqualForCanonical(existing.heartRateZoneBasis, incoming.heartRateZoneBasis)) {
      return false;
    }
  }
  if (existing.postWorkoutHeartRate != null) {
    if (!deepEqualForCanonical(existing.postWorkoutHeartRate, incoming.postWorkoutHeartRate)) {
      return false;
    }
  }

  // 4) Must be a strictly newer write.
  const inT = incoming.updatedAt ?? "";
  const exT = existing.updatedAt ?? "";
  if (inT <= exT) return false;

  return true;
}

/**
 * Order-insensitive deep equality used by the workout supersede gate.
 * Treats `undefined` and missing-key the same. Arrays compared element-wise.
 */
function deepEqualForCanonical(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqualForCanonical(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
    for (const k of keys) {
      if (!deepEqualForCanonical(ao[k], bo[k])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Same-day steps share one canonical document id (e.g. Apple Health daily aggregate). Ingest replays
 * carry a newer `updatedAt` from the raw event's `receivedAt`. The **latest** ingest wins so Apple
 * downward corrections (lower cumulative after sample removal) can replace a stale higher total.
 * Older `updatedAt` deliveries are ignored as out-of-order.
 */
function mergeIntradayStepsCanonical(
  existing: StepsCanonicalEvent,
  incoming: StepsCanonicalEvent,
): { merged: StepsCanonicalEvent; changed: boolean } {
  const inT = incoming.updatedAt ?? "";
  const exT = existing.updatedAt ?? "";
  if (inT > exT) {
    const merged: StepsCanonicalEvent = {
      ...incoming,
      updatedAt: incoming.updatedAt,
      createdAt: existing.createdAt ?? incoming.createdAt,
      sourceSampleId: incoming.sourceSampleId ?? existing.sourceSampleId ?? null,
    };
    return { merged, changed: !canonicalEquals(existing, merged) };
  }
  if (inT < exT) {
    return { merged: existing, changed: false };
  }
  // Same `updatedAt` (rare): treat incoming as authoritative for idempotent replay / correction tie.
  const merged: StepsCanonicalEvent = {
    ...existing,
    ...incoming,
    steps: incoming.steps,
    updatedAt: inT || exT,
    createdAt: existing.createdAt,
    sourceSampleId: incoming.sourceSampleId ?? existing.sourceSampleId ?? null,
  };
  return { merged, changed: !canonicalEquals(existing, merged) };
}

export type WriteCanonicalResult =
  | {
      ok: true;
      mode: "created" | "identical_noop" | "replaced";
      /** When a sleep canonical doc is replaced and `day` changed, recompute this prior day too. */
      sleepDayMovedFrom?: YmdDateString;
    }
  | {
      ok: false;
      mode: "conflict";
      existingHash: string;
      incomingHash: string;
      integrityViolationPath: string;
    };

function deterministicIntegrityViolationId(input: {
  userId: string;
  canonicalId: string;
  sourceRawEventId: string;
  existingHash: string;
  incomingHash: string;
}): string {
  // Deterministic, replay-safe doc id:
  // retries/duplicate triggers will attempt to create the same doc id and
  // therefore cannot spam integrity evidence.
  const payload = JSON.stringify(input);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function writeCanonicalEventImmutable(params: {
  userId: string;
  canonical: CanonicalEvent;
  sourceRawEventId: string;
  sourceRawEventPath: string;
}): Promise<WriteCanonicalResult> {
  const { userId, canonical, sourceRawEventId, sourceRawEventPath } = params;

  const ref = db.collection("users").doc(userId).collection("events").doc(canonical.id);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      tx.create(ref, canonical);
      return { ok: true, mode: "created" } as const;
    }

    const existing = snap.data() as CanonicalEvent;

    if (canonicalEquals(existing, canonical)) {
      return { ok: true, mode: "identical_noop" } as const;
    }

    /**
     * Daily step totals are cumulative for the local calendar window and legitimately change
     * intraday under the same raw/canonical id (same idempotency key). Immutability conflicts
     * here would strand DailyFacts on the first ingested value.
     */
    if (
      existing.kind === "steps" &&
      canonical.kind === "steps" &&
      existing.id === canonical.id
    ) {
      const { merged, changed } = mergeIntradayStepsCanonical(existing, canonical);
      if (!changed) {
        return { ok: true, mode: "identical_noop" } as const;
      }
      tx.set(ref, merged);
      return { ok: true, mode: "replaced" } as const;
    }

    /**
     * Sleep uses the same canonical id as the RawEvent (Oura idempotency). Mapper upgrades may add
     * optional stage fields; a newer raw `receivedAt` → canonical `updatedAt` must supersede stale docs.
     */
    if (
      existing.kind === "sleep" &&
      canonical.kind === "sleep" &&
      existing.id === canonical.id
    ) {
      const inT = canonical.updatedAt ?? "";
      const exT = existing.updatedAt ?? "";
      if (inT > exT) {
        tx.set(ref, canonical);
        const sleepDayMovedFrom =
          existing.day !== canonical.day ? existing.day : undefined;
        return {
          ok: true,
          mode: "replaced",
          ...(sleepDayMovedFrom ? { sleepDayMovedFrom } : {}),
        } as const;
      }
      if (inT < exT) {
        return { ok: true, mode: "identical_noop" } as const;
      }
      if (canonicalEquals(existing, canonical)) {
        return { ok: true, mode: "identical_noop" } as const;
      }
      tx.set(ref, canonical);
      const sleepDayMovedFrom =
        existing.day !== canonical.day ? existing.day : undefined;
      return {
        ok: true,
        mode: "replaced",
        ...(sleepDayMovedFrom ? { sleepDayMovedFrom } : {}),
      } as const;
    }

    /**
     * Workout Physiology v1 — Phase B additive-only supersede.
     *
     * Workouts ingested before Phase B (or with partial physiology) may be re-normalized
     * after a `/ingest` replay that adds new physiology fields (idempotent replay path in
     * `services/api/src/routes/events.ts` + `mergeAppleHealthWorkoutPhysiologyIfNeeded`),
     * or after a workout-aware update trigger fires
     * (`services/functions/src/normalization/onRawEventUpdatedForNormalization.ts`).
     *
     * Self-healing requires the canonical to absorb the new fields WITHOUT being treated
     * as an immutability violation. The gate enforces:
     *   - id equality
     *   - byte-equal "truth" fields (sport, durationMinutes, day, start, end, …)
     *   - existing HR/physiology fields are NEVER overwritten — only absent→present
     *   - strictly newer `updatedAt`
     *
     * Any other diff falls through to the conflict path and writes integrity evidence.
     */
    if (
      existing.kind === "workout" &&
      canonical.kind === "workout" &&
      isWorkoutPhysiologyAdditiveSupersede(existing, canonical)
    ) {
      tx.set(ref, canonical);
      return { ok: true, mode: "replaced" } as const;
    }

    const existingHash = canonicalHash(existing);
    const incomingHash = canonicalHash(canonical);

    logger.error("Canonical immutability violation: attempted overwrite with different content", {
      userId,
      canonicalId: canonical.id,
      sourceRawEventId,
      sourceRawEventPath,
      existingHash,
      incomingHash,
    });

    const integrityId = deterministicIntegrityViolationId({
      userId,
      canonicalId: canonical.id,
      sourceRawEventId,
      existingHash,
      incomingHash,
    });

    const integrityRef = db
      .collection("users")
      .doc(userId)
      .collection("integrityViolations")
      .doc(integrityId);

    // Create-only evidence. If the same conflict is retried, doc already exists -> tx.create fails.
    // We treat that as "evidence already recorded" and still return conflict.
    try {
      tx.create(integrityRef, {
        type: "CANONICAL_IMMUTABILITY_CONFLICT" as const,
        userId,
        canonicalId: canonical.id,
        sourceRawEventId,
        sourceRawEventPath,
        existingHash,
        incomingHash,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {
      // NOTE: Firestore will throw at commit time if doc exists.
      // We intentionally do not branch on it here; the caller still receives conflict.
      // The evidence is either created now or already existed.
    }

    return {
      ok: false,
      mode: "conflict",
      existingHash,
      incomingHash,
      integrityViolationPath: integrityRef.path,
    } as const;
  });
}