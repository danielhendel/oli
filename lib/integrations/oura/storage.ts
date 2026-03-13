/**
 * Oura — AsyncStorage keys and helpers.
 * lastKnownConnected: last resolved connection state for list hydration (Devices list shows On/Off immediately).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const OURA_LAST_CHECKED_AT = "oura:lastCheckedAt";
export const OURA_LAST_KNOWN_CONNECTED = "oura:lastKnownConnected";
/** After 404 from status endpoint, skip calling status API until this time (ms since epoch). Shared across all useOuraPresence instances. */
export const OURA_STATUS_404_BACKOFF_UNTIL = "oura:status404BackoffUntil";

export async function getOuraLastCheckedAt(): Promise<string | null> {
  return AsyncStorage.getItem(OURA_LAST_CHECKED_AT);
}

export async function setOuraLastCheckedAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(OURA_LAST_CHECKED_AT, iso);
}

export async function getOuraLastKnownConnected(): Promise<boolean | null> {
  const v = await AsyncStorage.getItem(OURA_LAST_KNOWN_CONNECTED);
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export async function setOuraLastKnownConnected(connected: boolean): Promise<void> {
  await AsyncStorage.setItem(OURA_LAST_KNOWN_CONNECTED, connected ? "true" : "false");
}

export async function getOuraStatus404BackoffUntil(): Promise<number | null> {
  const v = await AsyncStorage.getItem(OURA_STATUS_404_BACKOFF_UNTIL);
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function setOuraStatus404BackoffUntil(untilMs: number): Promise<void> {
  await AsyncStorage.setItem(OURA_STATUS_404_BACKOFF_UNTIL, String(untilMs));
}
