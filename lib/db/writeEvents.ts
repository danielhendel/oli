import { addDoc, serverTimestamp } from "firebase/firestore";
import { eventsCol } from "./paths";
import type { EventType } from "../logging/types";

type Envelope<T extends EventType, P extends object> = {
  uid: string;
  type: T;
  payload: P;
  version?: 1;
  source?: string;
};

async function addEvent<T extends EventType, P extends object>(env: Envelope<T, P>) {
  const { uid, ...rest } = env;
  const ref = await addDoc(eventsCol(uid), {
    ...rest,
    version: 1,
    source: rest.source ?? "manual",
    ts: serverTimestamp(),
    uid,
  } as Record<string, unknown>);
  return ref.id;
}

export async function saveWorkoutLog(uid: string, payload: {
  durationMs?: number;
  exercises?: Array<{ name: string; sets: Array<{ reps: number; weight?: number }> }>;
}) {
  return addEvent({ uid, type: "workout", payload });
}
