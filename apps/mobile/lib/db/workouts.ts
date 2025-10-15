/**
 * Purpose: Typed Firestore access for workout logs. Keeps Firebase out of UI.
 * Inputs: uid (string), WorkoutLog objects validated by Zod.
 * Errors: Throws; caller maps to user-friendly messages.
 */

import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
  } from "firebase/firestore";
  import { db } from "./firestore"; // singleton from Sprint 2
  import { WorkoutLog, WorkoutLogSchema } from "../types/workout";
  
  const workoutsCol = (uid: string) => collection(db(), "users", uid, "logs", "workouts");
  
  // Map Firestore -> UI (date: Timestamp -> Date)
  function toUi(data: any): WorkoutLog {
    const date = data.date?.toDate ? data.date.toDate() : data.date;
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : undefined;
    const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined;
    return WorkoutLogSchema.parse({ ...data, date, createdAt, updatedAt });
  }
  
  // Map UI -> Firestore (date: Date -> Timestamp)
  function toFs(partial: Omit<WorkoutLog, "createdAt" | "updatedAt">) {
    return {
      ...partial,
      date: Timestamp.fromDate(partial.date),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }
  
  export async function addWorkoutLog(
    uid: string,
    partial: Omit<WorkoutLog, "id" | "createdAt" | "updatedAt">
  ): Promise<WorkoutLog> {
    // Validate upfront (with a temp id for schema completeness)
    WorkoutLogSchema.parse({ ...partial, id: "temp" });
  
    const ref = await addDoc(workoutsCol(uid), {
      ...toFs({ ...partial, id: "temp", uid }),
      id: undefined, // set after write
      uid,
    });
  
    await updateDoc(ref, { id: ref.id, updatedAt: serverTimestamp() });
    const snap = await getDoc(ref);
    return toUi({ id: ref.id, ...snap.data() });
  }
  
  export async function getWorkoutLog(uid: string, logId: string): Promise<WorkoutLog | null> {
    const ref = doc(db(), "users", uid, "logs", "workouts", logId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return toUi({ id: snap.id, ...snap.data() });
  }
  
  export async function updateWorkoutLog(
    uid: string,
    logId: string,
    partial: Partial<WorkoutLog>
  ): Promise<void> {
    const ref = doc(db(), "users", uid, "logs", "workouts", logId);
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  
    // Minimize risk: only include whitelisted fields if present
    if (partial.name !== undefined) payload.name = partial.name;
    if (partial.durationSec !== undefined) payload.durationSec = partial.durationSec;
    if (partial.notes !== undefined) payload.notes = partial.notes;
    if (partial.sections !== undefined) payload.sections = partial.sections;
    if (partial.totalVolume !== undefined) payload.totalVolume = partial.totalVolume;
    if (partial.date instanceof Date) payload.date = Timestamp.fromDate(partial.date);
  
    await setDoc(ref, payload, { merge: true });
  }
  
  export async function listRecentWorkouts(uid: string, max = 20): Promise<WorkoutLog[]> {
    const q = query(workoutsCol(uid), orderBy("date", "desc"), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => toUi({ id: d.id, ...d.data() }));
  }
  