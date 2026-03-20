import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type WorkoutOverrideType = "strength" | "cardio" | "other";

export type WorkoutOverride = {
  workoutId: string;
  customTitle?: string;
  correctedDurationMinutes?: number;
  correctedWorkoutType?: WorkoutOverrideType;
  updatedAt: string;
};

export type WorkoutOverridePatch = {
  customTitle?: string;
  correctedDurationMinutes?: number;
  correctedWorkoutType?: WorkoutOverrideType;
};

const WORKOUT_OVERRIDES_KEY = "workouts:overrides:v1";

type WorkoutOverrideStore = Record<string, WorkoutOverride>;

async function readStore(): Promise<WorkoutOverrideStore> {
  const raw = await AsyncStorage.getItem(WORKOUT_OVERRIDES_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as WorkoutOverrideStore;
  } catch {
    return {};
  }
}

async function writeStore(store: WorkoutOverrideStore): Promise<void> {
  await AsyncStorage.setItem(WORKOUT_OVERRIDES_KEY, JSON.stringify(store));
}

export async function listWorkoutOverrides(): Promise<WorkoutOverrideStore> {
  return readStore();
}

export async function getWorkoutOverride(workoutId: string): Promise<WorkoutOverride | null> {
  const store = await readStore();
  return store[workoutId] ?? null;
}

export async function setWorkoutOverride(
  workoutId: string,
  patch: WorkoutOverridePatch,
): Promise<WorkoutOverride> {
  const store = await readStore();
  const prev = store[workoutId];
  const next: WorkoutOverride = {
    workoutId,
    ...(prev ?? {}),
    ...(patch.customTitle !== undefined ? { customTitle: patch.customTitle } : {}),
    ...(patch.correctedDurationMinutes !== undefined
      ? { correctedDurationMinutes: patch.correctedDurationMinutes }
      : {}),
    ...(patch.correctedWorkoutType !== undefined
      ? { correctedWorkoutType: patch.correctedWorkoutType }
      : {}),
    updatedAt: new Date().toISOString(),
  };
  store[workoutId] = next;
  await writeStore(store);
  return next;
}

export async function clearWorkoutOverride(workoutId: string): Promise<void> {
  const store = await readStore();
  if (!(workoutId in store)) return;
  delete store[workoutId];
  await writeStore(store);
}

export function useWorkoutOverrides(workoutIds: string[]) {
  const [store, setStore] = useState<WorkoutOverrideStore>({});
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const all = await listWorkoutOverrides();
    setStore(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const byId = useMemo(() => {
    const out: Record<string, WorkoutOverride | undefined> = {};
    for (const id of workoutIds) out[id] = store[id];
    return out;
  }, [store, workoutIds]);

  const saveOverride = useCallback(
    async (workoutId: string, patch: WorkoutOverridePatch) => {
      const next = await setWorkoutOverride(workoutId, patch);
      setStore((prev) => ({ ...prev, [workoutId]: next }));
      return next;
    },
    [],
  );

  return { loaded, overridesByWorkoutId: byId, saveOverride, reload };
}
