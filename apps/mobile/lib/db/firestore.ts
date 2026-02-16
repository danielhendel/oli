// File: apps/mobile/lib/firebase/core.ts
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/db/app';

let _db: Firestore | null = null;

/** Singleton Firestore bound to the singleton app. */
export function db(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
}
