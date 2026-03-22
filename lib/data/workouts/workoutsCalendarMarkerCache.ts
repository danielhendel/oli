import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutMarkerFlags } from "@/lib/data/workouts/workoutMarkerFlags";
import type { DayKey } from "@/lib/ui/calendar/types";

export const WORKOUT_CALENDAR_MARKER_CACHE_KEY = "workouts:calendarMarkers:v1";

const SNAPSHOT_VERSION = 1;
/** Cap JSON size for very large histories; ISO day keys sort chronologically. */
const MAX_MARKED_DAYS_PERSISTED = 4000;

export type WorkoutCalendarMarkerSnapshotV1 = {
  v: 1;
  uid: string;
  kindsSig: string;
  savedAt: string;
  markers: Record<string, { hasStrength: boolean; hasCardio: boolean }>;
};

function isValidDayKey(s: string): s is DayKey {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function markerMapToRecord(
  map: Map<DayKey, WorkoutMarkerFlags>,
): Record<string, { hasStrength: boolean; hasCardio: boolean }> {
  const entries = [...map.entries()].filter(([k]) => isValidDayKey(k));
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const trimmed =
    entries.length > MAX_MARKED_DAYS_PERSISTED ? entries.slice(-MAX_MARKED_DAYS_PERSISTED) : entries;
  return Object.fromEntries(trimmed.map(([k, v]) => [k, { hasStrength: v.hasStrength, hasCardio: v.hasCardio }]));
}

export function markerRecordToMap(
  rec: Record<string, { hasStrength: boolean; hasCardio: boolean }>,
): Map<DayKey, WorkoutMarkerFlags> {
  const m = new Map<DayKey, WorkoutMarkerFlags>();
  for (const [k, v] of Object.entries(rec)) {
    if (!isValidDayKey(k)) continue;
    if (typeof v?.hasStrength !== "boolean" || typeof v?.hasCardio !== "boolean") continue;
    m.set(k, { hasStrength: v.hasStrength, hasCardio: v.hasCardio });
  }
  return m;
}

/**
 * Load persisted calendar markers for instant rings on repeat open / cold start (after async read).
 * Returns null if missing, malformed, uid/kinds mismatch, or empty.
 */
export async function loadWorkoutCalendarMarkerSnapshot(
  uid: string,
  kindsSig: string,
): Promise<Map<DayKey, WorkoutMarkerFlags> | null> {
  const raw = await AsyncStorage.getItem(WORKOUT_CALENDAR_MARKER_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const p = parsed as Partial<WorkoutCalendarMarkerSnapshotV1>;
    if (p.v !== SNAPSHOT_VERSION || p.uid !== uid || p.kindsSig !== kindsSig) return null;
    if (typeof p.savedAt !== "string" || !p.markers || typeof p.markers !== "object") return null;
    const map = markerRecordToMap(p.markers as Record<string, { hasStrength: boolean; hasCardio: boolean }>);
    return map.size > 0 ? map : null;
  } catch {
    return null;
  }
}

export async function persistWorkoutCalendarMarkerSnapshot(
  uid: string,
  kindsSig: string,
  map: Map<DayKey, WorkoutMarkerFlags>,
): Promise<void> {
  if (map.size === 0) {
    await AsyncStorage.removeItem(WORKOUT_CALENDAR_MARKER_CACHE_KEY);
    return;
  }
  const snapshot: WorkoutCalendarMarkerSnapshotV1 = {
    v: SNAPSHOT_VERSION,
    uid,
    kindsSig,
    savedAt: new Date().toISOString(),
    markers: markerMapToRecord(map),
  };
  await AsyncStorage.setItem(WORKOUT_CALENDAR_MARKER_CACHE_KEY, JSON.stringify(snapshot));
}

export async function clearWorkoutCalendarMarkerCache(): Promise<void> {
  await AsyncStorage.removeItem(WORKOUT_CALENDAR_MARKER_CACHE_KEY);
}
