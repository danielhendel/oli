import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutLogFlowMode } from "@/lib/workouts/sessionEngine/workoutLogFlowMode";

/**
 * Active workout session pointer (per user).
 * Used to resume the most recent active workout session deterministically.
 */

function key(uid: string): string {
  return `workouts:activeSessionId:v1:${uid}`;
}

function flowKey(uid: string): string {
  return `workouts:activeLogFlowMode:v1:${uid}`;
}

function enrichTargetStorageKey(uid: string): string {
  return `workouts:activeEnrichTargetId:v1:${uid}`;
}

export async function getActiveWorkoutSessionId(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(key(uid));
}

/**
 * Persisted alongside the active session so resume can restore UI (e.g. hide live timer in backfill).
 */
export async function getActiveWorkoutLogFlowMode(uid: string): Promise<WorkoutLogFlowMode> {
  const v = await AsyncStorage.getItem(flowKey(uid));
  return v === "backfill" ? "backfill" : "live";
}

/**
 * Reconciled strength session id from workout day detail (`ReconciledWorkoutSession.id`) when the
 * active pointer is a backfill/enrichment log; used to avoid resuming the wrong workout.
 */
export async function getActiveWorkoutEnrichTargetId(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(enrichTargetStorageKey(uid));
}

export async function setActiveWorkoutSessionId(
  uid: string,
  sessionId: string,
  options?: { logFlowMode?: WorkoutLogFlowMode; enrichTargetId?: string | null },
): Promise<void> {
  await AsyncStorage.setItem(key(uid), sessionId);
  const mode = options?.logFlowMode ?? "live";
  if (mode === "backfill") {
    await AsyncStorage.setItem(flowKey(uid), "backfill");
    const tid = typeof options?.enrichTargetId === "string" ? options.enrichTargetId.trim() : "";
    if (tid.length > 0) {
      await AsyncStorage.setItem(enrichTargetStorageKey(uid), tid);
    } else {
      await AsyncStorage.removeItem(enrichTargetStorageKey(uid));
    }
  } else {
    await AsyncStorage.removeItem(flowKey(uid));
    await AsyncStorage.removeItem(enrichTargetStorageKey(uid));
  }
}

export async function clearActiveWorkoutSessionId(uid: string): Promise<void> {
  await AsyncStorage.removeItem(key(uid));
  await AsyncStorage.removeItem(flowKey(uid));
  await AsyncStorage.removeItem(enrichTargetStorageKey(uid));
}
