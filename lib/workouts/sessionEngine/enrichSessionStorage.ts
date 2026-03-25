import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Per-(user, enrichTargetId) pointer to the journal session used when adding exercises
 * from a specific workout day detail. Intentionally separate from the global
 * `activeSessionStorage` live-workout pointer so enrichment never collides with Start Workout.
 */

function storageKey(uid: string, enrichTargetId: string): string {
  return `workouts:enrichSession:v1:${uid}:${encodeURIComponent(enrichTargetId)}`;
}

export async function getEnrichSessionPointer(uid: string, enrichTargetId: string): Promise<string | null> {
  const tid = enrichTargetId.trim();
  if (!tid) return null;
  return AsyncStorage.getItem(storageKey(uid, tid));
}

export async function setEnrichSessionPointer(
  uid: string,
  enrichTargetId: string,
  sessionId: string,
): Promise<void> {
  const tid = enrichTargetId.trim();
  if (!tid) return;
  await AsyncStorage.setItem(storageKey(uid, tid), sessionId);
}

export async function clearEnrichSessionPointer(uid: string, enrichTargetId: string): Promise<void> {
  const tid = enrichTargetId.trim();
  if (!tid) return;
  await AsyncStorage.removeItem(storageKey(uid, tid));
}
