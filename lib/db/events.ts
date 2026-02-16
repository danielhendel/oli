// lib/db/events.ts
/**
 * Purpose: Firestore event data access (list, create) for /users/{uid}/events.
 * Notes:
 *  - listEvents returns EventDoc[] (includes Firestore doc id) to satisfy consumers.
 *  - createEvent writes a NewEvent and returns EventDoc (optimistic shape with id).
 */

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as qLimit,
  addDoc,
  Timestamp,
  type QueryConstraint,
} from "firebase/firestore";
import type {
  Event,
  EventDoc,
  EventType,
  NewEvent,
  YMD,
} from "../types/domain";

/** Firestore collection helper for a user's events path */
export function eventsCol(uid: string) {
  const db = getFirestore();
  return collection(db, "users", uid, "events");
}

export type ListEventsOptions = {
  type?: EventType;
  /** inclusive (YYYY-MM-DD, UTC) */
  ymdStart?: YMD;
  /** inclusive (YYYY-MM-DD, UTC) */
  ymdEnd?: YMD;
  /** default 200 */
  limit?: number;
  /** newest first if true; default true */
  newestFirst?: boolean;
};

/**
 * Lists events for a user with optional filters and returns EventDoc[]
 * (includes Firestore doc id to satisfy consumers that expect `id`).
 */
export async function listEvents(
  uid: string,
  {
    type,
    ymdStart,
    ymdEnd,
    limit = 200,
    newestFirst = true,
  }: ListEventsOptions = {}
): Promise<EventDoc[]> {
  const colRef = eventsCol(uid);

  const clauses: QueryConstraint[] = [];

  if (type) {
    clauses.push(where("type", "==", type));
  }
  if (ymdStart) {
    clauses.push(where("ymd", ">=", ymdStart));
  }
  if (ymdEnd) {
    clauses.push(where("ymd", "<=", ymdEnd));
  }

  clauses.push(orderBy("ymd", newestFirst ? "desc" : "asc"));
  clauses.push(qLimit(limit));

  const q = query(colRef, ...clauses);
  const snap = await getDocs(q);

  const out: EventDoc[] = [];

  snap.forEach((doc) => {
    // Firestore returns plain data; we assert the Event shape here.
    // If your project uses zod/io-ts, validate instead of casting.
    const data = doc.data() as Event;

    // Optional: touch timestamp type to keep downstream helpers happy
    const maybeTs: unknown = (data as { ts?: unknown }).ts;
    if (maybeTs instanceof Timestamp) {
      // keep as-is; your app types allow Date OR Firestore timestamp shape
    }

    out.push({
      id: doc.id,
      ...data,
    });
  });

  return out;
}

/**
 * Creates a new event under /users/{uid}/events and returns the EventDoc (with id).
 * Caller is responsible for providing a properly-typed NewEvent (including ymd).
 */
export async function createEvent(uid: string, data: NewEvent): Promise<EventDoc> {
  const colRef = eventsCol(uid);
  const ref = await addDoc(colRef, {
    // add server-managed fields here if you choose (e.g., serverTimestamp())
    ...data,
  });
  return { id: ref.id, ...(data as Event) };
}
