/**
 * Withings — AsyncStorage keys and helpers.
 * - lastCheckedAt: freshness contract
 * - lastKnownConnected: last resolved connection state for list hydration (Devices list shows On/Off immediately)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const WITHINGS_LAST_CHECKED_AT = "withings:lastCheckedAt";
export const WITHINGS_LAST_KNOWN_CONNECTED = "withings:lastKnownConnected";

export async function getWithingsLastCheckedAt(): Promise<string | null> {
  return AsyncStorage.getItem(WITHINGS_LAST_CHECKED_AT);
}

export async function setWithingsLastCheckedAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(WITHINGS_LAST_CHECKED_AT, iso);
}

export async function getWithingsLastKnownConnected(): Promise<boolean | null> {
  const v = await AsyncStorage.getItem(WITHINGS_LAST_KNOWN_CONNECTED);
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export async function setWithingsLastKnownConnected(connected: boolean): Promise<void> {
  await AsyncStorage.setItem(WITHINGS_LAST_KNOWN_CONNECTED, connected ? "true" : "false");
}
