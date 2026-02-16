// lib/dev/smoke.ts
/**
 * Dev helpers: (1) single-call smoke test and (2) seed logs that
 * the Details pages actually render (workout/cardio/nutrition/recovery).
 * - No `any` casts
 * - Narrow types for recent events logging
 * - Keeps Firebase code out of screens
 */
import { addDoc, serverTimestamp, type CollectionReference } from "firebase/firestore";
import { eventsCol } from "../db/paths";
import { ensureEmulatorAuth } from "./ensureEmuAuth";

// Keep these for your existing Dev Console buttons
import { writeSampleMeasurement, readRecentEvents } from "./sampleEvent";

/** Minimal shape we rely on for console output. */
type MinimalEvent = {
  type: string;
  ts?: unknown;
};

/** Envelope for seeding events (simple + safe for dev) */
type SeedEnvelope =
  | { type: "workout";   version: 1; payload: Record<string, unknown> }
  | { type: "cardio";    version: 1; payload: Record<string, unknown> }
  | { type: "nutrition"; version: 1; payload: Record<string, unknown> }
  | { type: "recovery";  version: 1; payload: Record<string, unknown> };

/** Safely convert various timestamp shapes to milliseconds. */
function tsToMillis(ts: unknown): number | null {
  if (!ts || typeof ts !== "object") return null;

  // Case 1: Firestore Timestamp instance
  const maybeFn = (ts as { toMillis?: () => number }).toMillis;
  if (typeof maybeFn === "function") {
    try {
      return maybeFn.call(ts);
    } catch {
      /* fall through to structural check */
    }
  }

  // Case 2: Structural shape { seconds, nanoseconds }
  const s = (ts as { seconds?: unknown }).seconds;
  const n = (ts as { nanoseconds?: unknown }).nanoseconds;
  if (typeof s === "number" && typeof n === "number") {
    return Math.trunc(s * 1000 + n / 1e6);
  }
  return null;
}

/** One-shot smoke test (measurement -> recent events) */
export async function smokeEventsRoundTrip(uidFromUI: string): Promise<void> {
  await ensureEmulatorAuth();

  const id = await writeSampleMeasurement(uidFromUI);
  console.log("[SMOKE] Sample measurement written:", id);

  const recentRaw = await readRecentEvents(uidFromUI, 5);
  const recent: MinimalEvent[] = Array.isArray(recentRaw)
    ? recentRaw.map((r) => {
        const ev = r as Partial<MinimalEvent>;
        return { type: typeof ev.type === "string" ? ev.type : "unknown", ts: ev.ts };
      })
    : [];

  console.log(
    "[SMOKE] Recent events:",
    recent.map((e) => ({ type: e.type, tsMs: tsToMillis(e.ts) ?? "n/a" }))
  );
}

/* ------------------------
   Seeders used by Dev Console
   ------------------------ */

async function seedEvent(uid: string, envelope: SeedEnvelope): Promise<string> {
  // Ensure rules see an authenticated user in the Auth emulator
  await ensureEmulatorAuth();

  // Re-type the collection so we can write a generic record without `any`.
  const col = eventsCol(uid) as unknown as CollectionReference<Record<string, unknown>>;
  const docRef = await addDoc(col, {
    uid,
    ts: serverTimestamp(),
    source: "manual",
    ...envelope, // { type, version, payload }
  });

  return docRef.id;
}

export async function writeSampleWorkoutLog(uid: string): Promise<string> {
  return seedEvent(uid, {
    type: "workout",
    version: 1,
    payload: {
      exercises: [
        {
          name: "Bench Press",
          sets: [
            { reps: 10, weight: 95 },
            { reps: 10, weight: 135 },
            { reps: 10, weight: 185 },
          ],
        },
      ],
      durationMs: 45 * 60 * 1000,
    },
  });
}

export async function writeSampleCardioLog(uid: string): Promise<string> {
  return seedEvent(uid, {
    type: "cardio",
    version: 1,
    payload: {
      modality: "run",
      distanceKm: 5.2,
      rpe: 7,
      durationMs: 32 * 60 * 1000,
    },
  });
}

export async function writeSampleNutritionLog(uid: string): Promise<string> {
  return seedEvent(uid, {
    type: "nutrition",
    version: 1,
    payload: {
      totals: { calories: 2200, protein: 150 },
      meals: {
        breakfast: { calories: 500, protein: 30 },
        lunch: { calories: 800, protein: 50 },
        dinner: { calories: 800, protein: 60 },
        snacks: { calories: 100, protein: 10 },
      },
    },
  });
}

export async function writeSampleRecoveryLog(uid: string): Promise<string> {
  return seedEvent(uid, {
    type: "recovery",
    version: 1,
    payload: {
      sleepMin: 420,
      hrv: 60,
      rhr: 60,
    },
  });
}
