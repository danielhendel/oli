import admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp(); // Cloud Run uses Workload Identity
}
export const db = admin.firestore();

export const setIdempotencyKey = async (key: string, ttlSeconds: number) => {
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + ttlSeconds * 1000));
  const ref = db.collection('idempotencyKeys').doc(key);
  await ref.create({ createdAt: Timestamp.now(), expiresAt });
};

export const hasIdempotencyKey = async (key: string) => {
  const ref = db.collection('idempotencyKeys').doc(key);
  const snap = await ref.get();
  return snap.exists;
};
