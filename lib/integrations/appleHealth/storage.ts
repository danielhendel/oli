/**
 * Apple Health W1 — AsyncStorage keys and helpers.
 * Isolates key names for last sync timestamp and connection state.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const APPLE_HEALTH_LAST_SYNC_AT = "appleHealth:lastSyncAt";
export const APPLE_HEALTH_LAST_CHECKED_AT = "appleHealth:lastCheckedAt";
export const APPLE_HEALTH_CONNECTED = "appleHealth:connected";
export const APPLE_HEALTH_NOT_AVAILABLE = "appleHealth:notAvailable";
export const APPLE_HEALTH_DEEP_BACKFILL_VERSION = "appleHealth:deepBackfillVersion";
/** Last completed workout range-bootstrap build id (see workoutBootstrapPolicy). */
export const APPLE_HEALTH_WORKOUT_RANGE_BOOTSTRAP_BUILD = "appleHealth:workoutRangeBootstrapBuild";

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_LAST_SYNC_AT);
}

export async function setLastSyncAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_LAST_SYNC_AT, iso);
}

export async function getAppleHealthLastCheckedAt(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_LAST_CHECKED_AT);
}

export async function setAppleHealthLastCheckedAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_LAST_CHECKED_AT, iso);
}

export async function getAppleHealthConnected(): Promise<boolean> {
  const v = await AsyncStorage.getItem(APPLE_HEALTH_CONNECTED);
  return v === "true";
}

export async function setAppleHealthConnected(connected: boolean): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_CONNECTED, connected ? "true" : "false");
}

export async function getAppleHealthNotAvailable(): Promise<boolean> {
  const v = await AsyncStorage.getItem(APPLE_HEALTH_NOT_AVAILABLE);
  return v === "true";
}

export async function setAppleHealthNotAvailable(notAvailable: boolean): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_NOT_AVAILABLE, notAvailable ? "true" : "false");
}

export async function getAppleHealthDeepBackfillVersion(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_DEEP_BACKFILL_VERSION);
}

export async function setAppleHealthDeepBackfillVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_DEEP_BACKFILL_VERSION, version);
}

export async function getAppleHealthWorkoutRangeBootstrapBuild(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_WORKOUT_RANGE_BOOTSTRAP_BUILD);
}

export async function setAppleHealthWorkoutRangeBootstrapBuild(buildId: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_WORKOUT_RANGE_BOOTSTRAP_BUILD, buildId);
}

export async function clearAppleHealthWorkoutRangeBootstrapBuild(): Promise<void> {
  await AsyncStorage.removeItem(APPLE_HEALTH_WORKOUT_RANGE_BOOTSTRAP_BUILD);
}
