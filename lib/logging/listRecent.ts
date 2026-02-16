// lib/logging/listRecent.ts
import { getFirestore, collection, query, where, orderBy, limit as ql, getDocs, DocumentData } from "firebase/firestore";
import type { EventType } from "./types";

export type EventBase = {
  id: string;
  ymd: string;
  ts: number;
  type: EventType;
  payload: unknown;
};

export async function listRecent(
  uid: string,
  type: EventType,
  limit = 20
): Promise<EventBase[]> {
  const db = getFirestore();
  const col = collection(db, "users", uid, "events");
  const q = query(col, where("type", "==", type), orderBy("ts", "desc"), ql(limit));
  const snap = await getDocs(q);
  const out: EventBase[] = [];
  snap.forEach((doc) => {
    const d = doc.data() as DocumentData;
    const ymd = typeof d["ymd"] === "string" ? d["ymd"] : "";
    const ts = typeof d["ts"] === "number" ? d["ts"] : 0;
    const payload = d["payload"];
    out.push({ id: doc.id, ymd, ts, type, payload });
  });
  return out;
}
