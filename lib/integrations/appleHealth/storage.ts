/**
 * Apple Health W1 — AsyncStorage keys and helpers.
 * Isolates key names for last sync timestamp and connection state.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const APPLE_HEALTH_LAST_SYNC_AT = "appleHealth:lastSyncAt";
export const APPLE_HEALTH_CONNECTED = "appleHealth:connected";
export const APPLE_HEALTH_NOT_AVAILABLE = "appleHealth:notAvailable";

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(APPLE_HEALTH_LAST_SYNC_AT);
}

export async function setLastSyncAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(APPLE_HEALTH_LAST_SYNC_AT, iso);
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
