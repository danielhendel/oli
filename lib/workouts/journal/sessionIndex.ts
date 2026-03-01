import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Workout journal session index (per user).
 * Needed for deterministic offline derivations like exercise memory (last/best).
 *
 * We only index sessions created going forward (no background scans).
 * Fail-closed: corrupted storage -> return [].
 */

function key(uid: string): string {
  return `workouts:journalIndex:v1:u:${uid}`;
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

export async function listWorkoutJournalSessionIds(uid: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (raw == null) return [];
  const parsed = safeJsonParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x) => typeof x === "string" && x.trim() !== "");
}

export async function addWorkoutJournalSessionId(uid: string, sessionId: string): Promise<void> {
  const current = await listWorkoutJournalSessionIds(uid);
  if (current.includes(sessionId)) return;
  current.push(sessionId);
  await AsyncStorage.setItem(key(uid), JSON.stringify(current));
}
