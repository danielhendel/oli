// services/api/src/db/canonicalEvents.ts
import { db, userCollection } from "../db";

export type CanonicalEventsCollectionName = "events"; // authoritative canonical collection in this repo

export type CanonicalEventDoc = FirebaseFirestore.DocumentData;

export type PageCursor = {
  start: string; // ISO string (CanonicalEvent.start)
  id: string; // document id
};

export type ListByDayParams = {
  uid: string;
  day: string; // YYYY-MM-DD
  limit: number; // bounded
  cursor?: PageCursor;
};

export type ListByDayResult = {
  docs: { id: string; data: CanonicalEventDoc }[];
  hasMore: boolean;
};

export type GetByIdResult =
  | { ok: true; data: CanonicalEventDoc }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "FORBIDDEN" };

const collectionName: CanonicalEventsCollectionName = "events";

// Firestore-reserved field name for document ID (avoids importing FieldPath / firebase-admin)
const DOC_ID_FIELD = "__name__";

/**
 * Query canonical events for a user+day with deterministic ordering:
 *  - primary: start (ISO string)
 *  - secondary: document id
 *
 * Cursor pagination:
 *  - Cursor = { start, id }
 *  - startAfter(start, id)
 */
export async function listCanonicalEventsByDay(params: ListByDayParams): Promise<ListByDayResult> {
  const { uid, day, limit, cursor } = params;

  let q: FirebaseFirestore.Query = userCollection(uid, collectionName)
    .where("day", "==", day)
    .orderBy("start", "asc")
    .orderBy(DOC_ID_FIELD, "asc")
    .limit(limit + 1);

  if (cursor) {
    q = q.startAfter(cursor.start, cursor.id);
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, limit).map((d) => ({ id: d.id, data: d.data() }));
  const hasMore = snap.size > limit;

  return { docs, hasMore };
}

/**
 * Fetch a canonical event by id.
 *
 * Primary behavior (user-scoped):
 *  - read /users/{uid}/events/{id}
 *  - if exists -> return
 *
 * Authz invariant behavior:
 *  - if not found under uid, detect whether the id exists under a different user
 *    and return FORBIDDEN rather than NOT_FOUND (without returning any other user's data).
 */
export async function getCanonicalEventById(params: { uid: string; id: string }): Promise<GetByIdResult> {
  const { uid, id } = params;

  const ref = userCollection(uid, collectionName).doc(id);
  const snap = await ref.get();

  if (snap.exists) {
    return { ok: true, data: snap.data() as CanonicalEventDoc };
  }

  // Existence check elsewhere (no data returned)
  const existsElsewhere = await canonicalEventIdExistsForOtherUser({ uid, id });
  if (existsElsewhere) return { ok: false, code: "FORBIDDEN" };

  return { ok: false, code: "NOT_FOUND" };
}

async function canonicalEventIdExistsForOtherUser(params: { uid: string; id: string }): Promise<boolean> {
  const { uid, id } = params;

  // collectionGroup over "events" across users; filter by doc id using "__name__"
  const q = db.collectionGroup(collectionName).where(DOC_ID_FIELD, "==", id).limit(2);
  const snap = await q.get();

  if (snap.empty) return false;

  // Paths look like: users/{userId}/events/{eventId}
  for (const d of snap.docs) {
    const parts = d.ref.path.split("/");
    const userIdx = parts.indexOf("users");
    const foundUid = userIdx >= 0 && parts.length > userIdx + 1 ? parts[userIdx + 1] : null;
    if (foundUid && foundUid !== uid) return true;
  }

  return false;
}

/**
 * Fetch most recent "updatedAt" for a user's canonical events on a day.
 * Used for list metadata (freshness).
 */
export async function getLatestCanonicalWriteAtForDay(params: {
  uid: string;
  day: string;
}): Promise<string | null> {
  const { uid, day } = params;

  const q = userCollection(uid, collectionName)
    .where("day", "==", day)
    .orderBy("updatedAt", "desc")
    .orderBy(DOC_ID_FIELD, "desc")
    .limit(1);

  const snap = await q.get();
  const doc = snap.docs[0];
  if (!doc) return null;

  const raw = doc.data() as Record<string, unknown>;
  return typeof raw["updatedAt"] === "string" ? (raw["updatedAt"] as string) : null;
}