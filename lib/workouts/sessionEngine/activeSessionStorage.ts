import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Active workout session pointer (per user).
 * Used to resume the most recent active workout session deterministically.
 */

function key(uid: string): string {
  return `workouts:activeSessionId:v1:${uid}`;
}

export async function getActiveWorkoutSessionId(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(key(uid));
}

export async function setActiveWorkoutSessionId(uid: string, sessionId: string): Promise<void> {
  await AsyncStorage.setItem(key(uid), sessionId);
}

export async function clearActiveWorkoutSessionId(uid: string): Promise<void> {
  await AsyncStorage.removeItem(key(uid));
}
