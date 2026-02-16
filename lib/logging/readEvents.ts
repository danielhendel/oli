// lib/logging/readEvents.ts
import {
  getDocs,
  orderBy,
  query,
  where,
  type CollectionReference,
} from "firebase/firestore";
import { eventsCol } from "../db/paths";
import type { EventDoc, EventType } from "./types";

/** Convert Firestore Timestamp | Date | number | undefined -> Date safely. */
export function tsToDate(ts: unknown): Date {
  if (ts instanceof Date) return ts;
  if (typeof ts === "number") return new Date(ts);
  // Firestore Timestamp has a toDate(): Date method
  if (ts && typeof ts === "object") {
    const maybe = ts as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") return maybe.toDate();
  }
  return new Date(NaN);
}

/** Local-day [start, end) range from YYYY-MM-DD. */
function ymdRange(ymd: string) {
  const start = new Date(`${ymd}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

/**
 * Read all events for (uid, type) on a given day.
 * Primary: by `ymd` equality; Fallback: by `atMs` time range.
 */
export async function readDayEvents(
  uid: string,
  type: EventType,
  ymd: string
): Promise<EventDoc[]> {
  const col = eventsCol(uid) as CollectionReference;

  // Fast path: exact match on ymd + type
  const q1 = query(col, where("type", "==", type), where("ymd", "==", ymd), orderBy("atMs", "desc"));
  const s1 = await getDocs(q1);
  let out = s1.docs.map((d) => {
    const base = d.data() as Record<string, unknown>;
    return { id: d.id, ...base } as EventDoc;
  });
  if (out.length) return out;

  // Fallback: match by local-day range using atMs
  const { startMs, endMs } = ymdRange(ymd);
  const q2 = query(
    col,
    where("type", "==", type),
    where("atMs", ">=", startMs),
    where("atMs", "<", endMs),
    orderBy("atMs", "desc")
  );
  const s2 = await getDocs(q2);
  out = s2.docs.map((d) => {
    const base = d.data() as Record<string, unknown>;
    return { id: d.id, ...base } as EventDoc;
  });
  return out;
}
