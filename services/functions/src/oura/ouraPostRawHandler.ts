/**
 * Oura post-raw handler: write vendor sleep + readiness snapshots and integration metadata.
 * Runs in Cloud Functions after Pub/Sub message from pull-now. Mirrors API snapshot shape.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

import { coerceOuraSleepScore0to100 } from "../../../api/src/lib/oura/buildSleepNightFromOuraDocument";
import { resolveOuraSleepIngestBase } from "../../../api/src/lib/oura/resolveOuraSleepIngestBase";
import {
  buildSleepNightFirestorePayloadWithOuraReadiness,
  collectReadinessLookupDaysForSleepPairs,
  loadPersistedOuraVendorReadinessByDaysFromCollection,
} from "../../../api/src/lib/oura/readinessForSleepNightMerge";
import type { OuraDailyReadinessDocument } from "../../../api/src/lib/ouraApi";
import {
  logOuraSleepPhysiologyDebugForDoc,
  pickOuraSleepAverageHrvMs,
  pickOuraSleepLowestHeartRateBpm,
} from "../../../api/src/lib/oura/ouraSleepPhysiology";
import {
  pickAverageHrvMsFromReadinessRecord,
  pickLowestHeartRateBpmFromReadinessRecord,
} from "../../../api/src/lib/oura/readinessForSleepNightMerge";
import { pickPrimaryOuraSleepPairs } from "../../../api/src/lib/oura/pickPrimaryOuraSleepForAnchorDay";

const BATCH_CHUNK_SIZE = 450;
const SOURCE = "oura";

/**
 * Return a Firestore-safe copy of obj with all undefined values omitted (recursively for plain objects).
 * Firestore does not accept undefined as a value.
 */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
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
 * Build or normalize sleep contributors for the mobile UI.
 * Uses API contributors when present; fills gaps from top-level doc metrics.
 * Returns only defined numeric values; safe to pass to stripUndefined.
 */
function buildSleepContributors(doc: SleepDoc): Record<string, number> {
  const apiContributors = doc.contributors && typeof doc.contributors === "object" ? doc.contributors : undefined;
  const out: Record<string, number> = {};

  if (apiContributors) {
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

  const remSec = typeof doc.rem_sleep_duration === "number" ? doc.rem_sleep_duration : null;
  if (remSec != null && !Object.prototype.hasOwnProperty.call(out, "rem_sleep")) {
    const remMin = remSec / 60;
    const t = Math.min(1, remMin / 120);
    out.rem_sleep = clampScore(t * 100);
  }

  const deepSec = typeof doc.deep_sleep_duration === "number" ? doc.deep_sleep_duration : null;
  if (deepSec != null && !Object.prototype.hasOwnProperty.call(out, "deep_sleep")) {
    const deepMin = deepSec / 60;
    const t = Math.min(1, deepMin / 90);
    out.deep_sleep = clampScore(t * 100);
  }

  const lat = doc.latency;
  if (typeof lat === "number" && !Number.isNaN(lat) && lat >= 0 && !Object.prototype.hasOwnProperty.call(out, "latency")) {
    const latMinutes = lat >= 60 ? lat / 60 : lat;
    out.latency = clampScore(Math.max(0, 100 - latMinutes * 2));
  }

  const timingFromApi = apiContributors && typeof apiContributors.timing === "number" ? apiContributors.timing : null;
  if (timingFromApi != null && !Number.isNaN(timingFromApi)) {
    out.timing = clampScore(timingFromApi);
  }

  return out;
}

export type SleepDoc = Record<string, unknown> & {
  id?: string;
  day?: string;
  wake_time?: string;
  bedtime_end?: string;
  bed_time?: string;
  bedtime_start?: string;
  start?: string;
  end_time?: string;
  end?: string;
  total_sleep_duration?: number;
  efficiency?: number;
  latency?: number;
  restful_sleep?: number;
  rem_sleep_duration?: number;
  deep_sleep_duration?: number;
  score?: number;
  contributors?: Record<string, unknown>;
};

export type ReadinessDoc = Record<string, unknown> & {
  id?: string;
  day?: string;
  timestamp?: string;
  score?: number;
  contributors?: Record<string, unknown>;
};

type SleepSnapshot = {
  id: string;
  day: string;
  score?: number | undefined;
  contributors?: Record<string, unknown> | undefined;
  source: string;
  fetchedAt: string;
  updatedAt: string;
  totalSleepDuration?: number;
  efficiency?: number;
  latency?: number;
  restfulSleep?: number;
  remSleep?: number;
  deepSleep?: number;
  lowestHeartRateBpm?: number;
  averageHrvMs?: number;
  payload?: Record<string, unknown>;
};

type ReadinessSnapshot = {
  id: string;
  day: string;
  score?: number | undefined;
  contributors?: Record<string, unknown> | undefined;
  source: string;
  fetchedAt: string;
  updatedAt: string;
  lowestHeartRateBpm?: number;
  averageHrvMs?: number;
  payload?: Record<string, unknown>;
};

function toYmd(iso: string): string {
  return iso.slice(0, 10);
}

function extractSleepSnapshot(
  doc: SleepDoc,
  fetchedAt: string,
  debugCtx?: { uid?: string },
): SleepSnapshot | null {
  const resolved = resolveOuraSleepIngestBase(doc);
  if (!resolved) return null;
  const { start, end, rollupDay: day } = resolved;

  const id = doc.id ?? `oura_sleep_${start}`;
  const score = coerceOuraSleepScore0to100(
    (doc as { score?: unknown }).score ?? (doc as { composite_score?: unknown }).composite_score,
  );
  const contributors = buildSleepContributors(doc);

  const out: SleepSnapshot = {
    id: String(id),
    day,
    source: SOURCE,
    fetchedAt,
    updatedAt: fetchedAt,
  };
  if (score != null) out.score = score;
  if (Object.keys(contributors).length > 0) {
    out.contributors = stripUndefined(contributors as unknown as Record<string, unknown>) as Record<string, unknown>;
  }
  if (typeof doc.total_sleep_duration === "number") out.totalSleepDuration = doc.total_sleep_duration;
  if (typeof doc.efficiency === "number") out.efficiency = doc.efficiency;
  if (typeof doc.latency === "number") out.latency = doc.latency;
  if (typeof doc.restful_sleep === "number") out.restfulSleep = doc.restful_sleep;
  if (typeof doc.rem_sleep_duration === "number") out.remSleep = doc.rem_sleep_duration;
  if (typeof doc.deep_sleep_duration === "number") out.deepSleep = doc.deep_sleep_duration;
  const lhr = pickOuraSleepLowestHeartRateBpm(doc);
  const hrv = pickOuraSleepAverageHrvMs(doc);
  if (lhr !== undefined) out.lowestHeartRateBpm = lhr;
  if (hrv !== undefined) out.averageHrvMs = hrv;
  out.payload = stripUndefined(doc as Record<string, unknown>);

  logOuraSleepPhysiologyDebugForDoc(doc, {
    ...(debugCtx?.uid != null ? { uid: debugCtx.uid } : {}),
    day,
    sleepDocId: String(id),
    start,
    end,
  });

  return out;
}

function extractReadinessSnapshot(doc: ReadinessDoc, fetchedAt: string): ReadinessSnapshot | null {
  const day = doc.day ?? (doc.timestamp ? toYmd(String(doc.timestamp)) : null);
  if (!day) return null;

  const id = doc.id ?? `oura_readiness_${day}`;
  const score = typeof doc.score === "number" ? doc.score : null;
  const contributors = doc.contributors && typeof doc.contributors === "object" ? doc.contributors : undefined;

  const out: ReadinessSnapshot = {
    id: String(id),
    day,
    source: SOURCE,
    fetchedAt,
    updatedAt: fetchedAt,
  };
  if (score != null) out.score = score;
  if (contributors != null) out.contributors = contributors;
  const asRecord = doc as Record<string, unknown>;
  const hrv = pickAverageHrvMsFromReadinessRecord(asRecord);
  const lhr = pickLowestHeartRateBpmFromReadinessRecord(asRecord);
  if (hrv != null) out.averageHrvMs = hrv;
  if (lhr != null) out.lowestHeartRateBpm = lhr;
  out.payload = stripUndefined(asRecord);
  return out;
}

export type RunOuraPostRawResult = {
  sleepWritten: number;
  readinessWritten: number;
  sleepNightsWritten: number;
  metadataWritten: boolean;
};

/**
 * Write sleep snapshots with diagnostics. Returns { written, attempted, skippedMissingDay, errors }.
 */
async function writeSleepSnapshots(
  db: FirebaseFirestore.Firestore,
  uid: string,
  docs: SleepDoc[],
  requestId: string,
  readinessDocs: ReadinessDoc[],
): Promise<{
  written: number;
  attempted: number;
  skippedMissingDay: number;
  errors: number;
  sleepNightsWritten: number;
  sleepNightsErrors: number;
}> {
  logger.info("oura_post_raw: sleep docs received", { uid, requestId, sleepDocCount: docs.length });

  const fetchedAt = new Date().toISOString();
  const col = db.collection("users").doc(uid).collection("ouraVendorSleep");
  const sleepNightsCol = db.collection("users").doc(uid).collection("sleepNights");
  let written = 0;
  let skippedMissingDay = 0;
  let errors = 0;

  const pairs: { doc: SleepDoc; snapshot: SleepSnapshot }[] = [];
  let droppedSampleKeys: string[] | undefined;
  for (const doc of docs) {
    const snapshot = extractSleepSnapshot(doc, fetchedAt, { uid });
    if (!snapshot) {
      skippedMissingDay += 1;
      if (!droppedSampleKeys && doc && typeof doc === "object") {
        droppedSampleKeys = Object.keys(doc).slice(0, 20);
      }
      continue;
    }
    pairs.push({ doc, snapshot });
  }

  const snapshots = pairs.map((p) => p.snapshot);

  if (droppedSampleKeys !== undefined && skippedMissingDay > 0) {
    logger.info("oura_post_raw: sleep docs dropped", {
      uid,
      requestId,
      sleepDocCount: docs.length,
      skippedMissingDay,
      reason: "missing_day",
      sampleKeys: droppedSampleKeys,
    });
  }

  logger.info("oura_post_raw: sleep snapshots extracted", {
    uid,
    requestId,
    sleepDocsReceived: docs.length,
    sleepSnapshotsExtracted: snapshots.length,
  });

  for (let i = 0; i < snapshots.length; i += BATCH_CHUNK_SIZE) {
    const chunk = snapshots.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = db.batch();
    for (const snapshot of chunk) {
      batch.set(col.doc(snapshot.id), stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
    }
    try {
      await batch.commit();
      written += chunk.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("oura_post_raw: sleep batch error", { uid, requestId, chunkSize: chunk.length, err: message });
      for (const snapshot of chunk) {
        try {
          await col.doc(snapshot.id).set(stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
          written += 1;
        } catch (singleErr) {
          errors += 1;
          logger.error("oura_post_raw: sleep write error", {
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

  logger.info("oura_post_raw: sleep snapshots written", {
    uid,
    requestId,
    sleepSnapshotsWritten: written,
    sleepSnapshotsErrors: errors,
  });

  const readinessCol = db.collection("users").doc(uid).collection("ouraVendorReadiness");
  const lookupDays = collectReadinessLookupDaysForSleepPairs(pairs);
  const persistedReadinessByDay = await loadPersistedOuraVendorReadinessByDaysFromCollection(
    readinessCol,
    lookupDays,
  );

  let sleepNightsWritten = 0;
  let sleepNightsErrors = 0;
  const primarySleepPairs = pickPrimaryOuraSleepPairs(pairs);
  for (let i = 0; i < primarySleepPairs.length; i += BATCH_CHUNK_SIZE) {
    const chunk = primarySleepPairs.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = db.batch();
    let ops = 0;
    for (const { doc, snapshot } of chunk) {
      const merged = buildSleepNightFirestorePayloadWithOuraReadiness(
        doc,
        snapshot.id,
        readinessDocs as OuraDailyReadinessDocument[],
        persistedReadinessByDay,
      );
      if (!merged) continue;
      batch.set(
        sleepNightsCol.doc(merged.anchorDay),
        stripUndefined({
          ...merged.payload,
          updatedAt: FieldValue.serverTimestamp(),
        } as Record<string, unknown>),
      );
      ops += 1;
    }
    if (ops === 0) continue;
    try {
      await batch.commit();
      sleepNightsWritten += ops;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("oura_post_raw: sleep_night_batch_error", { uid, requestId, chunkSize: chunk.length, err: message });
      for (const { doc, snapshot } of chunk) {
        const merged = buildSleepNightFirestorePayloadWithOuraReadiness(
          doc,
          snapshot.id,
          readinessDocs as OuraDailyReadinessDocument[],
          persistedReadinessByDay,
        );
        if (!merged) continue;
        try {
          await sleepNightsCol.doc(merged.anchorDay).set(
            stripUndefined({
              ...merged.payload,
              updatedAt: FieldValue.serverTimestamp(),
            } as Record<string, unknown>),
          );
          sleepNightsWritten += 1;
        } catch (singleErr) {
          sleepNightsErrors += 1;
          logger.error("oura_post_raw: sleep_night_write_error", {
            uid,
            requestId,
            anchorDay: merged.anchorDay,
            err: singleErr instanceof Error ? singleErr.message : String(singleErr),
          });
        }
      }
    }
  }

  logger.info("oura_post_raw: sleep_nights_written", {
    uid,
    requestId,
    sleepNightsWritten,
    sleepNightsErrors,
  });

  return { written, attempted: docs.length, skippedMissingDay, errors, sleepNightsWritten, sleepNightsErrors };
}

async function writeReadinessSnapshots(
  db: FirebaseFirestore.Firestore,
  uid: string,
  docs: ReadinessDoc[],
  requestId: string,
): Promise<{ written: number }> {
  const fetchedAt = new Date().toISOString();
  const col = db.collection("users").doc(uid).collection("ouraVendorReadiness");
  let written = 0;

  const snapshots: ReadinessSnapshot[] = [];
  let droppedReadiness = 0;
  let droppedSampleKeys: string[] | undefined;
  for (const doc of docs) {
    const snapshot = extractReadinessSnapshot(doc, fetchedAt);
    if (!snapshot) {
      droppedReadiness += 1;
      if (!droppedSampleKeys && doc && typeof doc === "object") {
        droppedSampleKeys = Object.keys(doc).slice(0, 20);
      }
      continue;
    }
    snapshots.push(snapshot);
  }

  if (droppedReadiness > 0) {
    logger.info("oura_post_raw: readiness docs dropped", {
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
    const batch = db.batch();
    for (const snapshot of chunk) {
      batch.set(col.doc(snapshot.id), stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
    }
    try {
      await batch.commit();
      written += chunk.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("oura_post_raw: readiness batch error", { uid, requestId, chunkSize: chunk.length, err: message });
      for (const snapshot of chunk) {
        try {
          await col.doc(snapshot.id).set(stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
          written += 1;
        } catch (singleErr) {
          logger.error("oura_post_raw: readiness write error", {
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

  return { written };
}

/**
 * Run post-raw persistence: sleep snapshots, readiness snapshots, integration metadata.
 * lastRefreshAt always; lastSyncAt/lastSnapshotAt only when at least one snapshot written.
 */
export async function runOuraPostRaw(
  uid: string,
  requestId: string,
  sleepDocs: SleepDoc[],
  readinessDocs: ReadinessDoc[],
): Promise<RunOuraPostRawResult> {
  const db = getFirestore();

  logger.info("oura_post_raw: started", {
    uid,
    requestId,
    sleepDocCount: sleepDocs.length,
    readinessDocCount: readinessDocs.length,
  });

  const [sleepResult, readinessResult] = await Promise.all([
    writeSleepSnapshots(db, uid, sleepDocs, requestId, readinessDocs),
    writeReadinessSnapshots(db, uid, readinessDocs, requestId),
  ]);

  const totalSnapshotWritten = sleepResult.written + readinessResult.written;
  const setLastSyncAt = totalSnapshotWritten > 0;
  const setLastSnapshotAt = totalSnapshotWritten > 0;

  let metadataWritten = false;
  try {
    const integrationRef = db.collection("users").doc(uid).collection("integrations").doc("oura");
    const update: Record<string, unknown> = {
      lastRefreshAt: FieldValue.serverTimestamp(),
    };
    if (setLastSyncAt) update.lastSyncAt = FieldValue.serverTimestamp();
    if (setLastSnapshotAt) update.lastSnapshotAt = FieldValue.serverTimestamp();
    await integrationRef.set(update, { merge: true });
    metadataWritten = true;
  } catch (metaErr) {
    logger.error("oura_post_raw: metadata error", {
      uid,
      requestId,
      sleepWritten: sleepResult.written,
      readinessWritten: readinessResult.written,
      err: metaErr instanceof Error ? metaErr.message : String(metaErr),
    });
  }

  logger.info("oura_post_raw: done", {
    uid,
    requestId,
    sleepWritten: sleepResult.written,
    readinessWritten: readinessResult.written,
    sleepNightsWritten: sleepResult.sleepNightsWritten,
    metadataWritten,
  });

  return {
    sleepWritten: sleepResult.written,
    readinessWritten: readinessResult.written,
    sleepNightsWritten: sleepResult.sleepNightsWritten,
    metadataWritten,
  };
}
