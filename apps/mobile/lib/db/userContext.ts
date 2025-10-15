// File: apps/mobile/lib/db/userContext.ts
import type { Firestore, DocumentReference } from 'firebase/firestore';
import { collection, doc } from 'firebase/firestore';
import { col } from '@/lib/paths';
import type { UID } from '@/types';

export class UserDb {
  constructor(private readonly db: Firestore, public readonly uid: UID) {
    if (!uid) throw new Error('UserDb requires a uid');
  }

  userDoc(): DocumentReference {
    return doc(this.db, col.user(this.uid));
  }

  subcol(path: string) {
    return collection(this.db, `users/${this.uid}/${path}`);
  }
}
