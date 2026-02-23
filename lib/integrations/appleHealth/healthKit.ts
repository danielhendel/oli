/**
 * Apple Health (HealthKit) client integration — W1 foundation.
 * Permission request only on explicit user action; manual sync pull (no background).
 * Uses react-native-health; iOS only.
 */

import type { HealthKitPermissionResult, TodaySnapshot, TodayWorkout } from "./types";

type HealthPermission = string;
type HealthInputOptions = { startDate?: string; endDate?: string; date?: string; limit?: number };
type HealthValue = { value: number; startDate?: string; endDate?: string; id?: string };
type HKWorkoutQueriedSampleType = {
  id?: string;
  start: string;
  end: string;
  activityId: number;
  activityName: string;
  sourceId?: string;
  duration: number;
  calories: number;
};
type AnchoredQueryResults = { anchor: string; data: HKWorkoutQueriedSampleType[] };

type HealthKitInstance = {
  initHealthKit: (p: unknown, cb: (err: string, r: unknown) => void) => void;
  isAvailable: (cb: (err: unknown, ok: boolean) => void) => void;
  getStepCount: (o: HealthInputOptions, cb: (err: string, r: HealthValue) => void) => void;
  getAppleExerciseTime: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getActiveEnergyBurned: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getRestingHeartRateSamples: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getAnchoredWorkouts: (o: HealthInputOptions & { type?: string }, cb: (err: unknown, r: AnchoredQueryResults) => void) => void;
};

let healthKitModule: HealthKitInstance | null | undefined = undefined;

async function getHealthKit(): Promise<HealthKitInstance | null> {
  if (healthKitModule !== undefined) return healthKitModule;
  try {
    const m = await import("react-native-health");
    healthKitModule = (m.default ?? null) as HealthKitInstance | null;
  } catch {
    healthKitModule = null;
  }
  return healthKitModule;
}

function promiseFromInit(cb: (resolve: (r: HealthKitPermissionResult) => void, reject: (e: Error) => void) => void): Promise<HealthKitPermissionResult> {
  return new Promise((resolve, reject) => {
    cb(resolve, reject);
  });
}

/** W1 read permissions: steps, workouts, resting heart rate, apple exercise time, active energy. Write: none. */
const W1_READ_PERMISSIONS: HealthPermission[] = [
  "StepCount",
  "Workout",
  "RestingHeartRate",
  "AppleExerciseTime",
  "ActiveEnergyBurned",
];

/**
 * Request HealthKit permissions. Call only on explicit user action.
 * Read: steps, workouts, resting heart rate, apple exercise time, active energy.
 * Write: none.
 */
export async function requestPermissions(): Promise<HealthKitPermissionResult> {
  const HK = await getHealthKit();
  if (!HK) {
    return { ok: false, error: "HealthKit is not available (e.g. not iOS or native module not linked)." };
  }

  return promiseFromInit((resolve) => {
    HK.isAvailable((err: unknown, available: boolean) => {
      if (err || !available) {
        resolve({ ok: false, error: err != null ? String(err) : "HealthKit is not available on this device." });
        return;
      }
      HK.initHealthKit(
        {
          permissions: {
            read: W1_READ_PERMISSIONS,
            write: [],
          },
        },
        (error: string) => {
          if (error) {
            resolve({ ok: false, error });
            return;
          }
          resolve({ ok: true });
        },
      );
    });
  });
}

/** Start and end of today in local time, ISO strings (for HealthKit date range). */
function getTodayBounds(): { startDate: string; endDate: string; day: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d, 23, 59, 59, 999);
  const day = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    day,
  };
}

function pStepCount(HK: HealthKitInstance, startDate: string, endDate: string): Promise<number | null> {
  return new Promise((resolve) => {
    HK.getStepCount({ startDate, endDate }, (err: string, result: HealthValue) => {
      if (err || result == null) {
        resolve(null);
        return;
      }
      const v = typeof result.value === "number" ? result.value : null;
      resolve(v);
    });
  });
}

function pAppleExerciseTime(HK: HealthKitInstance, startDate: string, endDate: string): Promise<number | null> {
  return new Promise((resolve) => {
    HK.getAppleExerciseTime({ startDate, endDate }, (err: string, results: HealthValue[]) => {
      if (err || !Array.isArray(results)) {
        resolve(null);
        return;
      }
      const total = results.reduce((sum, r) => sum + (typeof r.value === "number" ? r.value : 0), 0);
      resolve(total);
    });
  });
}

function pActiveEnergyBurned(HK: HealthKitInstance, startDate: string, endDate: string): Promise<number | null> {
  return new Promise((resolve) => {
    HK.getActiveEnergyBurned({ startDate, endDate }, (err: string, results: HealthValue[]) => {
      if (err || !Array.isArray(results)) {
        resolve(null);
        return;
      }
      const total = results.reduce((sum, r) => sum + (typeof r.value === "number" ? r.value : 0), 0);
      resolve(total);
    });
  });
}

function pRestingHeartRateSamples(HK: HealthKitInstance, startDate: string, endDate: string): Promise<HealthValue | null> {
  return new Promise((resolve) => {
    HK.getRestingHeartRateSamples({ startDate, endDate }, (err: string, results: HealthValue[]) => {
      if (err || !Array.isArray(results) || results.length === 0) {
        resolve(null);
        return;
      }
      const sorted = [...results].sort((a, b) => {
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0;
        return bEnd - aEnd;
      });
      resolve(sorted[0] ?? null);
    });
  });
}

function pAnchoredWorkouts(HK: HealthKitInstance, startDate: string, endDate: string, limit: number): Promise<TodayWorkout[]> {
  return new Promise((resolve) => {
    HK.getAnchoredWorkouts({ startDate, endDate, limit, type: "Workout" }, (err: unknown, result: AnchoredQueryResults) => {
      if (err || !result?.data) {
        resolve([]);
        return;
      }
      const list = (result.data as HKWorkoutQueriedSampleType[]).slice(0, limit).map((w) => ({
        id: w.id ?? `${w.start}_${w.end}_${w.activityId}`,
        start: w.start,
        end: w.end,
        activityId: w.activityId,
        activityName: typeof w.activityName === "string" ? w.activityName : String(w.activityId),
        sourceId: w.sourceId ?? null,
        durationMinutes: Math.round((w.duration ?? 0) / 60),
        calories: typeof w.calories === "number" ? w.calories : 0,
      }));
      resolve(list);
    });
  });
}

const TODAY_WORKOUTS_LIMIT = 10;

/**
 * Pull today snapshot: steps, exercise minutes, active energy, resting HR, recent workouts.
 * Manual sync only (no background). Call after permissions granted.
 */
export async function pullTodaySnapshot(): Promise<{ ok: true; data: TodaySnapshot } | { ok: false; error: string }> {
  const HK = await getHealthKit();
  if (!HK) {
    return { ok: false, error: "HealthKit is not available (e.g. not iOS or native module not linked)." };
  }

  const { startDate, endDate, day } = getTodayBounds();

  return Promise.all([
    pStepCount(HK, startDate, endDate),
    pAppleExerciseTime(HK, startDate, endDate),
    pActiveEnergyBurned(HK, startDate, endDate),
    pRestingHeartRateSamples(HK, startDate, endDate),
    pAnchoredWorkouts(HK, startDate, endDate, TODAY_WORKOUTS_LIMIT),
  ])
    .then(([steps, exerciseMinutes, activeEnergyKcal, restingHrSample, workouts]) => {
      const data: TodaySnapshot = {
        day,
        steps: steps ?? null,
        exerciseMinutes: exerciseMinutes ?? null,
        activeEnergyKcal: activeEnergyKcal ?? null,
        restingHeartRateBpm: restingHrSample != null && typeof restingHrSample.value === "number" ? restingHrSample.value : null,
        workouts,
      };
      return { ok: true as const, data };
    })
    .catch((e) => ({
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    }));
}
