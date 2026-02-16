// lib/logging/mutateEvent.ts
import { deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { eventDoc } from "../db/paths";

// Lightweight payload shapes that match your schemas (kept local to avoid circular deps)
type WorkoutSet = { reps?: number; weight?: number };
type WorkoutPayload = {
  exercises: Array<{ name: string; sets: WorkoutSet[] }>;
  startedAtMs?: number;
  durationMs?: number;
};
type CardioPayload = {
  modality: "run" | "row" | "swim" | "cycle";
  distanceKm?: number;
  durationMs?: number;
  rpe?: number;
};
type NutritionPayload = {
  totals: { calories?: number; protein?: number };
  meals?: {
    breakfast?: { calories?: number; protein?: number };
    lunch?: { calories?: number; protein?: number };
    dinner?: { calories?: number; protein?: number };
    snacks?: { calories?: number; protein?: number };
  };
};
type RecoveryPayload = { sleepMin?: number; hrv?: number; rhr?: number };

/** Replace the workout payload (merge at the field level). */
export async function updateWorkoutEvent(uid: string, id: string, payload: WorkoutPayload): Promise<void> {
  const ref = eventDoc(uid, id);
  await updateDoc(ref, {
    payload,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function updateCardioEvent(uid: string, id: string, payload: CardioPayload): Promise<void> {
  const ref = eventDoc(uid, id);
  await updateDoc(ref, {
    payload,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function updateNutritionEvent(uid: string, id: string, payload: NutritionPayload): Promise<void> {
  const ref = eventDoc(uid, id);
  await updateDoc(ref, {
    payload,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function updateRecoveryEvent(uid: string, id: string, payload: RecoveryPayload): Promise<void> {
  const ref = eventDoc(uid, id);
  await updateDoc(ref, {
    payload,
    updatedAt: serverTimestamp(),
  } as Record<string, unknown>);
}

export async function deleteEventById(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(eventDoc(uid, id).parent, id));
}
