// File: apps/mobile/lib/db/facts.ts
import { doc, getDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { doc as pathDoc } from '@/lib/paths';
import type { UID } from '@/types';
import type { FactDaily } from '@/types/facts';

export async function getDailyFact(
  db: Firestore,
  uid: UID,
  isoDate: string
): Promise<FactDaily | null> {
  const ref = doc(db, pathDoc.factDaily(uid, isoDate));
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as FactDaily) : null;
}

// No client write helpers here by design (rules forbid client writes).
