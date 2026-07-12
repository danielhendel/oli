/**
 * Oura post-raw handler: write vendor sleep + readiness snapshots and integration metadata.
 * Runs in Cloud Functions after Pub/Sub message from pull-now. Mirrors API snapshot shape.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  categorizeOuraPostRawSafeError,
  logOuraPostRawTelemetry,
} from "./ouraPostRawTelemetry";

import { coerceOuraSleepScore0to100 } from "../../../api/src/lib/oura/buildSleepNightFromOuraDocument";
import { resolveOuraSleepIngestBase } from "../../../api/src/lib/oura/resolveOuraSleepIngestBase";
import {
  buildSleepNightFirestorePayloadWithOuraReadiness,
  collectReadinessLookupDaysForSleepPairs,
  loadPersistedOuraVendorReadinessByDaysFromCollection,
} from "../../../api/src/lib/oura/readinessForSleepNightMerge";
import {
  dailySleepDayFromDoc,
  scoreFromOuraDailySleepDoc,
} from "../../../api/src/lib/oura/dailySleepScoreForSleepNight";
import type { OuraDailyReadinessDocument, OuraDailySleepDocument, OuraDailyStressDocument } from "../../../api/src/lib/ouraApi";
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
  kind?: "daily_sleep";
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

function extractDailySleepSnapshot(
  doc: OuraDailySleepDocument,
  fetchedAt: string,
): SleepSnapshot | null {
  const day = dailySleepDayFromDoc(doc);
  if (!day) return null;
  const id =
    typeof doc.id === "string" && doc.id.trim().length > 0
      ? doc.id.trim()
      : `oura_daily_sleep_${day}`;
  const score = scoreFromOuraDailySleepDoc(doc);
  const contributors =
    doc.contributors && typeof doc.contributors === "object"
      ? (doc.contributors as Record<string, unknown>)
      : undefined;
  const out: SleepSnapshot = {
    id: String(id),
    day,
    source: SOURCE,
    fetchedAt,
    updatedAt: fetchedAt,
    kind: "daily_sleep",
  };
  if (score != null) out.score = score;
  if (contributors && Object.keys(contributors).length > 0) {
    out.contributors = stripUndefined(contributors);
  }
  out.payload = stripUndefined(doc as Record<string, unknown>);
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
  stressWritten: number;
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
  dailySleepDocs: OuraDailySleepDocument[] = [],
): Promise<{
  written: number;
  attempted: number;
  skippedMissingDay: number;
  errors: number;
  sleepNightsWritten: number;
  sleepNightsErrors: number;
}> {
  logOuraPostRawTelemetry({
    operation: "oura_post_raw_domain_docs_received",
    requestId,
    domain: "sleep",
    sleepDocumentCount: docs.length,
    dailySleepDocumentCount: dailySleepDocs.length,
  });

  const fetchedAt = new Date().toISOString();
  const col = db.collection("users").doc(uid).collection("ouraVendorSleep");
  const sleepNightsCol = db.collection("users").doc(uid).collection("sleepNights");
  let written = 0;
  let skippedMissingDay = 0;
  let errors = 0;

  const pairs: { doc: SleepDoc; snapshot: SleepSnapshot }[] = [];
  for (const doc of docs) {
    const snapshot = extractSleepSnapshot(doc, fetchedAt, { uid });
    if (!snapshot) {
      skippedMissingDay += 1;
      continue;
    }
    pairs.push({ doc, snapshot });
  }

  const dailySnapshots: SleepSnapshot[] = [];
  for (const d of dailySleepDocs) {
    const snap = extractDailySleepSnapshot(d, fetchedAt);
    if (!snap) {
      skippedMissingDay += 1;
      continue;
    }
    dailySnapshots.push(snap);
  }

  const snapshots = [...pairs.map((p) => p.snapshot), ...dailySnapshots];

  if (skippedMissingDay > 0) {
    logOuraPostRawTelemetry({
      operation: "oura_post_raw_domain_docs_dropped",
      requestId,
      domain: "sleep",
      rejectedItemCount: skippedMissingDay,
    });
  }

  logOuraPostRawTelemetry({
    operation: "oura_post_raw_domain_extracted",
    requestId,
    domain: "sleep",
    validatedItemCount: snapshots.length,
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
      const { safeErrorCode, retryable } = categorizeOuraPostRawSafeError(err, "FUNCTION_PERSIST_FAILED");
      logOuraPostRawTelemetry({
        operation: "oura_post_raw_domain_write_failed",
        requestId,
        domain: "sleep",
        safeErrorCode,
        failedCount: chunk.length,
        retryable,
      });
      for (const snapshot of chunk) {
        try {
          await col.doc(snapshot.id).set(stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
          written += 1;
        } catch (singleErr) {
          errors += 1;
          const cat = categorizeOuraPostRawSafeError(singleErr, "FUNCTION_PERSIST_FAILED");
          logOuraPostRawTelemetry({
            operation: "oura_post_raw_domain_write_failed",
            requestId,
            domain: "sleep",
            safeErrorCode: cat.safeErrorCode,
            failedCount: 1,
            retryable: cat.retryable,
          });
        }
      }
    }
  }

  logOuraPostRawTelemetry({
    operation: "oura_post_raw_domain_written",
    requestId,
    domain: "sleep",
    writtenCount: written,
    failedCount: errors,
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
        { uid, requestedDay: snapshot.day },
        dailySleepDocs,
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
      const { safeErrorCode, retryable } = categorizeOuraPostRawSafeError(err, "FUNCTION_PERSIST_FAILED");
      logOuraPostRawTelemetry({
        operation: "oura_post_raw_domain_write_failed",
        requestId,
        domain: "sleep_night",
        safeErrorCode,
        failedCount: chunk.length,
        retryable,
      });
      for (const { doc, snapshot } of chunk) {
        const merged = buildSleepNightFirestorePayloadWithOuraReadiness(
          doc,
          snapshot.id,
          readinessDocs as OuraDailyReadinessDocument[],
          persistedReadinessByDay,
          { uid, requestedDay: snapshot.day },
          dailySleepDocs,
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
          const cat = categorizeOuraPostRawSafeError(singleErr, "FUNCTION_PERSIST_FAILED");
          logOuraPostRawTelemetry({
            operation: "oura_post_raw_domain_write_failed",
            requestId,
            domain: "sleep_night",
            safeErrorCode: cat.safeErrorCode,
            failedCount: 1,
            retryable: cat.retryable,
          });
        }
      }
    }
  }

  logOuraPostRawTelemetry({
    operation: "oura_post_raw_domain_written",
    requestId,
    domain: "sleep_night",
    writtenCount: sleepNightsWritten,
    failedCount: sleepNightsErrors,
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
  for (const doc of docs) {
    const snapshot = extractReadinessSnapshot(doc, fetchedAt);
    if (!snapshot) {
      droppedReadiness += 1;
      continue;
    }
    snapshots.push(snapshot);
  }

  if (droppedReadiness > 0) {
    logOuraPostRawTelemetry({
      operation: "oura_post_raw_domain_docs_dropped",
      requestId,
      domain: "readiness",
      rejectedItemCount: droppedReadiness,
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
      const { safeErrorCode, retryable } = categorizeOuraPostRawSafeError(err, "FUNCTION_PERSIST_FAILED");
      logOuraPostRawTelemetry({
        operation: "oura_post_raw_domain_write_failed",
        requestId,
        domain: "readiness",
        safeErrorCode,
        failedCount: chunk.length,
        retryable,
      });
      for (const snapshot of chunk) {
        try {
          await col.doc(snapshot.id).set(stripUndefined(snapshot as unknown as Record<string, unknown>), { merge: true });
          written += 1;
        } catch (singleErr) {
          const cat = categorizeOuraPostRawSafeError(singleErr, "FUNCTION_PERSIST_FAILED");
          logOuraPostRawTelemetry({
            operation: "oura_post_raw_domain_write_failed",
            requestId,
            domain: "readiness",
            safeErrorCode: cat.safeErrorCode,
            failedCount: 1,
            retryable: cat.retryable,
          });
        }
      }
    }
  }

  logOuraPostRawTelemetry({
    operation: "oura_post_raw_domain_written",
    requestId,
    domain: "readiness",
    writtenCount: written,
    failedCount: 0,
  });

  return { written };
}

type StressDoc = {
  id?: string;
  day?: string;
  day_summary?: "restored" | "normal" | "stressful" | null;
  stress_high?: number | null;
  recovery_high?: number | null;
  [key: string]: unknown;
};

type StressSnapshot = {
  id: string;
  day: string;
  daySummary?: "restored" | "normal" | "stressful" | null;
  stressHighSeconds?: number | null;
  recoveryHighSeconds?: number | null;
  source: "oura";
  fetchedAt: string;
  updatedAt?: string;
  schemaVersion: 1;
};

function extractStressSnapshot(doc: StressDoc, fetchedAt: string): StressSnapshot | null {
  const day = typeof doc.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(doc.day.trim()) ? doc.day.trim() : null;
  if (!day) return null;

  const id =
    typeof doc.id === "string" && doc.id.trim().length > 0 ? doc.id.trim() : `oura_daily_stress_${day}`;

  const out: StressSnapshot = {
    id: String(id),
    day,
    source: SOURCE,
    fetchedAt,
    updatedAt: fetchedAt,
    schemaVersion: 1,
  };

  if (doc.day_summary === null) {
    out.daySummary = null;
  } else if (doc.day_summary === "restored" || doc.day_summary === "normal" || doc.day_summary === "stressful") {
    out.daySummary = doc.day_summary;
  }

  if (doc.stress_high === null) {
    out.stressHighSeconds = null;
  } else if (typeof doc.stress_high === "number" && Number.isFinite(doc.stress_high) && doc.stress_high >= 0) {
    out.stressHighSeconds = doc.stress_high;
  }

  if (doc.recovery_high === null) {
    out.recoveryHighSeconds = null;
  } else if (
    typeof doc.recovery_high === "number" &&
    Number.isFinite(doc.recovery_high) &&
    doc.recovery_high >= 0
  ) {
    out.recoveryHighSeconds = doc.recovery_high;
  }

  return out;
}

async function writeStressSnapshots(
  db: FirebaseFirestore.Firestore,
  uid: string,
  docs: StressDoc[],
  requestId: string,
): Promise<{ written: number }> {
  const fetchedAt = new Date().toISOString();
  const col = db.collection("users").doc(uid).collection("ouraVendorStress");
  let written = 0;

  const snapshots: StressSnapshot[] = [];
  let droppedStress = 0;
  for (const doc of docs) {
    const snapshot = extractStressSnapshot(doc, fetchedAt);
    if (!snapshot) {
      droppedStress += 1;
      continue;
    }
    snapshots.push(snapshot);
  }

  if (droppedStress > 0) {
    logOuraPostRawTelemetry({
      operation: "oura_post_raw_domain_docs_dropped",
      requestId,
      domain: "daily_stress",
      rejectedItemCount: droppedStress,
    });
  }

  for (let i = 0; i < snapshots.length; i += BATCH_CHUNK_SIZE) {
    const chunk = snapshots.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = db.batch();
    for (const snapshot of chunk) {
      batch.set(col.doc(snapshot.id), stripUndefined(snapshot as unknown as Record<string, unknown>), {
        merge: true,
      });
    }
    try {
      await batch.commit();
      written += chunk.length;
    } catch (err) {
      const { safeErrorCode, retryable } = categorizeOuraPostRawSafeError(err, "FUNCTION_PERSIST_FAILED");
      logOuraPostRawTelemetry({
        operation: "oura_post_raw_domain_write_failed",
        requestId,
        domain: "daily_stress",
        safeErrorCode,
        failedCount: chunk.length,
        retryable,
      });
      for (const snapshot of chunk) {
        try {
          await col.doc(snapshot.id).set(stripUndefined(snapshot as unknown as Record<string, unknown>), {
            merge: true,
          });
          written += 1;
        } catch (singleErr) {
          const cat = categorizeOuraPostRawSafeError(singleErr, "FUNCTION_PERSIST_FAILED");
          logOuraPostRawTelemetry({
            operation: "oura_post_raw_domain_write_failed",
            requestId,
            domain: "daily_stress",
            safeErrorCode: cat.safeErrorCode,
            failedCount: 1,
            retryable: cat.retryable,
          });
        }
      }
    }
  }

  logOuraPostRawTelemetry({
    operation: "oura_post_raw_domain_written",
    requestId,
    domain: "daily_stress",
    writtenCount: written,
    failedCount: 0,
  });

  return { written };
}

/**
 * Run post-raw persistence: sleep snapshots, readiness snapshots, stress snapshots, integration metadata.
 * lastRefreshAt always; lastSyncAt/lastSnapshotAt only when at least one snapshot written.
 * `dailyStressDocs` defaults to [] so older Pub/Sub producers without stress still work.
 */
export async function runOuraPostRaw(
  uid: string,
  requestId: string,
  sleepDocs: SleepDoc[],
  readinessDocs: ReadinessDoc[],
  dailySleepDocs: OuraDailySleepDocument[] = [],
  dailyStressDocs: OuraDailyStressDocument[] = [],
): Promise<RunOuraPostRawResult> {
  const db = getFirestore();

  logOuraPostRawTelemetry({
    operation: "oura_post_raw_started",
    requestId,
    sleepDocumentCount: sleepDocs.length,
    readinessDocumentCount: readinessDocs.length,
    dailySleepDocumentCount: dailySleepDocs.length,
    dailyStressDocumentCount: dailyStressDocs.length,
  });

  const [sleepResult, readinessResult, stressResult] = await Promise.all([
    writeSleepSnapshots(db, uid, sleepDocs, requestId, readinessDocs, dailySleepDocs),
    writeReadinessSnapshots(db, uid, readinessDocs, requestId),
    writeStressSnapshots(db, uid, dailyStressDocs as StressDoc[], requestId),
  ]);

  const totalSnapshotWritten = sleepResult.written + readinessResult.written + stressResult.written;
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
    const { safeErrorCode } = categorizeOuraPostRawSafeError(metaErr, "FUNCTION_PERSIST_FAILED");
    logOuraPostRawTelemetry({
      operation: "oura_post_raw_metadata_failed",
      requestId,
      safeErrorCode,
      writtenCount: totalSnapshotWritten,
    });
  }

  logOuraPostRawTelemetry({
    operation: "oura_post_raw_completed",
    requestId,
    writtenCount: totalSnapshotWritten,
    sleepDocumentCount: sleepResult.written,
    readinessDocumentCount: readinessResult.written,
    dailyStressDocumentCount: stressResult.written,
    sleepNightDocumentCount: sleepResult.sleepNightsWritten,
    metadataWritten,
  });

  return {
    sleepWritten: sleepResult.written,
    readinessWritten: readinessResult.written,
    stressWritten: stressResult.written,
    sleepNightsWritten: sleepResult.sleepNightsWritten,
    metadataWritten,
  };
}
