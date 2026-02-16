// cloudrun/src/facts.ts
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { z } from "zod";
import { db } from "./firestore.js";

export type EventKind = "workout" | "cardio" | "nutrition" | "recovery" | (string & {});

export type EventRow = {
  type: EventKind;
  ymd: string; // YYYY-MM-DD (UTC)
  payload?: unknown;
  meta?: unknown;
};

export type DailyFacts = {
  workouts: number;
  cardioSessions: number;
  nutritionLogs: number;
  recoveryLogs: number;
  // Extend later with calories, minutes, sets, sleep score, etc.
};

// --- schema / guards ---
const Ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

function isEventRow(d: DocumentData): d is EventRow {
  return typeof d?.type === "string" && typeof d?.ymd === "string";
}

/**
 * Reads all events for a given day (UTC YMD) and writes a derived daily facts doc.
 * @param uid Firestore user id
 * @param ymd YYYY-MM-DD (UTC)
 */
export async function rollupDaily(uid: string, ymd: string): Promise<void> {
  // Validate input YMD at runtime to avoid silent bad writes
  Ymd.parse(ymd);

  const evCol = db.collection("users").doc(uid).collection("events");
  const snap = await evCol.where("ymd", "==", ymd).get();

  // Shape and filter defensively
  const rows: EventRow[] = snap.docs
    .map((d) => d.data())
    .filter(isEventRow)
    .map((d) => ({ type: d.type, ymd: d.ymd, payload: d.payload, meta: d.meta }));

  // Single pass aggregation (faster than 4 separate filters)
  const facts: DailyFacts = rows.reduce<DailyFacts>(
    (acc, r) => {
      switch (r.type) {
        case "workout":
          acc.workouts += 1;
          break;
        case "cardio":
          acc.cardioSessions += 1;
          break;
        case "nutrition":
          acc.nutritionLogs += 1;
          break;
        case "recovery":
          acc.recoveryLogs += 1;
          break;
        default:
          // ignore other event types for v1 summary
          break;
      }
      return acc;
    },
    { workouts: 0, cardioSessions: 0, nutritionLogs: 0, recoveryLogs: 0 }
  );

  const factId = `daily.summary.v1:${ymd}`;
  await db
    .collection("users")
    .doc(uid)
    .collection("facts")
    .doc(factId)
    .set(
      {
        kind: "daily.summary.v1",
        date: ymd,
        value: facts,
        uid,
        version: 1,
        source: "derived",
        ts: Timestamp.now(),
      },
      { merge: false }
    );
}
