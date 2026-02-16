// Shared writer for all logs. Ensures type + ymd are always present.

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // your new firebase wrapper

// Keep local here to avoid circular deps.
type EventType = "workout" | "cardio" | "nutrition" | "recovery";

export type AnyPayload =
  | { exercises: Array<{ name?: string; sets: Array<{ reps?: number; weight?: number }> }>; durationMs?: number } // workout
  | { distanceKm?: number; durationMs?: number; rpe?: number } // cardio
  | {
      totals?: { calories?: number; protein?: number };
      meals?: {
        breakfast?: { calories?: number; protein?: number };
        lunch?: { calories?: number; protein?: number };
        dinner?: { calories?: number; protein?: number };
        snacks?: { calories?: number; protein?: number };
      };
    } // nutrition
  | { sleepMin?: number; hrv?: number; rhr?: number }; // recovery

type Link = { title?: string; url: string };
type DeviceInfo = { platform?: string; model?: string; os?: string; app?: string; id?: string };

export type WriteArgs = {
  uid: string;
  type: EventType;         // ← explicit, no detection
  payload: AnyPayload;
  source: "manual" | "device" | string;
  ymd?: string;            // ← preferred; if omitted we derive from atMs
  atMs?: number;           // wall-clock ms; defaults to Date.now()
  provider?: string;
  device?: DeviceInfo;
  notes?: string;
  tags?: string[];
  links?: Link[];
};

function toYMD(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function writeEvent(args: WriteArgs): Promise<{ id: string }> {
  const { uid, type, payload, source } = args;
  const atMs = typeof args.atMs === "number" ? args.atMs : Date.now();
  const ymd = args.ymd ?? toYMD(atMs);

  // Build the top-level document shape expected by readers.
  const base: Record<string, unknown> = {
    type,            // <- queried by day pages & rings
    ymd,             // <- queried by day pages & rings
    source,
    atMs,
    createdAt: serverTimestamp(),
    // Nice-to-haves (only include when defined)
  };

  if (args.provider) base.provider = args.provider;
  if (args.device) base.device = args.device;
  if (args.notes) base.notes = args.notes;
  if (args.tags?.length) base.tags = args.tags;
  if (args.links?.length) base.links = args.links;

  // Final payload write (top-level fields + payload)
  const docRef = await addDoc(collection(db, "users", uid, "events"), {
    ...base,
    payload,
  });

  return { id: docRef.id };
}
