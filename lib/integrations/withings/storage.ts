/**
 * Withings — AsyncStorage key and helpers for lastCheckedAt (freshness contract).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export const WITHINGS_LAST_CHECKED_AT = "withings:lastCheckedAt";

export async function getWithingsLastCheckedAt(): Promise<string | null> {
  return AsyncStorage.getItem(WITHINGS_LAST_CHECKED_AT);
}

export async function setWithingsLastCheckedAt(iso: string): Promise<void> {
  await AsyncStorage.setItem(WITHINGS_LAST_CHECKED_AT, iso);
}
