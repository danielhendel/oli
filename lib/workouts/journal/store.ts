import AsyncStorage from "@react-native-async-storage/async-storage";
import { storedJournalRecordSchema, type StoredJournalRecordV1, type WorkoutEventV1 } from "./types";

/**
 * Workout Journal Store v1 (AsyncStorage).
 * Append-only semantics: we only ever append new records to the list.
 * Fail-closed: corrupted storage payload yields empty list (and does not throw).
 *
 * NOTE: This is intentionally storage-agnostic by interface shape; future SQLite impl can match it.
 */

const KEY_PREFIX = "workouts:journal:v1";

function eventsKey(uid: string, sessionId: string): string {
  return `${KEY_PREFIX}:u:${uid}:s:${sessionId}:events`;
}

function pendingKey(uid: string): string {
  return `${KEY_PREFIX}:u:${uid}:pending`; // list of eventIds not yet confirmed as sent
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

function normalizeRecords(raw: unknown): StoredJournalRecordV1[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredJournalRecordV1[] = [];
  for (const item of raw) {
    const parsed = storedJournalRecordSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

async function readRecords(uid: string, sessionId: string): Promise<StoredJournalRecordV1[]> {
  const raw = await AsyncStorage.getItem(eventsKey(uid, sessionId));
  if (raw == null) return [];
  const parsed = safeJsonParse(raw);
  return normalizeRecords(parsed);
}

async function writeRecords(uid: string, sessionId: string, records: StoredJournalRecordV1[]): Promise<void> {
  await AsyncStorage.setItem(eventsKey(uid, sessionId), JSON.stringify(records));
}

async function readPending(uid: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(pendingKey(uid));
  if (raw == null) return [];
  const parsed = safeJsonParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x) => typeof x === "string" && x.trim() !== "");
}

async function writePending(uid: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(pendingKey(uid), JSON.stringify(ids));
}

export async function appendWorkoutJournalEvent(
  uid: string,
  sessionId: string,
  event: WorkoutEventV1,
): Promise<void> {
  // Ensure we only persist schema-valid records. Fail closed: invalid event -> do nothing.
  const rec: StoredJournalRecordV1 = { v: 1, e: event };
  const valid = storedJournalRecordSchema.safeParse(rec);
  if (!valid.success) return;

  const existing = await readRecords(uid, sessionId);
  existing.push(valid.data);
  await writeRecords(uid, sessionId, existing);

  // Mark pending (idempotent)
  const pending = await readPending(uid);
  if (!pending.includes(event.eventId)) {
    pending.push(event.eventId);
    await writePending(uid, pending);
  }
}

export async function appendWorkoutJournalEvents(
  uid: string,
  sessionId: string,
  events: WorkoutEventV1[],
): Promise<void> {
  if (events.length === 0) return;
  const existing = await readRecords(uid, sessionId);
  const pending = await readPending(uid);
  let pendingChanged = false;

  for (const e of events) {
    const rec: StoredJournalRecordV1 = { v: 1, e };
    const parsed = storedJournalRecordSchema.safeParse(rec);
    if (!parsed.success) continue; // fail-closed: skip invalid
    existing.push(parsed.data);
    if (!pending.includes(e.eventId)) {
      pending.push(e.eventId);
      pendingChanged = true;
    }
  }

  await writeRecords(uid, sessionId, existing);
  if (pendingChanged) await writePending(uid, pending);
}

export async function listWorkoutJournalEvents(uid: string, sessionId: string): Promise<WorkoutEventV1[]> {
  const records = await readRecords(uid, sessionId);
  return records.map((r) => r.e);
}

export async function listPendingWorkoutJournalEventIds(uid: string): Promise<string[]> {
  return readPending(uid);
}

export async function markWorkoutJournalEventSent(uid: string, eventId: string): Promise<void> {
  const pending = await readPending(uid);
  const next = pending.filter((id) => id !== eventId);
  if (next.length === pending.length) return;
  await writePending(uid, next);
}

/**
 * Dev-only helper: clears a session journal. Never call this from production UI.
 */
export async function __devClearWorkoutJournalSession(uid: string, sessionId: string): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.removeItem(eventsKey(uid, sessionId));
}
