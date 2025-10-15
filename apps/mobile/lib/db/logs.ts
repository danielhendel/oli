// File: apps/mobile/lib/db/logs.ts
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { col } from '@/lib/paths';
import type { UID } from '@/types';
import type { WorkoutLog } from '@/types/workout';

/** Add a workout log under users/{uid}/logs/workouts */
export async function addWorkoutLog(db: Firestore, uid: UID, log: WorkoutLog) {
  const ref = collection(db, col.workoutLogs(uid));
  await addDoc(ref, { ...log, createdAt: serverTimestamp() });
}

/** Fetch recent workout logs (newest first) */
export async function listRecentWorkouts(db: Firestore, uid: UID, limitN = 20) {
  const ref = collection(db, col.workoutLogs(uid));
  const q = query(ref, orderBy('date', 'desc'));
  const snap = await getDocs(q);
  const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as WorkoutLog) }));
  return all.slice(0, limitN);
}
