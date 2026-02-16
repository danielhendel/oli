// lib/logging/templates.ts
/**
 * Templates CRUD for Workout/Cardio/Nutrition/Recovery.
 * Storage path: /users/{uid}/templates/{type}/items/{id}
 */

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { EventType } from "./types";

export type TemplateDoc<TPayload = Record<string, unknown>> = {
  id: string;
  name: string;
  type: EventType;
  payload: TPayload;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

function templatesCol(uid: string, type: EventType) {
  const db = getFirestore();
  return collection(db, "users", uid, "templates", type, "items");
}

/** Read templates for a given type ordered by createdAt desc. */
export async function fetchTemplatesByType<TPayload = Record<string, unknown>>(
  uid: string,
  type: EventType
): Promise<TemplateDoc<TPayload>[]> {
  const snap = await getDocs(query(templatesCol(uid, type), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => {
    const data = d.data() as {
      name?: string;
      payload?: unknown;
      createdAt?: Timestamp | null;
      updatedAt?: Timestamp | null;
    };
    return {
      id: d.id,
      name: typeof data.name === "string" ? data.name : "Template",
      type,
      payload: (data.payload ?? {}) as TPayload,
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  });
}

/** Create a new template document and return its id. */
export async function createTemplate<TPayload extends object>(
  uid: string,
  type: EventType,
  name: string,
  payload: TPayload
): Promise<string> {
  const docRef = await addDoc(templatesCol(uid, type), {
    name: name.trim() || "Template",
    payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}
