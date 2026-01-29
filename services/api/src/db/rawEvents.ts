// services/api/src/db/rawEvents.ts
import { userCollection } from "../db";

export type RawEventDoc = FirebaseFirestore.DocumentData;

export type RawEventFilters = {
  kind?: string;
  provider?: string;
  sourceId?: string;
};

export type PageCursor = {
  start: string; // observedAt ISO string
  id: string; // document id
};

export type ListRawEventsParams = {
  uid: string;
  observedAtStartIso: string; // inclusive
  observedAtEndIso: string; // exclusive
  limit: number; // bounded
  cursor?: PageCursor;
  filters?: RawEventFilters;
};

export type ListRawEventsResult = {
  docs: { id: string; data: RawEventDoc }[];
  hasMore: boolean;
};

// Firestore-reserved field name for document ID (avoids importing FieldPath / firebase-admin)
const DOC_ID_FIELD = "__name__";

/**
 * Query raw events with deterministic ordering:
 *  - primary: observedAt (ISO string)
 *  - secondary: document id
 *
 * Cursor pagination:
 *  - cursor = { start: observedAt, id }
 *  - startAfter(observedAt, id)
 */
export async function listRawEventsByObservedAtRange(params: ListRawEventsParams): Promise<ListRawEventsResult> {
  const { uid, observedAtStartIso, observedAtEndIso, limit, cursor, filters } = params;

  let q: FirebaseFirestore.Query = userCollection(uid, "rawEvents")
    .where("observedAt", ">=", observedAtStartIso)
    .where("observedAt", "<", observedAtEndIso)
    .orderBy("observedAt", "asc")
    .orderBy(DOC_ID_FIELD, "asc")
    .limit(limit + 1);

  if (filters?.kind) q = q.where("kind", "==", filters.kind);
  if (filters?.provider) q = q.where("provider", "==", filters.provider);
  if (filters?.sourceId) q = q.where("sourceId", "==", filters.sourceId);

  if (cursor) q = q.startAfter(cursor.start, cursor.id);

  const snap = await q.get();
  const docs = snap.docs.slice(0, limit).map((d) => ({ id: d.id, data: d.data() }));
  const hasMore = snap.size > limit;

  return { docs, hasMore };
}