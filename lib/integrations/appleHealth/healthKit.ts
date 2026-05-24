/**
 * Apple Health (HealthKit) client integration — W1 foundation.
 * Permission request only on explicit user action; manual sync pull (no background).
 * Uses react-native-health; iOS only.
 */

import { NativeModules, Platform } from "react-native";
import { ymdInTimeZoneFromIso } from "@/lib/time/dayKey";
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
type HealthInputOptions = {
  startDate?: string;
  endDate?: string;
  date?: string;
  limit?: number;
  anchor?: string;
  ascending?: boolean;
  /** react-native-health mass queries default to pounds when omitted (RCTAppleHealthKit+Methods_Body.m). */
  unit?: string;
};
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
  /** Miles from react-native-health anchored workout query (RCTAppleHealthKit+Queries.m uses HKUnit mileUnit). */
  distance?: number;
};

/** Matches HKUnit mileUnit in RCTAppleHealthKit+Queries.m `fetchAnchoredWorkouts`. */
const METERS_PER_MILE = 1609.344;

function distanceMetersFromNativeDistanceMiles(distanceMiles: unknown): number | null {
  if (typeof distanceMiles !== "number" || !Number.isFinite(distanceMiles) || distanceMiles <= 0) return null;
  return distanceMiles * METERS_PER_MILE;
}

function mapQueriedWorkoutToTodayWorkout(w: HKWorkoutQueriedSampleType): TodayWorkout {
  const distanceMeters = distanceMetersFromNativeDistanceMiles(w.distance);
  return {
    id: w.id ?? `${w.start}_${w.end}_${w.activityId}`,
    start: w.start,
    end: w.end,
    activityId: w.activityId,
    activityName: typeof w.activityName === "string" ? w.activityName : String(w.activityId),
    sourceId: w.sourceId ?? null,
    durationMinutes: Math.round((w.duration ?? 0) / 60),
    calories: typeof w.calories === "number" ? w.calories : 0,
    ...(distanceMeters != null ? { distanceMeters } : {}),
  };
}
type AnchoredQueryResults = { anchor: string; data: HKWorkoutQueriedSampleType[] };

type HealthKitInstance = {
  initHealthKit: (p: unknown, cb: (err: string, r: unknown) => void) => void;
  isAvailable: (cb: (err: unknown, ok: boolean) => void) => void;
  /**
   * Native `fitness_getStepCountOnDay` reads **`date`** only (ISO string). `startDate`/`endDate` are ignored.
   * Pass local start-of-calendar-day ISO from {@link getLocalCalendarDayBoundsFromYmd} `.start`.
   */
  getStepCount: (o: HealthInputOptions, cb: (err: string, r: HealthValue) => void) => void;
  getAppleExerciseTime: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getActiveEnergyBurned: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getDistanceWalkingRunning?: (
    o: HealthInputOptions,
    cb: (err: string, r: HealthValue[] | HealthValue) => void,
  ) => void;
  getHeartRateSamples?: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getRestingHeartRateSamples: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getAnchoredWorkouts: (o: HealthInputOptions & { type?: string }, cb: (err: unknown, r: AnchoredQueryResults) => void) => void;
  /**
   * Phase 2A — Generic HKSampleQuery for an arbitrary quantity type over `[startDate, endDate]`.
   * Used by {@link getStepCountForDateRange} to sum HKQuantityTypeIdentifierStepCount samples
   * for a workout window. Optional because some older bridges/mocks may not expose it.
   */
  getSamples?: (
    o: HealthInputOptions & { type: string; unit?: string },
    cb: (err: string, r: HealthValue[]) => void,
  ) => void;
  getWeightSamples?: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getBodyFatPercentageSamples?: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getBmiSamples?: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getLeanBodyMassSamples?: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getBasalEnergyBurned?: (o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void;
  getAuthStatus?: (
    input: { permissions: { read: HealthPermission[]; write: HealthPermission[] } },
    cb: (err: string, results: { permissions: { read: number[]; write: number[] } }) => void,
  ) => void;
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

/**
 * Direct NativeModules.AppleHealthKit often omits body sample helpers; react-native-health's
 * default export includes them. Bind missing methods so Body composition queries work.
 */
async function mergeBodySampleQueryMethodsFromPackage(HK: HealthKitInstance): Promise<void> {
  const keys = [
    "getWeightSamples",
    "getBodyFatPercentageSamples",
    "getBmiSamples",
    "getLeanBodyMassSamples",
    "getBasalEnergyBurned",
    "getAuthStatus",
  ] as const;
  const needsMerge = keys.some((k) => typeof HK[k] !== "function");
  if (!needsMerge) return;
  try {
    const mod = await import("react-native-health");
    const pkg = (mod.default ?? mod) as HealthKitInstance;
    for (const k of keys) {
      if (typeof HK[k] !== "function" && typeof pkg[k] === "function") {
        (HK as unknown as Record<string, unknown>)[k] = (pkg[k] as (...args: unknown[]) => unknown).bind(pkg);
      }
    }
  } catch {
    // keep HK as-is; pullBodyCompositionSamples will fail-closed per-query
  }
}

let healthKitModule: HealthKitInstance | null | undefined = undefined;

async function getHealthKit(): Promise<HealthKitInstance | null> {
  if (healthKitModule !== undefined) return healthKitModule;

  // Prefer direct native module (avoids react-native-health Object.assign losing methods)
  const nativeHK = getNativeAppleHealthKit();
  if (nativeHK) {
    console.log("[AH] using NativeModules.AppleHealthKit");
    await mergeBodySampleQueryMethodsFromPackage(nativeHK);
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
  "HeartRate",
  "DistanceWalkingRunning",
  "AppleExerciseTime",
  "ActiveEnergyBurned",
  "BodyMass",
  "BodyFatPercentage",
  "BodyMassIndex",
  "LeanBodyMass",
  "BasalEnergyBurned",
];

export type AppleHealthBodyWeightSample = {
  observedAt: string;
  sourceId: string | null;
  weightKg?: number;
  bodyFatPercent?: number;
  bmi?: number;
  leanBodyMassKg?: number;
  restingMetabolicRateKcal?: number;
};

function normalizePercent(raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  const normalized = raw <= 1 ? raw * 100 : raw;
  if (normalized < 0 || normalized > 100) return null;
  return normalized;
}

function normalizePositive(raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  if (raw <= 0) return null;
  return raw;
}

function pHealthValueArrayResult(
  fn: ((o: HealthInputOptions, cb: (err: string, r: HealthValue[]) => void) => void) | undefined,
  options: HealthInputOptions,
  label: string,
): Promise<{ ok: true; data: HealthValue[] } | { ok: false; error: string }> {
  if (typeof fn !== "function") {
    return Promise.resolve({
      ok: false,
      error: `HealthKit ${label} query is not available (missing native method).`,
    });
  }
  return new Promise((resolve) => {
    fn(options, (err: string, results: HealthValue[]) => {
      if (err) {
        resolve({ ok: false, error: `HealthKit ${label}: ${err}` });
        return;
      }
      if (!Array.isArray(results)) {
        resolve({ ok: false, error: `HealthKit ${label} returned invalid results.` });
        return;
      }
      resolve({ ok: true, data: results });
    });
  });
}

type BodyMetricMerge = Partial<{
  weightKg: number;
  bodyFatPercent: number;
  bmi: number;
  leanBodyMassKg: number;
  restingMetabolicRateKcal: number;
}>;

function upsertBodyMetric(
  out: Map<string, AppleHealthBodyWeightSample>,
  observedAt: string,
  sourceId: string | null,
  patch: BodyMetricMerge,
): void {
  const key = `${observedAt}|${sourceId ?? "healthkit"}`;
  const prev = out.get(key) ?? { observedAt, sourceId };
  out.set(key, { ...prev, ...patch });
}

function deviceTimeZoneForBodyPull(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * HealthKit returns BodyMass, body fat %, BMI, lean mass, and basal energy as separate samples
 * with different `startDate` values. `upsertBodyMetric` keys by exact timestamp, so BMI / lean /
 * RMR often sit on different rows than weight and may not ingest next to the same-day weight.
 *
 * Coalesce per **local calendar day** (device TZ) and `sourceId`:
 * - Every weight row for that day is kept (multi weigh-in days preserved).
 * - The **latest** weight row that day also receives composition fields taken from the **newest**
 *   timestamp in the day group (including composition-only samples).
 * - A day with no weight merges composition-only samples into one row (latest `observedAt`).
 */
export function coalesceAppleHealthBodySamplesForIngest(
  samples: AppleHealthBodyWeightSample[],
  timeZone: string,
): AppleHealthBodyWeightSample[] {
  if (samples.length === 0) return [];

  const groupKey = (s: AppleHealthBodyWeightSample) =>
    `${ymdInTimeZoneFromIso(s.observedAt, timeZone)}|${s.sourceId ?? "healthkit"}`;

  const groups = new Map<string, AppleHealthBodyWeightSample[]>();
  for (const s of samples) {
    const k = groupKey(s);
    const arr = groups.get(k) ?? [];
    arr.push(s);
    groups.set(k, arr);
  }

  const result: AppleHealthBodyWeightSample[] = [];

  for (const group of groups.values()) {
    const sortedAsc = [...group].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
    const latestByField: BodyMetricMerge = {};
    for (const s of sortedAsc) {
      if (s.bodyFatPercent != null) latestByField.bodyFatPercent = s.bodyFatPercent;
      if (s.bmi != null) latestByField.bmi = s.bmi;
      if (s.leanBodyMassKg != null) latestByField.leanBodyMassKg = s.leanBodyMassKg;
      if (s.restingMetabolicRateKcal != null) latestByField.restingMetabolicRateKcal = s.restingMetabolicRateKcal;
    }

    const withWeight = group.filter((s) => typeof s.weightKg === "number" && s.weightKg > 0);
    const weightsAsc = [...withWeight].sort((a, b) => a.observedAt.localeCompare(b.observedAt));

    if (weightsAsc.length === 0) {
      const anchor = sortedAsc[sortedAsc.length - 1]!;
      result.push({
        observedAt: anchor.observedAt,
        sourceId: anchor.sourceId,
        ...latestByField,
      });
      continue;
    }

    for (let i = 0; i < weightsAsc.length; i += 1) {
      const w = weightsAsc[i]!;
      const isLatestWeight = i === weightsAsc.length - 1;
      if (!isLatestWeight) {
        result.push({ ...w });
        continue;
      }
      const merged: AppleHealthBodyWeightSample = {
        observedAt: w.observedAt,
        sourceId: w.sourceId,
        weightKg: w.weightKg!,
      };
      const bf = w.bodyFatPercent ?? latestByField.bodyFatPercent;
      if (bf !== undefined) merged.bodyFatPercent = bf;
      const bmiVal = w.bmi ?? latestByField.bmi;
      if (bmiVal !== undefined) merged.bmi = bmiVal;
      const lean = w.leanBodyMassKg ?? latestByField.leanBodyMassKg;
      if (lean !== undefined) merged.leanBodyMassKg = lean;
      const rmr = w.restingMetabolicRateKcal ?? latestByField.restingMetabolicRateKcal;
      if (rmr !== undefined) merged.restingMetabolicRateKcal = rmr;
      result.push(merged);
    }
  }

  return result.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

/**
 * Options for HealthKit **body mass** samples (weight, lean body mass).
 * react-native-health defaults to **pounds** when `unit` is omitted (`RCTAppleHealthKit+Methods_Body.m`).
 * Exported for unit tests; `pullBodyCompositionSamples` uses this for weight + lean mass only.
 */
export function buildAppleHealthBodyMassSampleQueryOptions(opts: {
  startDate: string;
  endDate: string;
  limit?: number;
}): HealthInputOptions {
  return {
    startDate: opts.startDate,
    endDate: opts.endDate,
    ...(typeof opts.limit === "number" ? { limit: opts.limit } : {}),
    ascending: false,
    unit: "kg",
  };
}

export async function pullBodyCompositionSamples(opts: {
  startDate: string;
  endDate: string;
  limit?: number;
}): Promise<{ ok: true; data: AppleHealthBodyWeightSample[] } | { ok: false; error: string }> {
  const HK = await getHealthKit();
  if (!HK) {
    return { ok: false, error: "HealthKit is not available (e.g. not iOS or native module not linked)." };
  }

  const windowOpts: HealthInputOptions = {
    startDate: opts.startDate,
    endDate: opts.endDate,
    ...(typeof opts.limit === "number" ? { limit: opts.limit } : {}),
    ascending: false,
  };
  const massKgQuery = buildAppleHealthBodyMassSampleQueryOptions(opts);

  const [w, bf, bmiR, leanR, basalR] = await Promise.all([
    pHealthValueArrayResult(HK.getWeightSamples, massKgQuery, "BodyMass"),
    pHealthValueArrayResult(HK.getBodyFatPercentageSamples, windowOpts, "BodyFatPercentage"),
    pHealthValueArrayResult(HK.getBmiSamples, windowOpts, "BodyMassIndex"),
    pHealthValueArrayResult(HK.getLeanBodyMassSamples, massKgQuery, "LeanBodyMass"),
    pHealthValueArrayResult(HK.getBasalEnergyBurned, windowOpts, "BasalEnergyBurned"),
  ]);

  const parts = [w, bf, bmiR, leanR, basalR];
  const anyOk = parts.some((p) => p.ok);
  if (!anyOk) {
    const errs = parts
      .filter((p): p is { ok: false; error: string } => !p.ok)
      .map((p) => p.error);
    return { ok: false, error: errs.join(" ") || "HealthKit body queries failed." };
  }

  const weightSamples = w.ok ? w.data : [];
  const bodyFatSamples = bf.ok ? bf.data : [];
  const bmiSamples = bmiR.ok ? bmiR.data : [];
  const leanSamples = leanR.ok ? leanR.data : [];
  const basalEnergySamples = basalR.ok ? basalR.data : [];

  const out = new Map<string, AppleHealthBodyWeightSample>();
  for (const sample of weightSamples) {
    const observedAt = typeof sample?.startDate === "string" ? sample.startDate : "";
    const weightKg = normalizePositive(sample?.value);
    if (!observedAt || weightKg == null) continue;
    upsertBodyMetric(out, observedAt, null, { weightKg });
  }
  for (const sample of bodyFatSamples) {
    const observedAt = typeof sample?.startDate === "string" ? sample.startDate : "";
    const bodyFatPercent = normalizePercent(sample?.value);
    if (!observedAt || bodyFatPercent == null) continue;
    upsertBodyMetric(out, observedAt, null, { bodyFatPercent });
  }
  for (const sample of bmiSamples) {
    const observedAt = typeof sample?.startDate === "string" ? sample.startDate : "";
    const bmi = normalizePositive(sample?.value);
    if (!observedAt || bmi == null) continue;
    upsertBodyMetric(out, observedAt, null, { bmi });
  }
  for (const sample of leanSamples) {
    const observedAt = typeof sample?.startDate === "string" ? sample.startDate : "";
    const leanBodyMassKg = normalizePositive(sample?.value);
    if (!observedAt || leanBodyMassKg == null) continue;
    upsertBodyMetric(out, observedAt, null, { leanBodyMassKg });
  }
  /**
   * Do NOT map HealthKit BasalEnergyBurned directly into canonical `restingMetabolicRateKcal`.
   *
   * BasalEnergyBurned samples are interval-scoped burn values and may represent partial windows
   * (e.g. minute/hour chunks), not a validated full-day resting metabolic estimate.
   * Mapping them as daily RMR causes implausible BMR baselines (e.g. ~56 kcal/day).
   *
   * Keep the query for now to preserve permission/query surface and future explicit modeling,
   * but intentionally ignore the values at this canonical boundary.
   */
  void basalEnergySamples;

  const coalesced = coalesceAppleHealthBodySamplesForIngest([...out.values()], deviceTimeZoneForBodyPull());
  return { ok: true, data: coalesced };
}

/** Body read types for getAuthStatus (same family as body composition queries). */
const BODY_COMPOSITION_READ_TYPES: HealthPermission[] = [
  "BodyMass",
  "BodyFatPercentage",
  "BodyMassIndex",
  "LeanBodyMass",
  "BasalEnergyBurned",
];

export type BodyCompositionReadAuthStatusResult =
  | { ok: true; bodyMassStatus: number; readStatuses: number[] }
  | { ok: false; error: string };

/**
 * Read authorization status for Body composition types (react-native-health getAuthStatus).
 * Returns per-type codes in `readStatuses` (same order as BODY_COMPOSITION_READ_TYPES).
 * UI maps the full vector in TS — do not gate on index 0 alone.
 */
export async function getBodyCompositionReadAuthStatus(): Promise<BodyCompositionReadAuthStatusResult> {
  const HK = await getHealthKit();
  if (!HK) {
    return { ok: false, error: "HealthKit is not available (e.g. not iOS or native module not linked)." };
  }
  if (typeof HK.getAuthStatus !== "function") {
    return { ok: false, error: "HealthKit getAuthStatus is not available." };
  }
  return new Promise((resolve) => {
    HK.getAuthStatus!(
      { permissions: { read: BODY_COMPOSITION_READ_TYPES, write: [] } },
      (err: string, results: { permissions: { read: number[]; write: number[] } }) => {
        if (err) {
          resolve({ ok: false, error: err });
          return;
        }
        const read = results.permissions.read;
        const bodyMassStatus = typeof read[0] === "number" ? read[0]! : 0;
        resolve({ ok: true, bodyMassStatus, readStatuses: read });
      },
    );
  });
}

/**
 * Request HealthKit read permissions (includes BodyMass, body fat, BMI, lean mass, basal energy for Body).
 * Call before body sync/backfill so queries are authorized. Write: none.
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

const LOCAL_DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Start/end ISO bounds for a **local** calendar day (device timezone).
 * Matches the semantics used for Apple Health steps in anchored sync.
 */
export function getLocalCalendarDayBoundsFromYmd(dayYmd: string): { start: string; end: string; day: string } {
  if (!LOCAL_DAY_KEY_RE.test(dayYmd)) {
    throw new Error(`getLocalCalendarDayBoundsFromYmd: invalid day key "${dayYmd}"`);
  }
  const [ys, ms, ds] = dayYmd.split("-");
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    throw new Error(`getLocalCalendarDayBoundsFromYmd: invalid day key "${dayYmd}"`);
  }
  const start = new Date(y, mo - 1, d, 0, 0, 0, 0);
  const end = new Date(y, mo - 1, d, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString(), day: dayYmd };
}

/**
 * Arguments for `AppleHealthKit.getStepCount` (react-native-health iOS).
 * The bridge sums step-count samples for the **local calendar day** containing `date`
 * via `HKStatisticsOptionCumulativeSum` (full-day total, not a delta).
 */
export function buildHealthKitGetStepCountOptions(dayYmd: string): { date: string; includeManuallyAdded: boolean } {
  const { start } = getLocalCalendarDayBoundsFromYmd(dayYmd);
  return { date: start, includeManuallyAdded: true };
}

/** Shift a local calendar day key by `deltaDays` (device local calendar). */
export function addLocalCalendarDaysToDayKey(dayYmd: string, deltaDays: number): string {
  if (!LOCAL_DAY_KEY_RE.test(dayYmd)) {
    throw new Error(`addLocalCalendarDaysToDayKey: invalid day key "${dayYmd}"`);
  }
  const [ys, ms, ds] = dayYmd.split("-");
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Start and end of today in local time, ISO strings (for HealthKit date range). */
function getTodayBounds(): { startDate: string; endDate: string; day: string } {
  const { start, end, day } = getLocalCalendarDayBoundsFromYmd(getTodayDayKeyLocalInternal());
  return { startDate: start, endDate: end, day };
}

function getTodayDayKeyLocalInternal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Step total for one local calendar day via HealthKit (same query path as {@link pullTodaySnapshot}).
 */
export async function pullStepCountForLocalCalendarDay(
  dayYmd: string,
): Promise<{ ok: true; steps: number; hkEmpty?: true } | { ok: false; error: string }> {
  const HK = await getHealthKit();
  if (!HK) {
    return { ok: false, error: "HealthKit is not available (e.g. not iOS or native module not linked)." };
  }
  try {
    const r = await queryStepCountForLocalDay(HK, dayYmd);
    if (r.kind === "error") {
      return { ok: false, error: `HealthKit getStepCount: ${r.message}` };
    }
    if (r.kind === "empty") {
      /** RN Health often returns no error + empty aggregate for a day; still ingest 0 so rawEvents show `apple_health`. */
      return { ok: true, steps: 0, hkEmpty: true as const };
    }
    return { ok: true, steps: Math.max(0, r.steps) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

type StepCountQueryResult =
  | { kind: "ok"; steps: number }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/**
 * Low-level HKStatistics-style callback: distinguishes **error** vs **no aggregate** vs **numeric total**.
 * Previously we treated errors like missing data (`null`), so steps backfill skipped POST /ingest entirely.
 *
 * IMPORTANT: react-native-health `getStepCount` → `fitness_getStepCountOnDay` uses option key **`date`** only.
 * Passing only `startDate`/`endDate` leaves `date` unset, so native code defaults to **now**, and every
 * backfill day incorrectly queried **today’s** steps while still POSTing historical `payload.day` values.
 */
function queryStepCountForLocalDay(HK: HealthKitInstance, dayYmd: string): Promise<StepCountQueryResult> {
  const opts = buildHealthKitGetStepCountOptions(dayYmd);
  return new Promise((resolve) => {
    HK.getStepCount(opts, (err: string, result: HealthValue) => {
      if (err != null && String(err).trim() !== "") {
        resolve({ kind: "error", message: String(err) });
        return;
      }
      if (result == null || typeof result.value !== "number" || !Number.isFinite(result.value)) {
        resolve({ kind: "empty" });
        return;
      }
      resolve({ kind: "ok", steps: result.value });
    });
  });
}

async function pStepCount(HK: HealthKitInstance, dayYmd: string): Promise<number | null> {
  const r = await queryStepCountForLocalDay(HK, dayYmd);
  if (r.kind === "error") {
    if (__DEV__ && !process.env.JEST_WORKER_ID) {
      // eslint-disable-next-line no-console
      console.warn("[AH] getStepCount error", { dayYmd, message: r.message });
    }
    return null;
  }
  if (r.kind === "empty") return null;
  return r.steps;
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

function pDistanceWalkingRunning(HK: HealthKitInstance, startDate: string, endDate: string): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof HK.getDistanceWalkingRunning !== "function") {
      resolve(null);
      return;
    }
    HK.getDistanceWalkingRunning({ startDate, endDate }, (err: string, results: HealthValue[] | HealthValue) => {
      if (err) {
        resolve(null);
        return;
      }
      const rows = Array.isArray(results) ? results : [results];
      const total = rows.reduce((sum, r) => sum + (typeof r.value === "number" ? r.value : 0), 0);
      resolve(Number.isFinite(total) && total > 0 ? total : null);
    });
  });
}

async function enrichWorkoutsWithHeartRate(
  HK: HealthKitInstance,
  workouts: TodayWorkout[],
): Promise<TodayWorkout[]> {
  if (typeof HK.getHeartRateSamples !== "function" || workouts.length === 0) {
    return workouts;
  }
  const out = await Promise.all(
    workouts.map(
      async (w): Promise<TodayWorkout> =>
        new Promise((resolve) => {
          HK.getHeartRateSamples?.(
            { startDate: w.start, endDate: w.end },
            (err: string, results: HealthValue[]) => {
              if (err || !Array.isArray(results) || results.length === 0) {
                resolve(w);
                return;
              }
              const values = results
                .map((s) => (typeof s.value === "number" && Number.isFinite(s.value) ? s.value : null))
                .filter((v): v is number => v != null && v > 0);
              if (values.length === 0) {
                resolve(w);
                return;
              }
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              const max = values.reduce((a, b) => (b > a ? b : a), values[0] ?? 0);
              resolve({
                ...w,
                ...(Number.isFinite(avg) ? { averageHeartRateBpm: Math.round(avg) } : {}),
                ...(Number.isFinite(max) ? { maxHeartRateBpm: Math.round(max) } : {}),
              });
            },
          );
        }),
    ),
  );
  return out;
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
      const list = (result.data as HKWorkoutQueriedSampleType[]).slice(0, limit).map(mapQueriedWorkoutToTodayWorkout);
      void enrichWorkoutsWithHeartRate(HK, list).then(resolve);
    });
  });
}

const TODAY_WORKOUTS_LIMIT = 10;

/**
 * Phase 2A — Pure aggregator for the native HealthKit step-sample bridge response.
 *
 * `react-native-health`'s `getSamples` (`fitness_getSamples` →
 * `fetchSamplesOfType` → `HKSampleQuery`) serializes each step sample as
 * `{ quantity: <number>, start: ..., end: ..., sourceId: ..., ... }`. The
 * package's TS typings (`HealthValue.value`) do **not** match the actual
 * native dict shape — historical reads of `sample.value` always resolved
 * `undefined`, so every workout's `payload.steps` was 0.
 *
 * Aggregation rules (fail-closed):
 * - Prefer `sample.quantity`; fall back to `sample.value` for future/native variance.
 *   Never double-count: each sample contributes at most one value.
 * - Returns `null` for: `null`/`undefined`/non-array input, empty array, or no
 *   sample with a finite non-negative numeric quantity/value.
 * - Returns `0` only when at least one sample carried a valid numeric `0`.
 * - Rounds the final sum to an integer.
 */
export function sumStepSamplesFromNativeBridgeResult(
  results: unknown,
): number | null {
  if (!Array.isArray(results)) return null;
  if (results.length === 0) return null;

  let total = 0;
  let validNumericCount = 0;
  for (const sample of results) {
    if (sample == null || typeof sample !== "object") continue;
    const s = sample as Record<string, unknown>;
    const q = s["quantity"];
    const v = s["value"];
    let chosen: number | null = null;
    if (typeof q === "number" && Number.isFinite(q) && q >= 0) {
      chosen = q;
    } else if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      chosen = v;
    }
    if (chosen == null) continue;
    total += chosen;
    validNumericCount += 1;
  }

  if (validNumericCount === 0) return null;
  if (!Number.isFinite(total) || total < 0) return null;
  return Math.round(total);
}

/**
 * Phase 2A — Sum of HealthKit step samples over an arbitrary `[startDate, endDate]` window.
 * Used to enrich anchored workouts with their per-workout step total
 * (see {@link runAnchoredWorkoutsSync}).
 *
 * Implementation notes:
 * - Uses the generic HKSampleQuery exposed by react-native-health as `getSamples` with
 *   `type: "StepCount"`. Native code returns per-sample `{ quantity, start, end, ... }`
 *   (the `valueType` dict key is `"quantity"` for `HKUnit countUnit`).
 * - Aggregation is delegated to {@link sumStepSamplesFromNativeBridgeResult} for testability.
 * - Returns `null` (fail-closed) on:
 *   - non-iOS / native module unavailable
 *   - missing `getSamples` bridge method
 *   - native error
 *   - non-array / empty / no valid numeric samples
 * - Never invents a value from duration/calories/distance.
 */
export async function getStepCountForDateRange(
  startDate: string,
  endDate: string,
): Promise<number | null> {
  if (typeof startDate !== "string" || startDate.length === 0) return null;
  if (typeof endDate !== "string" || endDate.length === 0) return null;
  const HK = await getHealthKit();
  if (!HK) return null;
  if (typeof HK.getSamples !== "function") return null;

  return new Promise<number | null>((resolve) => {
    try {
      HK.getSamples!(
        { startDate, endDate, type: "StepCount", ascending: true },
        (err: string, results: HealthValue[]) => {
          if (err != null && String(err).trim() !== "") {
            if (__DEV__ && !process.env.JEST_WORKER_ID) {
              // eslint-disable-next-line no-console
              console.warn("[AH] getStepCountForDateRange error", { startDate, endDate, message: String(err) });
            }
            resolve(null);
            return;
          }
          if (__DEV__ && !process.env.JEST_WORKER_ID) {
            try {
              const arr = Array.isArray(results) ? results : null;
              const first = (arr && arr[0]) as Record<string, unknown> | undefined;
              const sumByValueKey = (arr ?? []).reduce((acc, s) => {
                const v = (s as unknown as { value?: unknown }).value;
                return typeof v === "number" && Number.isFinite(v) && v >= 0 ? acc + v : acc;
              }, 0);
              const sumByQuantityKey = (arr ?? []).reduce((acc, s) => {
                const q = (s as unknown as { quantity?: unknown }).quantity;
                return typeof q === "number" && Number.isFinite(q) && q >= 0 ? acc + q : acc;
              }, 0);
              // eslint-disable-next-line no-console
              console.log("[AH][STEP_ENRICH]", {
                startDate,
                endDate,
                resultCount: arr ? arr.length : null,
                firstSampleKeys: first ? Object.keys(first) : null,
                sumByValueKey,
                sumByQuantityKey,
              });
            } catch {
              // never block on diagnostic
            }
          }
          resolve(sumStepSamplesFromNativeBridgeResult(results));
        },
      );
    } catch (e) {
      if (__DEV__ && !process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.warn("[AH] getStepCountForDateRange threw", e);
      }
      resolve(null);
    }
  });
}

/**
 * P0 DIAGNOSTIC ONLY — Probe the native HealthKit step query for a workout window.
 *
 * Mirrors the production call (`HK.getSamples({ type: "StepCount", startDate, endDate })`)
 * three times: exact window, ±5 min, ±30 min — plus a fourth full-day
 * cumulative-sum call (`HK.getStepCount({ date })`) as a sanity reference.
 *
 * Returns the *raw* native dict for each sample so callers can verify field names
 * (`value` vs `quantity`, `startDate` vs `start`, etc.) and confirm whether samples
 * exist at all. Never throws; never mutates DailyFacts; never affects allocation.
 */
export type DiagnoseStepWindowEntry = {
  label: "exact" | "+/-5min" | "+/-30min";
  requestStartDate: string;
  requestEndDate: string;
  error: string | null;
  sampleCount: number | null;
  sumByValueKey: number;
  sumByQuantityKey: number;
  firstSampleKeys: string[] | null;
  samples: Record<string, unknown>[] | null;
};

export type DiagnoseStepWindowResult = {
  inputs: { startDate: string; endDate: string };
  nativeAvailable: boolean;
  hasGetSamples: boolean;
  windows: DiagnoseStepWindowEntry[];
  fullDayCumulativeSum: {
    requestedDate: string;
    error: string | null;
    value: number | null;
    rawResponse: Record<string, unknown> | null;
  } | null;
};

const STEP_WINDOW_OFFSETS_MS = {
  exact: 0,
  "+/-5min": 5 * 60 * 1000,
  "+/-30min": 30 * 60 * 1000,
} as const;

function widenIso(iso: string, deltaMs: number, direction: "earlier" | "later"): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const shifted = direction === "earlier" ? t - deltaMs : t + deltaMs;
  return new Date(shifted).toISOString();
}

export async function diagnoseStepCountForWindow(
  startDate: string,
  endDate: string,
): Promise<DiagnoseStepWindowResult> {
  const HK = await getHealthKit();
  const nativeAvailable = HK != null;
  const hasGetSamples = HK != null && typeof HK.getSamples === "function";

  const queryOnce = (s: string, e: string): Promise<DiagnoseStepWindowEntry> =>
    new Promise((resolve) => {
      const entry: DiagnoseStepWindowEntry = {
        label: "exact",
        requestStartDate: s,
        requestEndDate: e,
        error: null,
        sampleCount: null,
        sumByValueKey: 0,
        sumByQuantityKey: 0,
        firstSampleKeys: null,
        samples: null,
      };
      if (!hasGetSamples) {
        entry.error = "getSamples not available on native bridge";
        resolve(entry);
        return;
      }
      try {
        HK!.getSamples!(
          { startDate: s, endDate: e, type: "StepCount", ascending: true },
          (err: string, results: HealthValue[]) => {
            if (err != null && String(err).trim() !== "") {
              entry.error = String(err);
              resolve(entry);
              return;
            }
            if (!Array.isArray(results)) {
              entry.error = "non-array result";
              resolve(entry);
              return;
            }
            entry.sampleCount = results.length;
            const cleaned: Record<string, unknown>[] = [];
            for (const sample of results) {
              const s2 = sample as unknown as Record<string, unknown>;
              const v = s2["value"];
              const q = s2["quantity"];
              if (typeof v === "number" && Number.isFinite(v) && v >= 0) entry.sumByValueKey += v;
              if (typeof q === "number" && Number.isFinite(q) && q >= 0) entry.sumByQuantityKey += q;
              cleaned.push(s2);
            }
            entry.firstSampleKeys = cleaned[0] ? Object.keys(cleaned[0]) : null;
            entry.samples = cleaned.slice(0, 20);
            resolve(entry);
          },
        );
      } catch (e) {
        entry.error = e instanceof Error ? e.message : String(e);
        resolve(entry);
      }
    });

  const exact = await queryOnce(startDate, endDate);
  exact.label = "exact";
  const w5 = await queryOnce(
    widenIso(startDate, STEP_WINDOW_OFFSETS_MS["+/-5min"], "earlier"),
    widenIso(endDate, STEP_WINDOW_OFFSETS_MS["+/-5min"], "later"),
  );
  w5.label = "+/-5min";
  const w30 = await queryOnce(
    widenIso(startDate, STEP_WINDOW_OFFSETS_MS["+/-30min"], "earlier"),
    widenIso(endDate, STEP_WINDOW_OFFSETS_MS["+/-30min"], "later"),
  );
  w30.label = "+/-30min";

  let fullDay: DiagnoseStepWindowResult["fullDayCumulativeSum"] = null;
  if (HK && typeof HK.getStepCount === "function") {
    fullDay = await new Promise((resolve) => {
      try {
        HK.getStepCount({ date: startDate }, (err: string, result: HealthValue) => {
          if (err != null && String(err).trim() !== "") {
            resolve({ requestedDate: startDate, error: String(err), value: null, rawResponse: null });
            return;
          }
          const r = result as unknown as Record<string, unknown>;
          const v = r?.["value"];
          resolve({
            requestedDate: startDate,
            error: null,
            value: typeof v === "number" && Number.isFinite(v) ? v : null,
            rawResponse: r ?? null,
          });
        });
      } catch (e) {
        resolve({
          requestedDate: startDate,
          error: e instanceof Error ? e.message : String(e),
          value: null,
          rawResponse: null,
        });
      }
    });
  }

  const result: DiagnoseStepWindowResult = {
    inputs: { startDate, endDate },
    nativeAvailable,
    hasGetSamples,
    windows: [exact, w5, w30],
    fullDayCumulativeSum: fullDay,
  };

  if (__DEV__ && !process.env.JEST_WORKER_ID) {
    // eslint-disable-next-line no-console
    console.log("[AH][P0_STEP_DIAGNOSE]", JSON.stringify(result, null, 2));
  }
  return result;
}

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
      const list = (result.data ?? []).slice(0, opts.limit).map(mapQueriedWorkoutToTodayWorkout);
      void enrichWorkoutsWithHeartRate(HK, list).then((enriched) =>
        resolve({ ok: true, data: { workouts: enriched, anchor: result.anchor } }),
      );
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
        const list = (r.data ?? []).slice(0, opts.limit).map(mapQueriedWorkoutToTodayWorkout);
        void enrichWorkoutsWithHeartRate(HK, list).then((enriched) =>
          resolve({ ok: true, data: { workouts: enriched, anchor: r.anchor } }),
        );
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
    pStepCount(HK, day),
    pDistanceWalkingRunning(HK, startDate, endDate),
    pAppleExerciseTime(HK, startDate, endDate),
    pActiveEnergyBurned(HK, startDate, endDate),
    pRestingHeartRateSamples(HK, startDate, endDate),
    pAnchoredWorkouts(HK, startDate, endDate, TODAY_WORKOUTS_LIMIT),
  ])
    .then(([steps, walkingRunningDistanceMeters, exerciseMinutes, activeEnergyKcal, restingHrSample, workouts]) => {
      const data: TodaySnapshot = {
        day,
        steps: steps ?? null,
        walkingRunningDistanceMeters: walkingRunningDistanceMeters ?? null,
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
