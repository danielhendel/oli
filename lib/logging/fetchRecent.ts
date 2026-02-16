// lib/logging/fetchRecent.ts
import { getFirestore, collection, query, where, orderBy, limit as ql, getDocs } from "firebase/firestore";
import type { EventType } from "./types";

export type RecentEvent = {
  id: string;
  type: EventType;
  ymd: string;
  payload: unknown;
  ts: number;
};

export async function fetchRecentEventsByType(
  uid: string,
  type: EventType,
  limit = 20
): Promise<RecentEvent[]> {
  const db = getFirestore();
  const col = collection(db, "users", uid, "events");
  const q = query(col, where("type", "==", type), orderBy("ts", "desc"), ql(limit));
  const snap = await getDocs(q);
  const out: RecentEvent[] = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    out.push({
      id: d.id,
      type,
      ymd: typeof data.ymd === "string" ? data.ymd : "",
      payload: data.payload,
      ts: typeof data.ts === "number" ? data.ts : 0,
    });
  });
  return out;
}
