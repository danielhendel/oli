// File: apps/mobile/lib/db/profile.ts
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { col } from '@/lib/paths';
import type { UID } from '@/types';
import type { ProfileGeneral } from '@/types/profiles';

export async function upsertProfileGeneral(
  db: Firestore,
  uid: UID,
  data: ProfileGeneral
) {
  const ref = doc(db, col.profileDoc(uid, 'general'));
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getProfileGeneral(
  db: Firestore,
  uid: UID
): Promise<ProfileGeneral | null> {
  const ref = doc(db, col.profileDoc(uid, 'general'));
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as ProfileGeneral) : null;
}
