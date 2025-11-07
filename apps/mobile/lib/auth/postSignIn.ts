import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebaseClient';

export async function ensureUserBootstrap(uid: string, email?: string) {
  const db = getFirestoreDb();
  const ref = doc(db, `users/${uid}/profile/general`);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      firstName: '',
      lastName: '',
      displayName: '',
      avatarUrl: '',
      email: typeof email === 'string' ? email : '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    // keep createdAt; only touch updatedAt and optionally email if empty
    const data = snap.data() as any;
    await setDoc(
      ref,
      {
        email: data?.email ? data.email : (typeof email === 'string' ? email : ''),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}
