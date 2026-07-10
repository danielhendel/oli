/**
 * Match Oura daily_readiness rows to a sleep night and merge persisted HRV / lowest HR fields.
 */

import { buildSleepNightFromOuraSleepDocument } from "./buildSleepNightFromOuraDocument";
import { mergeDailySleepScoreIntoSleepNightPayload } from "./dailySleepScoreForSleepNight";
import {
  pickOuraReadinessAverageHrvMs,
  pickOuraReadinessLowestHeartRateBpm,
  type OuraDailyReadinessDocument,
  type OuraDailySleepDocument,
} from "../ouraApi";
import { logger } from "../logger";
import type { OuraSleepWindowDocument } from "./resolveOuraSleepIngestBase";

function toYmd(iso: string): string {
  return iso.slice(0, 10);
}

function coerceOptionalNumber(val: unknown): number | null {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const t = val.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Coerce snake_case API numeric fields (incl. digit strings) before Oura API pickers run. */
function readinessDocWithCoercedApiNumbers(raw: Record<string, unknown>): OuraDailyReadinessDocument {
  const out: Record<string, unknown> = { ...raw };
  for (const key of [
    "lowest_heart_rate",
    "average_hrv",
    "rmssd_5min",
    "rmssd_5min_balance",
    "average_heart_rate",
  ] as const) {
    const n = coerceOptionalNumber(raw[key]);
    if (n != null) out[key] = n;
  }
  return out as OuraDailyReadinessDocument;
}

/**
 * Records to scan for physiology: top-level vendor/API row, then nested raw `payload` when present.
 */
export function readinessRecordsForPick(raw: Record<string, unknown>): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [raw];
  const payload = raw.payload;
  if (
    payload != null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Object.getPrototypeOf(payload) === Object.prototype
  ) {
    out.push(payload as Record<string, unknown>);
  }
  return out;
}

/**
 * Attach linked Oura ingest `rawEvents.payload` when vendor snapshot omitted nested/raw fields.
 * Does not invent values — only exposes payload already stored on the raw row.
 */
export function enrichReadinessRecordWithRawPayload(
  vendor: Record<string, unknown>,
  rawPayload: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return vendor;
  }
  const existing = vendor.payload;
  if (
    existing != null &&
    typeof existing === "object" &&
    !Array.isArray(existing) &&
    Object.getPrototypeOf(existing) === Object.prototype
  ) {
    return vendor;
  }
  return { ...vendor, payload: rawPayload };
}

/** Top-level + nested payload keys (for debug / verify scripts). */
export function listReadinessRecordKeysForDebug(raw: Record<string, unknown>): string[] {
  const keys = new Set<string>();
  for (const rec of readinessRecordsForPick(raw)) {
    for (const k of Object.keys(rec)) keys.add(k);
  }
  return [...keys].sort();
}

export function readinessDayFromOuraReadinessDoc(doc: OuraDailyReadinessDocument): string | null {
  if (typeof doc.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(doc.day)) return doc.day;
  if (typeof doc.timestamp === "string" && doc.timestamp.length >= 10) return toYmd(doc.timestamp);
  return null;
}

/** Day key from API doc, vendor snapshot (`day` / `id`), or Firestore doc id. */
export function readinessDayFromReadinessRecord(
  raw: Record<string, unknown>,
  docId?: string,
): string | null {
  const fromApi = readinessDayFromOuraReadinessDoc(raw as OuraDailyReadinessDocument);
  if (fromApi) return fromApi;
  const dayField = typeof raw.day === "string" ? raw.day.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayField)) return dayField;
  const id = typeof raw.id === "string" ? raw.id.trim() : docId?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(id)) return id;
  const m = /^oura_readiness_(\d{4}-\d{2}-\d{2})$/.exec(id);
  return m?.[1] ?? null;
}

/** Prefer readiness row for wake calendar day, then rollup anchor day (Oura daily_readiness `day`). */
export function findReadinessDocumentForSleepNight(
  anchorDay: string,
  wakeDay: string | undefined | null,
  readinessDocs: OuraDailyReadinessDocument[],
): OuraDailyReadinessDocument | null {
  if (readinessDocs.length === 0) return null;
  const wake = typeof wakeDay === "string" && wakeDay.length > 0 ? wakeDay : null;
  if (wake) {
    const byWake = readinessDocs.find((d) => readinessDayFromOuraReadinessDoc(d) === wake);
    if (byWake) return byWake;
  }
  return readinessDocs.find((d) => readinessDayFromOuraReadinessDoc(d) === anchorDay) ?? null;
}

export function findPersistedReadinessRecord(
  anchorDay: string,
  wakeDay: string | null,
  byDay: Map<string, Record<string, unknown>>,
): Record<string, unknown> | null {
  const keys = wakeDay ? [wakeDay, anchorDay] : [anchorDay];
  for (const k of keys) {
    const r = byDay.get(k);
    if (r) return r;
  }
  return null;
}

/** Oura API snake_case + vendor camelCase + nested payload + numeric strings. */
export function pickAverageHrvMsFromReadinessRecord(raw: Record<string, unknown>): number | null {
  for (const src of readinessRecordsForPick(raw)) {
    const fromApi = pickOuraReadinessAverageHrvMs(readinessDocWithCoercedApiNumbers(src));
    if (fromApi != null) return fromApi;
    const camel = coerceOptionalNumber(src.averageHrvMs);
    if (camel != null && camel >= 0) return Math.round(camel);
    /** Oura ingest / canonical HRV raw payload (ms). */
    const ingestRmssd = coerceOptionalNumber(src.rmssdMs);
    if (ingestRmssd != null && ingestRmssd >= 0) return Math.round(ingestRmssd);
  }
  return null;
}

export function pickLowestHeartRateBpmFromReadinessRecord(raw: Record<string, unknown>): number | null {
  for (const src of readinessRecordsForPick(raw)) {
    const fromApi = pickOuraReadinessLowestHeartRateBpm(readinessDocWithCoercedApiNumbers(src));
    if (fromApi != null) return fromApi;
    const camel = coerceOptionalNumber(src.lowestHeartRateBpm);
    if (camel != null && camel >= 30 && camel <= 220) return Math.round(camel);
  }
  return null;
}

/** Mutates `merge` with first non-null physiology values from each source (in order). Readiness is fallback only. */
export function mergePhysiologySourcesIntoSleepNightPayload(
  merge: Record<string, unknown>,
  sources: (Record<string, unknown> | null | undefined)[],
): void {
  for (const src of sources) {
    if (!src) continue;
    let filled = false;
    if (merge.averageHrvMs == null) {
      const hrv = pickAverageHrvMsFromReadinessRecord(src);
      if (hrv != null) {
        merge.averageHrvMs = hrv;
        filled = true;
      }
    }
    if (merge.lowestHeartRateBpm == null) {
      const lhr = pickLowestHeartRateBpmFromReadinessRecord(src);
      if (lhr != null) {
        merge.lowestHeartRateBpm = lhr;
        filled = true;
      }
    }
    if (filled && merge.physiologySource !== "oura_sleep_doc") {
      merge.physiologySource = "oura_readiness";
    }
    if (merge.averageHrvMs != null && merge.lowestHeartRateBpm != null) break;
  }
}

/** @deprecated Use mergePhysiologySourcesIntoSleepNightPayload */
export function mergeOuraReadinessMetricsIntoSleepNightPayload(
  merge: Record<string, unknown>,
  readiness: OuraDailyReadinessDocument | null,
): void {
  mergePhysiologySourcesIntoSleepNightPayload(merge, readiness ? [readiness as Record<string, unknown>] : []);
}

export type SleepNightReadinessMergeDebug = {
  sleepAnchorDay: string;
  readinessDay: string | null;
  matched: boolean;
  lowestHeartRateCandidate: number | null;
  averageHrvCandidate: number | null;
  mergedPayloadKeys: string[];
  source: "api" | "persisted" | "none";
};

export function logSleepNightReadinessMergeDebugIfEnabled(debug: SleepNightReadinessMergeDebug): void {
  if (
    process.env.SLEEP_NIGHT_READINESS_MERGE_DEBUG !== "1" &&
    process.env.SLEEP_NIGHT_READINESS_MERGE_DEBUG !== "true"
  ) {
    return;
  }
  logger.info({
    msg: "[SLEEP_NIGHT_READINESS_MERGE_DEBUG]",
    ...debug,
  });
}

export type SleepNightPhysiologyDebug = {
  uid?: string;
  requestedDay?: string;
  sleepAnchorDay: string;
  wakeDay: string | null;
  readinessDocFound: boolean;
  readinessDay: string | null;
  readinessKeys: string[];
  pickedLowestHeartRateBpm: number | null;
  pickedAverageHrvMs: number | null;
  writePayloadKeys: string[];
  readHydrationSource: "sleep_night" | "readiness" | "daily_facts" | "write" | "none";
};

export function logSleepNightPhysiologyDebugIfEnabled(debug: SleepNightPhysiologyDebug): void {
  if (
    process.env.SLEEP_NIGHT_PHYSIOLOGY_DEBUG !== "1" &&
    process.env.SLEEP_NIGHT_PHYSIOLOGY_DEBUG !== "true"
  ) {
    return;
  }
  logger.info({
    msg: "[SLEEP_NIGHT_PHYSIOLOGY_DEBUG]",
    ...debug,
  });
}

export function collectReadinessLookupDaysForSleepPairs(
  pairs: { doc: OuraSleepWindowDocument; snapshot: { id: string } }[],
): string[] {
  const days = new Set<string>();
  for (const { doc, snapshot } of pairs) {
    const built = buildSleepNightFromOuraSleepDocument(doc, { sourceDocumentId: snapshot.id });
    if (!built) continue;
    days.add(built.anchorDay);
    const wake = typeof built.merge.wakeDay === "string" ? built.merge.wakeDay : null;
    if (wake) days.add(wake);
  }
  return [...days];
}

/** Load `ouraVendorReadiness` by calendar day (doc id `YYYY-MM-DD` or `day` field). */
export async function loadPersistedOuraVendorReadinessByDaysFromCollection(
  col: FirebaseFirestore.CollectionReference,
  days: string[],
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  const unique = [...new Set(days.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
  await Promise.all(
    unique.map(async (day) => {
      const byId = await col.doc(day).get();
      if (byId.exists) {
        map.set(day, byId.data() as Record<string, unknown>);
        return;
      }
      const byOuraId = await col.doc(`oura_readiness_${day}`).get();
      if (byOuraId.exists) {
        map.set(day, byOuraId.data() as Record<string, unknown>);
        return;
      }
      const q = await col.where("day", "==", day).limit(5).get();
      for (const doc of q.docs) {
        const raw = doc.data() as Record<string, unknown>;
        const key = readinessDayFromReadinessRecord(raw, doc.id) ?? day;
        if (/^\d{4}-\d{2}-\d{2}$/.test(key) && !map.has(key)) {
          map.set(key, raw);
        }
      }
    }),
  );
  return map;
}

export type BuildSleepNightPhysiologyDebugContext = {
  uid?: string;
  requestedDay?: string;
};

/**
 * Merge payload for `users/{uid}/sleepNights/{anchorDay}` from Oura sleep + readiness (API + persisted).
 * Sleep-period `lowest_heart_rate` / `average_hrv` are set in `buildSleepNightFromOuraSleepDocument`;
 * readiness fills only missing fields.
 */
export function buildSleepNightFirestorePayloadWithOuraReadiness(
  doc: OuraSleepWindowDocument,
  sourceDocumentId: string,
  readinessDocs: OuraDailyReadinessDocument[] | undefined,
  persistedReadinessByDay?: Map<string, Record<string, unknown>>,
  physiologyDebug?: BuildSleepNightPhysiologyDebugContext,
  dailySleepDocs?: OuraDailySleepDocument[],
): { anchorDay: string; payload: Record<string, unknown> } | null {
  const built = buildSleepNightFromOuraSleepDocument(doc, { sourceDocumentId });
  if (!built) return null;
  const merge: Record<string, unknown> = { ...built.merge };
  const wake = typeof merge.wakeDay === "string" ? merge.wakeDay : null;
  const apiRd = findReadinessDocumentForSleepNight(built.anchorDay, wake, readinessDocs ?? []);
  const persistedRd = findPersistedReadinessRecord(
    built.anchorDay,
    wake,
    persistedReadinessByDay ?? new Map(),
  );
  mergePhysiologySourcesIntoSleepNightPayload(merge, [
    apiRd as Record<string, unknown> | null,
    persistedRd,
  ]);
  mergeDailySleepScoreIntoSleepNightPayload(merge, dailySleepDocs);

  const matchedRecord = apiRd ?? persistedRd;
  const readinessDay =
    matchedRecord != null
      ? readinessDayFromReadinessRecord(matchedRecord as Record<string, unknown>)
      : null;

  logSleepNightReadinessMergeDebugIfEnabled({
    sleepAnchorDay: built.anchorDay,
    readinessDay,
    matched: matchedRecord != null,
    lowestHeartRateCandidate: pickLowestHeartRateBpmFromReadinessRecord(
      (matchedRecord ?? {}) as Record<string, unknown>,
    ),
    averageHrvCandidate: pickAverageHrvMsFromReadinessRecord(
      (matchedRecord ?? {}) as Record<string, unknown>,
    ),
    mergedPayloadKeys: ["lowestHeartRateBpm", "averageHrvMs", "score"].filter((k) => merge[k] != null),
    source: apiRd ? "api" : persistedRd ? "persisted" : "none",
  });

  const writePayloadKeys = ["lowestHeartRateBpm", "averageHrvMs", "score"].filter((k) => merge[k] != null);
  logSleepNightPhysiologyDebugIfEnabled({
    ...(physiologyDebug?.uid != null ? { uid: physiologyDebug.uid } : {}),
    requestedDay: physiologyDebug?.requestedDay ?? built.anchorDay,
    sleepAnchorDay: built.anchorDay,
    wakeDay: wake,
    readinessDocFound: matchedRecord != null,
    readinessDay,
    readinessKeys: matchedRecord != null ? listReadinessRecordKeysForDebug(matchedRecord as Record<string, unknown>) : [],
    pickedLowestHeartRateBpm:
      typeof merge.lowestHeartRateBpm === "number" ? (merge.lowestHeartRateBpm as number) : null,
    pickedAverageHrvMs: typeof merge.averageHrvMs === "number" ? (merge.averageHrvMs as number) : null,
    writePayloadKeys,
    readHydrationSource: writePayloadKeys.length > 0 ? "write" : "none",
  });

  return { anchorDay: built.anchorDay, payload: merge };
}
