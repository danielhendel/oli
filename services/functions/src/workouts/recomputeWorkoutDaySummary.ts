import { FieldPath, type Firestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import type { RawEventDoc } from "@oli/contracts";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";
import { computeWorkoutDaySummaryPayload } from "@/lib/data/workouts/workoutDaySummaryCompute";

const OBSERVED_PAD_DAYS = 21;
const PAGE_SIZE = 200;
const MAX_PAGES = 100;

type TimestampLike = { toDate: () => Date };

function isTimestampLike(v: unknown): v is TimestampLike {
  return v != null && typeof v === "object" && typeof (v as TimestampLike).toDate === "function";
}

function toIso(v: unknown): string | null {
  if (typeof v === "string" && v.length > 0) return v;
  if (isTimestampLike(v)) return v.toDate().toISOString();
  return null;
}

/**
 * Map Firestore rawEvents doc → shape {@link parseWorkoutHistoryItem} accepts (aligned with API list path).
 */
function queryDocToRawEventDoc(d: QueryDocumentSnapshot): RawEventDoc | null {
  const r = d.data() as Record<string, unknown>;
  const observedAt = toIso(r["observedAt"]);
  const receivedAt = toIso(r["receivedAt"]);
  if (!observedAt || !receivedAt) return null;
  const kind = r["kind"];
  if (kind !== "workout" && kind !== "strength_workout") return null;

  const base: Record<string, unknown> = {
    schemaVersion: 1,
    id: d.id,
    userId: typeof r["userId"] === "string" ? r["userId"] : "",
    sourceId: typeof r["sourceId"] === "string" ? r["sourceId"] : "unknown",
    provider: typeof r["provider"] === "string" ? r["provider"] : "",
    sourceType: typeof r["sourceType"] === "string" ? r["sourceType"] : "",
    kind,
    observedAt,
    receivedAt,
    payload: "payload" in r ? r["payload"] : {},
  };
  if (r["recordedAt"]) base.recordedAt = toIso(r["recordedAt"]) ?? undefined;
  if (r["provenance"]) base.provenance = r["provenance"];
  if (r["uncertaintyState"]) base.uncertaintyState = r["uncertaintyState"];
  if (r["contentUnknown"] === true) base.contentUnknown = true;
  if (typeof r["correctionOfRawEventId"] === "string") base.correctionOfRawEventId = r["correctionOfRawEventId"];

  return base as RawEventDoc;
}

export async function fetchWorkoutRawDocsForObservedAtIsoWindow(
  db: Firestore,
  uid: string,
  startIso: string,
  endIso: string,
): Promise<RawEventDoc[]> {
  const userRef = db.collection("users").doc(uid);
  const kinds = ["workout", "strength_workout"] as const;

  const out: RawEventDoc[] = [];
  let lastSnap: QueryDocumentSnapshot | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = userRef
      .collection("rawEvents")
      .where("kind", "in", [...kinds])
      .where("observedAt", ">=", startIso)
      .where("observedAt", "<=", endIso)
      .orderBy("observedAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(PAGE_SIZE);

    if (lastSnap) {
      q = q.startAfter(lastSnap);
    }

    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const parsed = queryDocToRawEventDoc(doc);
      if (parsed) out.push(parsed);
    }

    if (snap.docs.length < PAGE_SIZE) break;
    lastSnap = snap.docs[snap.docs.length - 1] ?? null;
    if (!lastSnap) break;
  }

  return out;
}

async function fetchWorkoutRawDocsForUiDay(
  db: Firestore,
  uid: string,
  uiDay: DayKey,
): Promise<RawEventDoc[]> {
  const observedStartDay = addCalendarDaysToDayKey(uiDay, -OBSERVED_PAD_DAYS);
  const observedEndDay = addCalendarDaysToDayKey(uiDay, OBSERVED_PAD_DAYS);
  const startIso = `${observedStartDay}T00:00:00.000Z`;
  const endIso = `${observedEndDay}T23:59:59.999Z`;
  return fetchWorkoutRawDocsForObservedAtIsoWindow(db, uid, startIso, endIso);
}

/**
 * Recompute from truth (paginated raw query + shared parity module) and authoritative `set`.
 *
 * **Covered today:** new workout raw creates (`onRawEventCreated` after canonical write);
 * raw workout updates/deletes (`onRawEventUpdatedForWorkoutDaySummary`, `onRawEventDeletedForWorkoutDaySummary`).
 * Summary rows are derived from raw truth only — canonical event edits alone do not invalidate these docs.
 */
export async function recomputeAndWriteWorkoutDaySummary(args: {
  db: Firestore;
  userId: string;
  uiDay: DayKey;
}): Promise<void> {
  const { db, userId, uiDay } = args;
  const rawDocs = await fetchWorkoutRawDocsForUiDay(db, userId, uiDay);
  const computedAt = new Date().toISOString();
  const payload = computeWorkoutDaySummaryPayload(uiDay, rawDocs, computedAt);

  await db.collection("users").doc(userId).collection("workoutDaySummaries").doc(uiDay).set(payload);

  try {
    const mod = await import("./recomputeWorkoutMonthSummary.js");
    await mod.maybeRecomputeWorkoutMonthSummaryForUiDay({ db, userId, uiDay });
  } catch (err) {
    logger.error("workout_month_summary_after_day_failed", {
      msg: "workout_month_summary_after_day_failed",
      userId,
      uiDay,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Authoritative rebuild for every calendar day in [start, end] (inclusive).
 * Used by API backfill (`POST .../workout-day-summaries/rebuild`) and future admin jobs.
 */
export async function rebuildWorkoutDaySummariesForRange(args: {
  db: Firestore;
  userId: string;
  start: DayKey;
  end: DayKey;
}): Promise<{ daysProcessed: number }> {
  const { db, userId, start, end } = args;
  const days: DayKey[] = [];
  let current = start;
  while (current <= end) {
    days.push(current);
    const d = new Date(`${current}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    current = d.toISOString().slice(0, 10) as DayKey;
  }

  for (const uiDay of days) {
    await recomputeAndWriteWorkoutDaySummary({ db, userId, uiDay });
  }

  return { daysProcessed: days.length };
}
