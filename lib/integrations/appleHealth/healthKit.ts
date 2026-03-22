/**
 * Apple Health (HealthKit) client integration — W1 foundation.
 * Permission request only on explicit user action; manual sync pull (no background).
 * Uses react-native-health; iOS only.
 */

import { NativeModules, Platform } from "react-native";
import type { HealthKitPermissionResult, TodaySnapshot, TodayWorkout } from "./types";

/**
 * react-native-health parses dates with NSDateFormatter `yyyy-MM-dd'T'HH:mm:ss.SSSZ`.
 * `Date.toISOString()` matches that shape; keep a single helper for call sites.
 */
export function toHealthKitIso8601(d: Date): string {
  return d.toISOString();
}

function minIsoStart(workouts: { start: string }[]): string | null {
  if (workouts.length === 0) return null;
  let best = workouts[0]!.start;
  for (let i = 1; i < workouts.length; i++) {
    const s = workouts[i]!.start;
    if (s < best) best = s;
  }
  return best;
}

function maxIsoStart(workouts: { start: string }[]): string | null {
  if (workouts.length === 0) return null;
  let best = workouts[0]!.start;
  for (let i = 1; i < workouts.length; i++) {
    const s = workouts[i]!.start;
    if (s > best) best = s;
  }
  return best;
}

type HealthPermission = string;
type HealthInputOptions = { startDate?: string; endDate?: string; date?: string; limit?: number; anchor?: string };
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

type MaybeNativeHK = {
  isAvailable?: unknown;
  initHealthKit?: unknown;
  getStepCount?: unknown;
  getAppleExerciseTime?: unknown;
  getActiveEnergyBurned?: unknown;
  getRestingHeartRateSamples?: unknown;
  getAnchoredWorkouts?: unknown;
};

function isFn(v: unknown): v is (...args: unknown[]) => unknown {
  return typeof v === "function";
}

function getNativeAppleHealthKit(): HealthKitInstance | null {
  if (Platform.OS !== "ios") return null;
  const nm = NativeModules as unknown as Record<string, unknown>;
  const raw = nm["AppleHealthKit"] as unknown;
  const hk = raw as MaybeNativeHK | null;

  if (!hk) return null;

  const ok =
    isFn(hk.isAvailable) &&
    isFn(hk.initHealthKit) &&
    isFn(hk.getStepCount) &&
    isFn(hk.getAnchoredWorkouts);

  if (!ok) {
    console.log("[AH] NativeModules.AppleHealthKit missing required methods", {
      hasIsAvailable: isFn(hk.isAvailable),
      hasInitHealthKit: isFn(hk.initHealthKit),
      hasGetStepCount: isFn(hk.getStepCount),
      hasGetAnchoredWorkouts: isFn(hk.getAnchoredWorkouts),
    });
    return null;
  }

  return raw as HealthKitInstance;
}

let healthKitModule: HealthKitInstance | null | undefined = undefined;

async function getHealthKit(): Promise<HealthKitInstance | null> {
  if (healthKitModule !== undefined) return healthKitModule;

  // Prefer direct native module (avoids react-native-health Object.assign losing methods)
  const nativeHK = getNativeAppleHealthKit();
  if (nativeHK) {
    console.log("[AH] using NativeModules.AppleHealthKit");
    healthKitModule = nativeHK;
    return healthKitModule;
  }

  // Fallback: dynamic import (kept for completeness; may be broken under TurboModules)
  try {
    const mod = await import("react-native-health");
    const AppleHealthKit = ((mod as { default?: HealthKitInstance }).default ?? mod) as HealthKitInstance;
    console.log("[AH] module has isAvailable", typeof AppleHealthKit.isAvailable);
    healthKitModule = AppleHealthKit;
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
      if (err) console.log("[AH] isAvailable error", String(err));
      console.log("[AH] isAvailable available", available);
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
 * Pull workouts using anchored query (incremental sync). Call with anchor from previous run or null for first run.
 * Returns new anchor to persist only after successful ingest (caller responsibility).
 */
export async function pullAnchoredWorkouts(opts: {
  anchor?: string | null;
  limit: number;
}): Promise<
  | { ok: true; data: { workouts: TodayWorkout[]; anchor: string } }
  | { ok: false; error: string }
> {
  const HK = await getHealthKit();
  if (!HK) {
    return { ok: false, error: "HealthKit is not available (e.g. not iOS or native module not linked)." };
  }
  return new Promise((resolve) => {
    const options: HealthInputOptions & { type?: string } = {
      limit: opts.limit,
      type: "Workout",
    };
    if (opts.anchor != null && opts.anchor !== "") {
      options.anchor = opts.anchor;
    }
    HK.getAnchoredWorkouts(options, (err: unknown, result: AnchoredQueryResults) => {
      if (err) {
        resolve({ ok: false, error: err != null ? String(err) : "Anchored workouts query failed." });
        return;
      }
      if (!result?.anchor || typeof result.anchor !== "string") {
        resolve({ ok: false, error: "Anchored workouts response missing anchor." });
        return;
      }
      const list = (result.data ?? []).slice(0, opts.limit).map((w: HKWorkoutQueriedSampleType) => ({
        id: w.id ?? `${w.start}_${w.end}_${w.activityId}`,
        start: w.start,
        end: w.end,
        activityId: w.activityId,
        activityName: typeof w.activityName === "string" ? w.activityName : String(w.activityId),
        sourceId: w.sourceId ?? null,
        durationMinutes: Math.round((w.duration ?? 0) / 60),
        calories: typeof w.calories === "number" ? w.calories : 0,
      }));
      resolve({ ok: true, data: { workouts: list, anchor: result.anchor } });
    });
  });
}

export async function pullWorkoutsByDateRange(opts: {
  startDate: string;
  endDate: string;
  limit: number;
  maxPages?: number;
}): Promise<
  | { ok: true; data: { workouts: TodayWorkout[]; pagesFetched: number; truncated: boolean } }
  | { ok: false; error: string }
> {
  const HK = await getHealthKit();
  const nativeMethodPresent = HK != null && typeof HK.getAnchoredWorkouts === "function";

  if (__DEV__ && !process.env.JEST_WORKER_ID) {
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_BOOTSTRAP_DEBUG] native-date-range-fetch-entry", {
      platform: Platform.OS,
      nativeModulePresent: HK != null,
      nativeGetAnchoredWorkouts: nativeMethodPresent,
      requestedStartDate: opts.startDate,
      requestedEndDate: opts.endDate,
      limit: opts.limit,
      maxPages: opts.maxPages ?? 72,
    });
  }

  if (!HK) {
    return { ok: false, error: "HealthKit is not available (e.g. not iOS or native module not linked)." };
  }

  const maxPages = Math.max(1, opts.maxPages ?? 72);
  const all: TodayWorkout[] = [];
  const seen = new Set<string>();
  let pagesFetched = 0;
  let anchor: string | null = null;
  let truncated = false;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await new Promise<
      { ok: true; data: { workouts: TodayWorkout[]; anchor: string } } | { ok: false; error: string }
    >((resolve) => {
      const queryOpts: HealthInputOptions & { type?: string } = {
        startDate: opts.startDate,
        endDate: opts.endDate,
        limit: opts.limit,
        type: "Workout",
      };
      if (anchor) queryOpts.anchor = anchor;
      HK.getAnchoredWorkouts(queryOpts, (err: unknown, r: AnchoredQueryResults) => {
        if (err) {
          resolve({ ok: false, error: err != null ? String(err) : "Date-range workouts query failed." });
          return;
        }
        if (!r?.anchor || typeof r.anchor !== "string") {
          resolve({ ok: false, error: "Date-range workouts response missing anchor." });
          return;
        }
        const list = (r.data ?? []).slice(0, opts.limit).map((w: HKWorkoutQueriedSampleType) => ({
          id: w.id ?? `${w.start}_${w.end}_${w.activityId}`,
          start: w.start,
          end: w.end,
          activityId: w.activityId,
          activityName: typeof w.activityName === "string" ? w.activityName : String(w.activityId),
          sourceId: w.sourceId ?? null,
          durationMinutes: Math.round((w.duration ?? 0) / 60),
          calories: typeof w.calories === "number" ? w.calories : 0,
        }));
        resolve({ ok: true, data: { workouts: list, anchor: r.anchor } });
      });
    });

    if (!result.ok) {
      if (__DEV__ && !process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.log("[WORKOUT_BOOTSTRAP_DEBUG] native-date-range-fetch-error", {
          page: page + 1,
          error: result.error,
        });
      }
      return result;
    }
    pagesFetched += 1;
    anchor = result.data.anchor;

    for (const workout of result.data.workouts) {
      const key = `${workout.id}:${workout.start}:${workout.end}:${workout.activityId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(workout);
    }

    if (__DEV__ && !process.env.JEST_WORKER_ID) {
      // eslint-disable-next-line no-console
      console.log("[WORKOUT_BOOTSTRAP_DEBUG] native-date-range-fetch-page", {
        pageNumber: pagesFetched,
        pageSampleCount: result.data.workouts.length,
        cumulativeUniqueCount: all.length,
        pageEarliestStart: minIsoStart(result.data.workouts),
        pageLatestStart: maxIsoStart(result.data.workouts),
        cumulativeEarliestStart: minIsoStart(all),
        cumulativeLatestStart: maxIsoStart(all),
      });
    }

    if (result.data.workouts.length < opts.limit) {
      if (__DEV__ && !process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.log("[WORKOUT_BOOTSTRAP_DEBUG] native-date-range-fetch-done", {
          pagesFetched,
          truncated: false,
          totalUniqueWorkouts: all.length,
          earliestWorkoutStart: minIsoStart(all),
          latestWorkoutStart: maxIsoStart(all),
        });
      }
      return {
        ok: true,
        data: { workouts: all, pagesFetched, truncated: false },
      };
    }
  }

  truncated = true;
  if (__DEV__ && !process.env.JEST_WORKER_ID) {
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_BOOTSTRAP_DEBUG] native-date-range-fetch-done", {
      pagesFetched,
      truncated: true,
      totalUniqueWorkouts: all.length,
      earliestWorkoutStart: minIsoStart(all),
      latestWorkoutStart: maxIsoStart(all),
    });
  }
  return {
    ok: true,
    data: { workouts: all, pagesFetched, truncated },
  };
}

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
