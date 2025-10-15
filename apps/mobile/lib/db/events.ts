// File: apps/mobile/lib/db/events.ts
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { col } from '@/lib/paths';
import type { Firestore } from 'firebase/firestore';
import type { UID } from '@/types';
import type { EventEnvelope } from '@/types/events'; // your Sprint 2 type

/**
 * Create an append-only event (enforced by rules).
 * The payload should already be validated at the UI edge (zod).
 */
export async function createEvent(
  db: Firestore,
  uid: UID,
  event: Omit<EventEnvelope, 'uid' | 'ts'>
): Promise<string> {
  const ref = collection(db, col.events());
  const docRef = await addDoc(ref, {
    ...event,
    uid,
    ts: serverTimestamp(),
  });
  return docRef.id;
}
