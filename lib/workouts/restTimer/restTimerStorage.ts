import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Rest timer — last selected duration (device-local).
 * Used to pre-fill or default the next timer start.
 */

const KEY = "workouts:restTimer:lastDurationSec:v1";

export async function getLastRestTimerDurationSec(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw == null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function setLastRestTimerDurationSec(seconds: number): Promise<void> {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  await AsyncStorage.setItem(KEY, String(Math.round(seconds)));
}
