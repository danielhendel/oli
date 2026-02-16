// lib/logging/readOne.ts
import { doc, getDoc } from "firebase/firestore";
import { eventsCol } from "../db/paths";
import type { EventDoc } from "./types";

/** Fetch one event by id for a given user. */
export async function readEventById(uid: string, id: string): Promise<EventDoc | null> {
  const ref = doc(eventsCol(uid), id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<EventDoc, "id">;
  return { id: snap.id, ...data };
}
