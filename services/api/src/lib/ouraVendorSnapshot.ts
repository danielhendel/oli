/**
 * Oura vendor snapshot writer — Tier 1 Sleep & Readiness.
 * Writes score + contributors to users/{uid}/ouraVendorSleep and ouraVendorReadiness.
 * Called from performOuraPullNowCore after fetch; does not replace canonical sleep/HRV writes.
 */

import type { OuraSleepDocument, OuraDailyReadinessDocument } from "./ouraApi";

export type OuraSnapshotWriteResult = {
  attempted: number;
  written: number;
  skippedMissingDay: number;
  errors: number;
};
import type { OuraSleepSnapshot, OuraReadinessSnapshot } from "@oli/contracts";
import { userCollection } from "../db";
import { logger } from "./logger";

/** Firestore batch limit is 500; use a smaller chunk to stay safe. */
const BATCH_CHUNK_SIZE = 450;

const SOURCE = "oura";

/**
 * Return a Firestore-safe copy of obj with all undefined values omitted (recursively for plain objects).
 * Firestore does not accept undefined as a value.
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype) {
      out[k] = stripUndefined(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function toYmd(iso: string): string {
  return iso.slice(0, 10);
}

/** UI-expected sleep contributor keys (must match lib/format/ouraScore.ts SLEEP_CONTRIBUTOR_KEYS). */
const SLEEP_CONTRIBUTOR_KEYS = [
  "total_sleep",
  "efficiency",
  "restfulness",
  "rem_sleep",
  "deep_sleep",
  "latency",
  "timing",
] as const;

function clampScore(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)));
}

/**
 * Stored sleep snapshot shape (Firestore doc) — used at read time to fill missing contributor keys.
 * Does not mutate Firestore; only used to build the response DTO.
 */
export type StoredSleepSnapshotData = {
  contributors?: Record<string, unknown>;
  totalSleepDuration?: number;
  efficiency?: number;
  restfulSleep?: number;
  remSleep?: number;
  deepSleep?: number;
  latency?: number;
  score?: number;
  composite_score?: number;
};

/**
 * Fill missing sleep contributor keys from stored snapshot top-level fields.
 * Only adds keys that are not already present in data.contributors; never overrides.
 * Timing is never derived; only included when already in stored contributors.
 * Use at read time so older snapshots (written before write-time derivation) still return a full contributor shape.
 */
export function fillSleepContributorsFromStored(data: StoredSleepSnapshotData): Record<string, number> {
  const existing = (data.contributors && typeof data.contributors === "object" ? data.contributors : {}) as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const key of SLEEP_CONTRIBUTOR_KEYS) {
    const v = existing[key];
    if (typeof v === "number" && !Number.isNaN(v)) out[key] = clampScore(v);
  }

  const totalSec = typeof data.totalSleepDuration === "number" ? data.totalSleepDuration : null;
  if (totalSec != null && !Object.prototype.hasOwnProperty.call(out, "total_sleep")) {
    const totalMinutes = totalSec / 60;
    const t = Math.min(1, totalMinutes / 540);
    out.total_sleep = clampScore(t * 100);
  }

  const eff = data.efficiency;
  if (typeof eff === "number" && !Number.isNaN(eff) && !Object.prototype.hasOwnProperty.call(out, "efficiency")) {
    out.efficiency = eff > 1 ? clampScore(eff) : clampScore(eff * 100);
  }

  const restful = data.restfulSleep;
  if (typeof restful === "number" && !Number.isNaN(restful) && !Object.prototype.hasOwnProperty.call(out, "restfulness")) {
    out.restfulness = restful > 1 ? clampScore(restful) : clampScore(restful * 100);
  }

  const remSec = typeof data.remSleep === "number" ? data.remSleep : null;
  if (remSec != null && !Object.prototype.hasOwnProperty.call(out, "rem_sleep")) {
    const remMin = remSec / 60;
    const t = Math.min(1, remMin / 120);
    out.rem_sleep = clampScore(t * 100);
  }

  const deepSec = typeof data.deepSleep === "number" ? data.deepSleep : null;
  if (deepSec != null && !Object.prototype.hasOwnProperty.call(out, "deep_sleep")) {
    const deepMin = deepSec / 60;
    const t = Math.min(1, deepMin / 90);
    out.deep_sleep = clampScore(t * 100);
  }

  const lat = data.latency;
  if (typeof lat === "number" && !Number.isNaN(lat) && lat >= 0 && !Object.prototype.hasOwnProperty.call(out, "latency")) {
    const latMinutes = lat > 120 ? lat / 60 : lat;
    out.latency = clampScore(Math.max(0, 100 - latMinutes * 2));
  }

  return out;
}

/**
 * Build or normalize sleep contributors for the mobile UI.
 * Uses API contributors when present (numeric values only); fills gaps from top-level doc metrics.
 * Returns only defined numeric values; safe to pass to stripUndefined.
 */
function buildSleepContributors(doc: OuraSleepDocument): Record<string, number> {
  const apiContributors = (doc as { contributors?: Record<string, unknown> }).contributors;
  const out: Record<string, number> = {};

  if (apiContributors && typeof apiContributors === "object") {
    for (const key of SLEEP_CONTRIBUTOR_KEYS) {
      const v = apiContributors[key];
      if (typeof v === "number" && !Number.isNaN(v)) out[key] = clampScore(v);
    }
  }

  const totalSec = typeof doc.total_sleep_duration === "number" ? doc.total_sleep_duration : null;
  if (totalSec != null && !Object.prototype.hasOwnProperty.call(out, "total_sleep")) {
    const totalMinutes = totalSec / 60;
    const t = Math.min(1, totalMinutes / 540);
    out.total_sleep = clampScore(t * 100);
  }

  const eff = doc.efficiency;
  if (typeof eff === "number" && !Number.isNaN(eff) && !Object.prototype.hasOwnProperty.call(out, "efficiency")) {
    out.efficiency = eff > 1 ? clampScore(eff) : clampScore(eff * 100);
  }

  const restful = typeof doc.restful_sleep === "number" ? doc.restful_sleep : (doc as { restfulness?: number }).restfulness;
  if (typeof restful === "number" && !Number.isNaN(restful) && !Object.prototype.hasOwnProperty.call(out, "restfulness")) {
    out.restfulness = restful > 1 ? clampScore(restful) : clampScore(restful * 100);
  }

  const remSec = typeof (doc as { rem_sleep_duration?: number }).rem_sleep_duration === "number"
    ? (doc as { rem_sleep_duration: number }).rem_sleep_duration
    : null;
  if (remSec != null && !Object.prototype.hasOwnProperty.call(out, "rem_sleep")) {
    const remMin = remSec / 60;
    const t = Math.min(1, remMin / 120);
    out.rem_sleep = clampScore(t * 100);
  }

  const deepSec = typeof (doc as { deep_sleep_duration?: number }).deep_sleep_duration === "number"
    ? (doc as { deep_sleep_duration: number }).deep_sleep_duration
    : null;
  if (deepSec != null && !Object.prototype.hasOwnProperty.call(out, "deep_sleep")) {
    const deepMin = deepSec / 60;
    const t = Math.min(1, deepMin / 90);
    out.deep_sleep = clampScore(t * 100);
  }

  const lat = doc.latency;
  if (typeof lat === "number" && !Number.isNaN(lat) && lat >= 0 && !Object.prototype.hasOwnProperty.call(out, "latency")) {
    const latMinutes = lat > 120 ? lat / 60 : lat;
    out.latency = clampScore(Math.max(0, 100 - latMinutes * 2));
  }

  const timingFromApi = apiContributors && typeof apiContributors === "object" && typeof apiContributors.timing === "number"
    ? (apiContributors.timing as number)
    : null;
  if (timingFromApi != null && !Number.isNaN(timingFromApi)) {
    out.timing = clampScore(timingFromApi);
  }

  return out;
}

/** Derive sleep window start from doc (Oura v2 can use bed_time, bedtime_start, start, or end_time). */
function getSleepStartForSnapshot(doc: OuraSleepDocument): string | null {
  const s =
    doc.bed_time ??
    (doc as { bedtime_start?: string }).bedtime_start ??
    (doc as { start?: string }).start ??
    doc.end_time ??
    (doc as { end?: string }).end ??
    null;
  return typeof s === "string" && s.length > 0 ? s : null;
}

function extractSleepSnapshot(doc: OuraSleepDocument, fetchedAt: string): OuraSleepSnapshot | null {
  const start = getSleepStartForSnapshot(doc);
  const day = start ? toYmd(start) : null;
  if (!day) return null;

  const id = doc.id ?? `oura_sleep_${start}`;
  const scoreRaw = (doc as { score?: number }).score ?? (doc as { composite_score?: number }).composite_score;
  const score = typeof scoreRaw === "number" && !Number.isNaN(scoreRaw) ? scoreRaw : null;
  const contributors = buildSleepContributors(doc);

  const out: Record<string, unknown> = {
    id: String(id),
    day,
    source: SOURCE,
    fetchedAt,
    updatedAt: fetchedAt,
  };
  if (typeof score === "number") out.score = score;
  if (Object.keys(contributors).length > 0) {
    out.contributors = stripUndefined(contributors as unknown as Record<string, unknown>);
  }
  if (typeof doc.total_sleep_duration === "number") out.totalSleepDuration = doc.total_sleep_duration;
  if (typeof doc.efficiency === "number") out.efficiency = doc.efficiency;
  if (typeof doc.latency === "number") out.latency = doc.latency;
  if (typeof doc.restful_sleep === "number") out.restfulSleep = doc.restful_sleep;
  if (typeof (doc as { rem_sleep_duration?: number }).rem_sleep_duration === "number") {
    out.remSleep = (doc as { rem_sleep_duration: number }).rem_sleep_duration;
  }
  if (typeof (doc as { deep_sleep_duration?: number }).deep_sleep_duration === "number") {
    out.deepSleep = (doc as { deep_sleep_duration: number }).deep_sleep_duration;
  }
  return out as OuraSleepSnapshot;
}

function extractReadinessSnapshot(
  doc: OuraDailyReadinessDocument,
  fetchedAt: string,
): OuraReadinessSnapshot | null {
  const day = doc.day ?? (doc.timestamp ? toYmd(doc.timestamp) : null);
  if (!day) return null;

  const id = doc.id ?? `oura_readiness_${day}`;
  const score =
    typeof doc.score === "number" ? doc.score : null;
  const contributors = (doc as { contributors?: Record<string, unknown> }).contributors;

  const out: Record<string, unknown> = {
    id: String(id),
    day,
    source: SOURCE,
    fetchedAt,
    updatedAt: fetchedAt,
  };
  if (typeof score === "number") out.score = score;
  if (contributors && typeof contributors === "object") out.contributors = contributors;
  return out as OuraReadinessSnapshot;
}

/**
 * Write Oura sleep vendor snapshots. One doc per Oura sleep document.
 * Uses batched Firestore writes to reduce round-trips. Logs errors but does not throw.
 */
export async function writeOuraVendorSleepSnapshots(
  uid: string,
  docs: OuraSleepDocument[],
  requestId: string,
): Promise<OuraSnapshotWriteResult> {
  logger.info({
    msg: "oura_sleep_snapshot_docs_received",
    uid,
    requestId,
    sleepDocCount: docs.length,
  });

  const col = userCollection(uid, "ouraVendorSleep");
  const fetchedAt = new Date().toISOString();
  let written = 0;
  let skippedMissingDay = 0;
  let errors = 0;

  const snapshots: OuraSleepSnapshot[] = [];
  let droppedSampleKeys: string[] | undefined;
  for (const doc of docs) {
    const snapshot = extractSleepSnapshot(doc, fetchedAt);
    if (!snapshot) {
      skippedMissingDay += 1;
      if (!droppedSampleKeys && doc && typeof doc === "object") {
        droppedSampleKeys = Object.keys(doc).slice(0, 20);
      }
      continue;
    }
    snapshots.push(snapshot);
  }

  if (droppedSampleKeys !== undefined && skippedMissingDay > 0) {
    logger.info({
      msg: "oura_sleep_snapshot_docs_dropped",
      uid,
      requestId,
      sleepDocCount: docs.length,
      skippedMissingDay,
      reason: "missing_day",
      sampleKeys: droppedSampleKeys,
    });
  }

  logger.info({
    msg: "oura_sleep_snapshot_extracted",
    uid,
    requestId,
    sleepDocsReceived: docs.length,
    sleepSnapshotsExtracted: snapshots.length,
  });

  for (let i = 0; i < snapshots.length; i += BATCH_CHUNK_SIZE) {
    const chunk = snapshots.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = (col as FirebaseFirestore.CollectionReference).firestore.batch();
    for (const snapshot of chunk) {
      batch.set(col.doc(snapshot.id), stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
    }
    try {
      await batch.commit();
      written += chunk.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({
        msg: "oura_vendor_sleep_snapshot_batch_error",
        uid,
        requestId,
        chunkSize: chunk.length,
        err: message,
      });
      for (const snapshot of chunk) {
        try {
          await col.doc(snapshot.id).set(stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
          written += 1;
        } catch (singleErr) {
          errors += 1;
          logger.error({
            msg: "oura_vendor_sleep_snapshot_write_error",
            uid,
            requestId,
            snapshotId: snapshot.id,
            day: snapshot.day,
            err: singleErr instanceof Error ? singleErr.message : String(singleErr),
          });
        }
      }
    }
  }

  logger.info({
    msg: "oura_sleep_snapshot_written",
    uid,
    requestId,
    sleepSnapshotsWritten: written,
    sleepSnapshotsErrors: errors,
  });

  return {
    attempted: docs.length,
    written,
    skippedMissingDay,
    errors,
  };
}

/**
 * Write Oura readiness vendor snapshots. One doc per daily_readiness document.
 * Uses batched Firestore writes to reduce round-trips. Logs errors but does not throw.
 */
export async function writeOuraVendorReadinessSnapshots(
  uid: string,
  docs: OuraDailyReadinessDocument[],
  requestId: string,
): Promise<OuraSnapshotWriteResult> {
  const col = userCollection(uid, "ouraVendorReadiness");
  const fetchedAt = new Date().toISOString();
  let written = 0;
  let skippedMissingDay = 0;
  let errors = 0;

  const snapshots: OuraReadinessSnapshot[] = [];
  let droppedReadiness = 0;
  let droppedSampleKeys: string[] | undefined;
  for (const doc of docs) {
    const snapshot = extractReadinessSnapshot(doc, fetchedAt);
    if (!snapshot) {
      skippedMissingDay += 1;
      droppedReadiness += 1;
      if (!droppedSampleKeys && doc && typeof doc === "object") {
        droppedSampleKeys = Object.keys(doc).slice(0, 20);
      }
      continue;
    }
    snapshots.push(snapshot);
  }

  if (droppedReadiness > 0) {
    logger.info({
      msg: "oura_readiness_snapshot_docs_dropped",
      uid,
      requestId,
      readinessDocCount: docs.length,
      droppedReadiness,
      reason: "missing_day",
      sampleKeys: droppedSampleKeys ?? [],
    });
  }

  for (let i = 0; i < snapshots.length; i += BATCH_CHUNK_SIZE) {
    const chunk = snapshots.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = (col as FirebaseFirestore.CollectionReference).firestore.batch();
    for (const snapshot of chunk) {
      batch.set(col.doc(snapshot.id), stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
    }
    try {
      await batch.commit();
      written += chunk.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({
        msg: "oura_vendor_readiness_snapshot_batch_error",
        uid,
        requestId,
        chunkSize: chunk.length,
        err: message,
      });
      for (const snapshot of chunk) {
        try {
          await col.doc(snapshot.id).set(stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
          written += 1;
        } catch (singleErr) {
          errors += 1;
          logger.error({
            msg: "oura_vendor_readiness_snapshot_write_error",
            uid,
            requestId,
            snapshotId: snapshot.id,
            day: snapshot.day,
            err: singleErr instanceof Error ? singleErr.message : String(singleErr),
          });
        }
      }
    }
  }

  return {
    attempted: docs.length,
    written,
    skippedMissingDay,
    errors,
  };
}
