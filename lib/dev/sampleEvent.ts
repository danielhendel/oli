// lib/dev/sampleEvent.ts
/**
 * Dev helpers for creating and reading sample events.
 * - createSampleWorkout(uid): writes a simple workout event and returns the doc id
 * - writeSampleMeasurement(uid, metric?, value?, ymd?): writes a measurement event and returns the doc id
 *   • If called with only uid, defaults to body_weight_kg = 70 (today)
 * - readRecentEvents(uid, days?, type?): lists recent events (EventDoc[])
 */

import { createEvent, listEvents } from "../db/events";
import type { EventDoc, EventType, NewEvent, YMD } from "../types/domain";

/** YYYY-MM-DD (local) */
function toYMDLocal(dt: Date): YMD {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` as YMD;
}

function ymdTodayLocal(): YMD {
  return toYMDLocal(new Date());
}

function ymdDaysAgoLocal(days: number): YMD {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toYMDLocal(d);
}

/**
 * Creates a simple sample workout event for the given user id.
 * @returns Firestore document id (string)
 */
export async function createSampleWorkout(uid: string): Promise<string> {
  const ymd = ymdTodayLocal();

  const sample: NewEvent = {
    uid,
    type: "workout",
    ymd,
    source: "manual",
    payload: {
      name: "Push A (Sample)",
      focusAreas: ["chest", "triceps"],
      durationMin: 45,
      exercises: [
        { name: "Flat Barbell Bench", sets: [{ reps: 10, weight: 135 }, { reps: 8, weight: 155 }] },
        { name: "Cable Fly", sets: [{ reps: 15, weight: 25 }] },
      ],
      notes: "Dev sample event",
    },
  };

  const doc = await createEvent(uid, sample);
  return doc.id;
}

/**
 * Writes a measurement event (e.g., body weight) and returns the doc id.
 * If called with only uid, defaults to body_weight_kg = 70 (today).
 */
export async function writeSampleMeasurement(
  uid: string,
  metric:
    | "body_weight_kg"
    | "body_fat_pct"
    | "hr_rest"
    | "hrv_rmssd"
    | "blood_pressure"
    | (string & {}) = "body_weight_kg",
  value: number | { systolic: number; diastolic: number } = 70,
  ymd: YMD = ymdTodayLocal()
): Promise<string> {
  const evt: NewEvent = {
    uid,
    type: "measurement",
    ymd,
    source: "manual",
    payload: { metric, value },
  };

  const doc = await createEvent(uid, evt);
  return doc.id;
}

/**
 * Reads recent events for a user (default last 7 days), optionally by type.
 * Returns EventDoc[] including Firestore doc ids.
 */
export async function readRecentEvents(
  uid: string,
  days = 7,
  type?: EventType
): Promise<EventDoc[]> {
  const ymdEnd: YMD = ymdTodayLocal(); // inclusive
  const ymdStart: YMD = ymdDaysAgoLocal(days - 1); // inclusive window of N days

  // Build options conditionally to satisfy exactOptionalPropertyTypes
  const opts: Parameters<typeof listEvents>[1] = {
    ymdStart,
    ymdEnd,
    newestFirst: true,
    limit: 500,
  };
  if (type !== undefined) {
    (opts as { type?: EventType }).type = type;
  }

  const events = await listEvents(uid, opts);
  return events;
}
