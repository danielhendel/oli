import {
  sleepNightDocumentSchema,
  type SleepNightDocumentDto,
  type SleepNightViewDto,
} from "@oli/contracts/sleepNight";

import { documentIdPath, userCollection } from "../db";
import { firestoreDocToPlainJson } from "./sleepNightFirestore";
import { logger } from "./logger";
import {
  enrichReadinessRecordWithRawPayload,
  listReadinessRecordKeysForDebug,
  logSleepNightPhysiologyDebugIfEnabled,
  pickAverageHrvMsFromReadinessRecord,
  pickLowestHeartRateBpmFromReadinessRecord,
  readinessDayFromReadinessRecord,
} from "./oura/readinessForSleepNightMerge";
import { coerceOuraSleepScore0to100 } from "./oura/buildSleepNightFromOuraDocument";
import { coerceRawSleepNightForRead } from "./sleepNightReadCoerce";

/** Minimal snapshot surface (avoids runtime firebase-admin resolution in Jest). */
type SleepNightDocSnapshot = {
  exists: boolean;
  id: string;
  data: () => Record<string, unknown> | undefined;
};

export function dayMinus(day: string, days: number): string {
  const d = new Date(day + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function parseSleepNightSnapshot(snap: SleepNightDocSnapshot): SleepNightDocumentDto | null {
  if (!snap.exists) return null;
  const raw = snap.data() as Record<string, unknown> | undefined;
  if (!raw) return null;
  const flat = firestoreDocToPlainJson(raw);
  const merged = coerceRawSleepNightForRead(flat, snap.id);
  const parsed = sleepNightDocumentSchema.safeParse(merged);
  return parsed.success ? parsed.data : null;
}

function notFoundReason(args: {
  exactExists: boolean;
  exact: SleepNightDocumentDto | null;
  minus1Exists: boolean;
  minus1: SleepNightDocumentDto | null;
  minus2Exists: boolean;
  minus2: SleepNightDocumentDto | null;
}): string {
  const parts: string[] = [];
  if (args.exactExists && args.exact == null) parts.push("exact_parse_failed");
  if (args.minus1Exists && args.minus1 == null) parts.push("minus1_parse_failed");
  if (args.minus2Exists && args.minus2 == null) parts.push("minus2_parse_failed");
  const anyParsed = args.exact != null || args.minus1 != null || args.minus2 != null;
  const anyComplete =
    args.exact?.isComplete === true ||
    args.minus1?.isComplete === true ||
    args.minus2?.isComplete === true;
  if (anyParsed && !anyComplete) parts.push("no_complete_doc_in_window");
  if (!args.exactExists && !args.minus1Exists && !args.minus2Exists) parts.push("no_docs_in_window");
  if (parts.length === 0) parts.push("no_complete_match");
  return parts.join(",");
}

/** Latest by `endedAt`, then by `anchorDay` (ascending sort → take last). */
export function pickLatestCompleteSleepNight(nights: SleepNightDocumentDto[]): SleepNightDocumentDto | null {
  const complete = nights.filter((n) => n.isComplete);
  if (complete.length === 0) return null;
  complete.sort((a, b) => {
    const endA = a.endedAt ?? "";
    const endB = b.endedAt ?? "";
    if (endA !== endB) return endA.localeCompare(endB);
    return a.anchorDay.localeCompare(b.anchorDay);
  });
  return complete[complete.length - 1] ?? null;
}

function dedupeDayKeys(days: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const d of days) {
    if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

/**
 * When `sleepNights` predates readiness merge, fill lowest HR / average HRV from persisted
 * `ouraVendorReadiness` (same-day order: wake → anchor → requested), then `dailyFacts` HRV only.
 */
export async function hydrateSleepNightPhysiologyMetrics(
  uid: string,
  view: SleepNightViewDto,
  opts?: { allowRawEventLookup?: boolean },
): Promise<SleepNightViewDto> {
  const night = view.sleepNight;
  const hasLowest = typeof night.lowestHeartRateBpm === "number" && Number.isFinite(night.lowestHeartRateBpm);
  const hasHrv = typeof night.averageHrvMs === "number" && Number.isFinite(night.averageHrvMs);
  if (hasLowest && hasHrv) return view;

  let lowest: number | null = hasLowest ? night.lowestHeartRateBpm! : null;
  let hrv: number | null = hasHrv ? night.averageHrvMs! : null;

  let readinessDocFound = false;
  let readinessDay: string | null = null;
  let readinessKeys: string[] = [];
  let readHydrationSource: "sleep_night" | "readiness" | "daily_facts" | "none" = hasLowest && hasHrv
    ? "sleep_night"
    : "none";

  const readinessCol = userCollection(uid, "ouraVendorReadiness");
  const allowRawEventLookup = opts?.allowRawEventLookup !== false;
  const rawEventsCol = allowRawEventLookup ? userCollection(uid, "rawEvents") : null;

  const tryReadinessRecord = async (raw: Record<string, unknown>, docId?: string) => {
    readinessDocFound = true;
    const rd = readinessDayFromReadinessRecord(raw, docId) ?? null;
    if (rd) readinessDay = rd;
    readinessKeys = listReadinessRecordKeysForDebug(raw);

    const applyPick = (rec: Record<string, unknown>) => {
      if (lowest == null) {
        const l = pickLowestHeartRateBpmFromReadinessRecord(rec);
        if (l != null) {
          lowest = l;
          if (!hasLowest) readHydrationSource = "readiness";
        }
      }
      if (hrv == null) {
        const h = pickAverageHrvMsFromReadinessRecord(rec);
        if (h != null) {
          hrv = h;
          if (!hasHrv) readHydrationSource = "readiness";
        }
      }
    };

    applyPick(raw);
    if (lowest != null && hrv != null) return;

    const linkedId =
      (typeof raw.id === "string" && raw.id.trim().length > 0 ? raw.id.trim() : null) ??
      (typeof docId === "string" && docId.trim().length > 0 ? docId.trim() : null);
    if (!linkedId || !rawEventsCol) return;

    const rawSnap = await rawEventsCol.doc(linkedId).get();
    if (!rawSnap.exists) return;
    const rawRow = rawSnap.data() as Record<string, unknown>;
    const payload =
      rawRow.payload && typeof rawRow.payload === "object" && !Array.isArray(rawRow.payload)
        ? (rawRow.payload as Record<string, unknown>)
        : null;
    if (!payload) return;
    const enriched = enrichReadinessRecordWithRawPayload(raw, payload);
    readinessKeys = listReadinessRecordKeysForDebug(enriched);
    applyPick(enriched);
    if (hrv == null && linkedId) {
      const evSnap = await userCollection(uid, "events").doc(linkedId).get();
      if (evSnap.exists) {
        const ev = evSnap.data() as Record<string, unknown>;
        const rmssd = ev.rmssdMs;
        if (typeof rmssd === "number" && Number.isFinite(rmssd) && rmssd >= 0) {
          hrv = Math.round(rmssd);
          if (!hasHrv) readHydrationSource = "daily_facts";
        }
      }
    }
  };

  for (const day of dedupeDayKeys([night.wakeDay, night.anchorDay, view.requestedDay])) {
    if (lowest != null && hrv != null) break;
    const direct = await readinessCol.doc(day).get();
    if (direct.exists) {
      await tryReadinessRecord(direct.data() as Record<string, unknown>, direct.id);
    } else {
      const alt = await readinessCol.doc(`oura_readiness_${day}`).get();
      if (alt.exists) {
        await tryReadinessRecord(alt.data() as Record<string, unknown>, alt.id);
      }
    }
    if (lowest != null && hrv != null) break;
    const snap = await readinessCol.where("day", "==", day).limit(10).get();
    for (const doc of snap.docs) {
      if (lowest != null && hrv != null) break;
      await tryReadinessRecord(doc.data() as Record<string, unknown>, doc.id);
    }
  }

  if (hrv == null) {
    const factsSnap = await userCollection(uid, "dailyFacts").doc(view.requestedDay).get();
    if (factsSnap.exists) {
      const data = factsSnap.data() as Record<string, unknown>;
      const energy = data.energyInfluencers as Record<string, unknown> | undefined;
      const phys = energy?.physiology as Record<string, unknown> | undefined;
      const recovery = data.recovery as Record<string, unknown> | undefined;
      const physMs = phys?.hrvRmssdMs;
      const recMs = recovery?.hrvRmssd;
      const pick =
        typeof physMs === "number" && Number.isFinite(physMs) && physMs >= 0
          ? physMs
          : typeof recMs === "number" && Number.isFinite(recMs) && recMs >= 0
            ? recMs
            : null;
      if (pick != null) {
        hrv = Math.round(pick);
        if (!hasHrv) readHydrationSource = "daily_facts";
      }
    }
  }

  const patch: Partial<SleepNightDocumentDto> = {};
  if (!hasLowest && lowest != null) patch.lowestHeartRateBpm = lowest;
  if (!hasHrv && hrv != null) patch.averageHrvMs = hrv;

  logSleepNightPhysiologyDebugIfEnabled({
    uid,
    requestedDay: view.requestedDay,
    sleepAnchorDay: night.anchorDay,
    wakeDay: night.wakeDay ?? null,
    readinessDocFound,
    readinessDay,
    readinessKeys,
    pickedLowestHeartRateBpm: !hasLowest && lowest != null ? lowest : hasLowest ? night.lowestHeartRateBpm ?? null : null,
    pickedAverageHrvMs: !hasHrv && hrv != null ? hrv : hasHrv ? night.averageHrvMs ?? null : null,
    writePayloadKeys: [],
    readHydrationSource: Object.keys(patch).length > 0 ? readHydrationSource : "none",
  });

  if (Object.keys(patch).length === 0) return view;

  const candidate = { ...night, ...patch };
  const parsed = sleepNightDocumentSchema.safeParse(candidate);
  if (!parsed.success) return view;
  return { ...view, sleepNight: parsed.data };
}

function scoreFromVendorSleepRecord(raw: Record<string, unknown>): number | null {
  // Only calendar-day Daily Sleep summaries carry the trusted provider Sleep Score.
  if (raw.kind !== "daily_sleep") return null;
  const direct = coerceOuraSleepScore0to100(raw.score);
  if (direct != null) return direct;
  const payload =
    raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload)
      ? (raw.payload as Record<string, unknown>)
      : null;
  if (payload) return coerceOuraSleepScore0to100(payload.score);
  return null;
}

/**
 * When SleepNight predates Daily Sleep score merge, fill `score` from persisted
 * `ouraVendorSleep` rows with `kind: "daily_sleep"` (wake day, then anchor).
 */
export async function hydrateSleepNightDailyScore(
  uid: string,
  view: SleepNightViewDto,
): Promise<SleepNightViewDto> {
  const night = view.sleepNight;
  if (coerceOuraSleepScore0to100(night.score) != null) return view;

  const col = userCollection(uid, "ouraVendorSleep");

  const tryDay = async (day: string): Promise<number | null> => {
    const directIds = [`oura_daily_sleep_${day}`, day];
    for (const id of directIds) {
      const snap = await col.doc(id).get();
      if (!snap.exists) continue;
      const score = scoreFromVendorSleepRecord(snap.data() as Record<string, unknown>);
      if (score != null) return score;
    }
    const q = await col.where("day", "==", day).limit(20).get();
    for (const doc of q.docs) {
      const raw = doc.data() as Record<string, unknown>;
      if (raw.kind !== "daily_sleep") continue;
      const score = scoreFromVendorSleepRecord(raw);
      if (score != null) return score;
    }
    return null;
  };

  let score: number | null = null;
  for (const day of dedupeDayKeys([night.wakeDay, night.anchorDay])) {
    score = await tryDay(day);
    if (score != null) break;
  }
  if (score == null) return view;

  const candidate = { ...night, score };
  const parsed = sleepNightDocumentSchema.safeParse(candidate);
  if (!parsed.success) return view;
  return { ...view, sleepNight: parsed.data };
}

/**
 * Bounded resolution for `GET /users/me/sleep-night` (max lookback: anchors `day-1`, `day-2` only).
 * Complete nights only. Caller supplies reads for exact path + two prior anchors.
 *
 * Order (matches Sleep “Today” when `sleepNights/{D}` is complete after read coercion):
 * 1. `sleepNights/{requestedDay}` when **complete** (Oura rollup / anchor day = calendar day).
 * 2. Latest complete night among `day−1` / `day−2` with **`wakeDay === requestedDay`** (prior physiological night that woke on D).
 * 3. Otherwise latest complete among `day−1` / `day−2` by `endedAt` (bounded fallback).
 */
export function resolveSleepNightViewFromBoundedReads(
  requestedDay: string,
  exact: SleepNightDocumentDto | null,
  minus1: SleepNightDocumentDto | null,
  minus2: SleepNightDocumentDto | null,
): SleepNightViewDto | null {
  const priorAnchors = [minus1, minus2].filter((n): n is SleepNightDocumentDto => n != null);

  if (exact?.isComplete === true) {
    return {
      requestedDay,
      anchorDay: exact.anchorDay,
      wakeDay: exact.wakeDay,
      resolution: "exact_anchor",
      isFallback: false,
      sleepNight: exact,
    };
  }

  const wakeMatches = priorAnchors.filter((n) => n.isComplete && n.wakeDay === requestedDay);
  const bestWake = pickLatestCompleteSleepNight(wakeMatches);
  if (bestWake != null) {
    return {
      requestedDay,
      anchorDay: bestWake.anchorDay,
      wakeDay: bestWake.wakeDay,
      resolution: "wake_day",
      isFallback: false,
      sleepNight: bestWake,
    };
  }

  const bestPrior = pickLatestCompleteSleepNight(priorAnchors);
  if (bestPrior != null) {
    return {
      requestedDay,
      anchorDay: bestPrior.anchorDay,
      wakeDay: bestPrior.wakeDay,
      resolution: "latest_completed_prior_night",
      isFallback: false,
      sleepNight: bestPrior,
    };
  }

  return null;
}

/**
 * Resolve canonical SleepNight for calendar `requestedDay` (Dash: show latest completed prior night when needed).
 *
 * Set `SLEEP_NIGHT_READ_DEBUG=1` to emit one structured `[SLEEP_NIGHT_READ_DEBUG]` log line per request (Cloud Run).
 */
export async function loadSleepNightView(uid: string, requestedDay: string): Promise<SleepNightViewDto | null> {
  const col = userCollection(uid, "sleepNights");
  const d1 = dayMinus(requestedDay, 1);
  const d2 = dayMinus(requestedDay, 2);

  const [exactSnap, s1, s2] = await Promise.all([
    col.doc(requestedDay).get(),
    col.doc(d1).get(),
    col.doc(d2).get(),
  ]);

  const exact = parseSleepNightSnapshot(exactSnap);
  const minus1 = parseSleepNightSnapshot(s1);
  const minus2 = parseSleepNightSnapshot(s2);

  let view = resolveSleepNightViewFromBoundedReads(requestedDay, exact, minus1, minus2);
  if (view) {
    view = await hydrateSleepNightPhysiologyMetrics(uid, view);
    view = await hydrateSleepNightDailyScore(uid, view);
  }

  if (process.env.SLEEP_NIGHT_READ_DEBUG === "1" || process.env.SLEEP_NIGHT_READ_DEBUG === "true") {
    logger.info({
      msg: "[SLEEP_NIGHT_READ_DEBUG]",
      uid,
      requestedDay,
      exactExists: exactSnap.exists,
      exactComplete: exact?.isComplete ?? null,
      exactScore: exact?.score ?? null,
      exactWakeDay: exact?.wakeDay ?? null,
      minus1Exists: s1.exists,
      minus1Complete: minus1?.isComplete ?? null,
      minus1Score: minus1?.score ?? null,
      minus1WakeDay: minus1?.wakeDay ?? null,
      selectedResolution: view?.resolution ?? null,
      selectedAnchorDay: view?.anchorDay ?? null,
      reasonIfNotFound:
        view == null
          ? notFoundReason({
              exactExists: exactSnap.exists,
              exact,
              minus1Exists: s1.exists,
              minus1,
              minus2Exists: s2.exists,
              minus2,
            })
          : null,
    });
  }

  return view;
}

function enumerateDayKeysInclusive(start: string, end: string): string[] {
  if (start > end) return [];
  const out: string[] = [];
  let current = start;
  while (current <= end) {
    out.push(current);
    current = dayMinus(current, -1);
  }
  return out;
}

/**
 * Bounded range read over `users/{uid}/sleepNights` for inclusive [start, end].
 *
 * - Does **not** query `rawEvents` (physiology hydrate uses vendor readiness + dailyFacts only).
 * - Missing calendar days are omitted (no per-day 404).
 * - Uses the same resolution rules as GET /users/me/sleep-night per requested day.
 * - Prefetches `[start-2, end]` with **one** document-ID range query (no per-day `.get()` fan-out).
 */
export async function loadSleepNightViewsForRange(
  uid: string,
  start: string,
  end: string,
): Promise<SleepNightViewDto[]> {
  if (start > end) return [];

  const col = userCollection(uid, "sleepNights");
  const fetchStart = dayMinus(start, 2);
  const fetchIds = enumerateDayKeysInclusive(fetchStart, end);

  // Single bounded query: YYYY-MM-DD doc ids sort lexicographically with calendar order.
  const rangeSnap = await col
    .where(documentIdPath, ">=", fetchStart)
    .where(documentIdPath, "<=", end)
    .get();

  const byId = new Map<string, SleepNightDocumentDto | null>();
  for (const id of fetchIds) {
    byId.set(id, null);
  }
  for (const doc of rangeSnap.docs) {
    // Ignore unexpected ids outside the enumerated window (defensive).
    if (!byId.has(doc.id)) continue;
    byId.set(
      doc.id,
      parseSleepNightSnapshot({
        exists: true,
        id: doc.id,
        data: () => doc.data() as Record<string, unknown> | undefined,
      }),
    );
  }

  const requestedDays = enumerateDayKeysInclusive(start, end);
  const resolved: SleepNightViewDto[] = [];
  for (const day of requestedDays) {
    const exact = byId.get(day) ?? null;
    const minus1 = byId.get(dayMinus(day, 1)) ?? null;
    const minus2 = byId.get(dayMinus(day, 2)) ?? null;
    const view = resolveSleepNightViewFromBoundedReads(day, exact, minus1, minus2);
    if (view) resolved.push(view);
  }

  const hydrated = await Promise.all(
    resolved.map(async (view) => {
      let next = await hydrateSleepNightPhysiologyMetrics(uid, view, { allowRawEventLookup: false });
      next = await hydrateSleepNightDailyScore(uid, next);
      return next;
    }),
  );

  return hydrated;
}
