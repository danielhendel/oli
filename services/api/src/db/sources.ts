// services/api/src/db/sources.ts
import type { CollectionReference, DocumentReference } from "firebase-admin/firestore";

import { userCollection } from "../db";
import { sourceDocSchema, type SourceDoc } from "../types/sources";

export const sourcesCollection = (uid: string): CollectionReference => userCollection(uid, "sources");

export type GetSourceResult =
  | { ok: true; source: SourceDoc; ref: DocumentReference }
  | { ok: false; status: 404 | 500; code: "NOT_FOUND" | "INVALID_DOC"; message: string };

export async function getSource(uid: string, sourceId: string): Promise<GetSourceResult> {
  const ref = sourcesCollection(uid).doc(sourceId);
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Source not found" };
  }

  const parsed = sourceDocSchema.safeParse(snap.data());
  if (!parsed.success) {
    return { ok: false, status: 500, code: "INVALID_DOC", message: "Invalid source document" };
  }

  return { ok: true, source: parsed.data, ref };
}
