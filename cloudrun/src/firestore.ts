// cloudrun/src/firestore.ts
import admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp(); // Cloud Run default SA
}

export const db = admin.firestore();
// Helper for server timestamps
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

export type EventType = "workout" | "cardio" | "nutrition" | "recovery";
export type EventSource = "import:oura" | "import:withings";

export type EventMeta = {
  source: EventSource;
  version: 1;
  createdAt: admin.firestore.FieldValue;
  editedAt?: admin.firestore.FieldValue;
  idempotencyKey?: string;
};

export type EventDoc<TPayload = unknown> = {
  type: EventType;
  ymd: string;
  payload: TPayload;
  meta: EventMeta;
};

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}

export function idempotencyKey(seed: string): string {
  return fnv1a(seed);
}

export async function writeEventById(uid: string, eventId: string, doc: EventDoc): Promise<void> {
  const ref = db.collection("users").doc(uid).collection("events").doc(eventId);
  await ref.set({ ...doc }, { merge: false });
}
