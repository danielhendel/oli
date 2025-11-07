// apps/mobile/lib/db/users.ts
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, col } from '@/lib/db';

/** Canonical shape of /users/{uid}/profile/general */
export interface UserGeneralProfile {
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string;
  email: string;
  createdAt: number; // millis
  updatedAt: number; // millis
}

/** Read /users/{uid}/profile/general with safe defaults + timestamp normalization */
export async function getGeneralProfile(uid: string): Promise<UserGeneralProfile> {
  const ref = doc(db, `${col.userProfile(uid)}/general`);
  const snap = await getDoc(ref);
  const now = Date.now();

  const toMillis = (v: unknown): number => {
    if (v instanceof Timestamp) return v.toMillis();
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    return now; // exactOptionalPropertyTypes-friendly: never undefined
  };

  if (!snap.exists()) {
    // brand-new user: return a valid object with empty strings + timestamps
    return {
      firstName: '',
      lastName: '',
      displayName: '',
      avatarUrl: '',
      email: '',
      createdAt: now,
      updatedAt: now,
    };
  }

  const d = snap.data() as Record<string, unknown>;

  return {
    firstName: (typeof d.firstName === 'string' ? d.firstName : '') as string,
    lastName: (typeof d.lastName === 'string' ? d.lastName : '') as string,
    displayName: (typeof d.displayName === 'string' ? d.displayName : '') as string,
    avatarUrl: (typeof d.avatarUrl === 'string' ? d.avatarUrl : '') as string,
    email: (typeof d.email === 'string' ? d.email : '') as string,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
}

/** Merge allowed fields + serverTimestamp updatedAt */
export async function upsertGeneralProfile(
  uid: string,
  patch: Partial<UserGeneralProfile>
): Promise<void> {
  const ref = doc(db, `${col.userProfile(uid)}/general`);

  // Whitelist only known string fields; never write createdAt/updatedAt from client
  const toWrite: Record<string, unknown> = {};
  (['firstName', 'lastName', 'displayName', 'avatarUrl', 'email'] as const).forEach((k) => {
    const v = patch[k];
    if (typeof v === 'string') toWrite[k] = v;
  });

  toWrite.updatedAt = serverTimestamp();

  await setDoc(ref, toWrite, { merge: true });
}
