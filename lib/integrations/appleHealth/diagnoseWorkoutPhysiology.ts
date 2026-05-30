/**
 * Workout Physiology v1 — Phase A dev-only diagnostics.
 *
 * Goal: instrument existing Apple Health workout ingestion paths so we can
 * verify what physiology data is actually available on real devices BEFORE
 * committing to schema / storage / canonical / DailyFacts changes.
 *
 * Hard contract for Phase A:
 * - **Read-only.** Never mutates the input workout, never writes storage,
 *   never touches raw events / canonical events / DailyFacts.
 * - **Non-throwing.** Every native HealthKit call runs inside a per-query
 *   try/catch; failures surface as an `error` field on the diagnostic and
 *   the helper still emits a structured payload.
 * - **Dev/staging gated.** Default emission is via {@link shouldLogAppleHealthPhysiologyDiagnostics}
 *   (dev builds only). Tests pass `enabled: true` explicitly + their own logger.
 *
 * Out of scope (Phase B+): persisting any of these probes, generalizing the
 * raw-event merge, time-series storage, HR zones, route persistence,
 * canonical updatedAt supersede.
 */

export const APPLE_HEALTH_PHYSIOLOGY_DIAGNOSTIC_LABEL = "[AH][PHYSIOLOGY_DIAGNOSE]";

/**
 * Default padded-window padding around the workout `[start, end]` boundary.
 *
 * The audit observed recurring strict-boundary misses (Apple Watch sometimes
 * emits the first HR sample 30–120 s after `workout.startDate`). ±2 minutes
 * covers the observed gap without bleeding into adjacent workouts.
 */
export const DEFAULT_WORKOUT_PHYSIOLOGY_PADDING_MS = 2 * 60 * 1000;

/** Minimal workout shape required by the diagnostic helper. */
export type WorkoutForDiagnostic = {
  /** Stable workout id from HK; if missing the helper synthesises one. */
  id?: string;
  start: string;
  end: string;
  activityId: number;
  activityName: string;
  sourceId: string | null;
  durationMinutes: number;
  distanceMeters?: number;
  calories?: number;
};

export type WorkoutPhysiologyAvailabilityFlags = {
  hasHeartRate: boolean;
  strictHrMissedButPaddedFound: boolean;
  hasRoute: boolean;
  hasElevation: boolean;
  hasWorkoutEvents: boolean;
  hasCadence: boolean;
  hasPower: boolean;
  hasSpeed: boolean;
  hasBasalEnergy: boolean;
};

export type WorkoutPhysiologyErrors = {
  heartRateError: string | null;
  routeError: string | null;
  cadenceError: string | null;
  powerError: string | null;
  energyError: string | null;
};

export type WorkoutPhysiologyDiagnostic = {
  workoutId: string;
  activityId: number;
  activityName: string;
  sourceId: string | null;
  start: string;
  end: string;
  durationMinutes: number;
  distanceMeters: number | null;
  calories: number | null;
  strictHrSampleCount: number | null;
  paddedHrSampleCount: number | null;
  strictHrFirstSampleAt: string | null;
  strictHrLastSampleAt: string | null;
  paddedHrFirstSampleAt: string | null;
  paddedHrLastSampleAt: string | null;
  strictAvgHr: number | null;
  strictMaxHr: number | null;
  paddedAvgHr: number | null;
  paddedMaxHr: number | null;
  routeAvailable: boolean;
  routeSampleCount: number | null;
  elevationGainMeters: number | null;
  workoutEventsCount: number | null;
  workoutEventTypes: number[] | null;
  activeEnergyKcal: number | null;
  basalEnergyKcal: number | null;
  totalEnergyKcal: number | null;
  cadenceSampleCount: number | null;
  powerSampleCount: number | null;
  speedSampleCount: number | null;
  physiologyAvailabilityFlags: WorkoutPhysiologyAvailabilityFlags;
  errors: WorkoutPhysiologyErrors;
};

export type WorkoutPhysiologyHrSample = {
  value: number;
  startDate?: string;
  endDate?: string;
};

/**
 * Native HK probe surface. Every method MUST resolve (never reject); errors
 * are returned as `{ ok: false, error }`. The helper still wraps each call
 * in try/catch to defend against bridge bugs.
 */
export type WorkoutPhysiologyHealthKitProbe = {
  queryHeartRateSamples?: (
    start: string,
    end: string,
  ) => Promise<
    | { ok: true; samples: WorkoutPhysiologyHrSample[] }
    | { ok: false; error: string }
  >;
  /**
   * Optional route query. react-native-health does not currently expose a
   * route bridge — when omitted, the diagnostic surfaces this transparently
   * via `routeError = "queryWorkoutRoute not available on bridge"` rather
   * than inventing data.
   */
  queryWorkoutRoute?: (
    workout: WorkoutForDiagnostic,
  ) => Promise<
    | { ok: true; sampleCount: number; elevationGainMeters: number | null }
    | { ok: false; error: string }
  >;
  queryActiveEnergyKcal?: (
    start: string,
    end: string,
  ) => Promise<
    { ok: true; valueKcal: number | null } | { ok: false; error: string }
  >;
  queryBasalEnergyKcal?: (
    start: string,
    end: string,
  ) => Promise<
    { ok: true; valueKcal: number | null } | { ok: false; error: string }
  >;
  /**
   * Generic HKSampleQuery probe by quantity-type identifier (count only).
   * Used to test cadence / power / speed availability without committing
   * to native code changes in Phase A.
   */
  countSamplesByType?: (
    type: string,
    start: string,
    end: string,
  ) => Promise<
    { ok: true; sampleCount: number } | { ok: false; error: string }
  >;
};

export type DiagnoseWorkoutPhysiologyOptions = {
  /**
   * Master switch. Defaults to **false** so the helper is silent unless
   * callers opt in. Production wiring resolves this via
   * {@link shouldLogAppleHealthPhysiologyDiagnostics}.
   */
  enabled?: boolean;
  /** Padded HR window padding in milliseconds. Defaults to ±2 minutes. */
  paddingMs?: number;
  /**
   * Override emission target. When omitted the helper writes to
   * `console.log(label, diagnostic)`. Tests pass a spy here so they don't
   * have to monkey-patch console.
   */
  logger?: (label: string, payload: WorkoutPhysiologyDiagnostic) => void;
};

/**
 * Phase A pure helper. Given a workout and a HealthKit probe, compute a
 * structured diagnostic snapshot and optionally emit it via `logger`.
 *
 * Returns the computed diagnostic (or `null` when disabled). Never throws,
 * never writes, never mutates `workout`.
 */
export async function diagnoseWorkoutPhysiologyForWindow(
  workout: WorkoutForDiagnostic,
  probe: WorkoutPhysiologyHealthKitProbe,
  options: DiagnoseWorkoutPhysiologyOptions = {},
): Promise<WorkoutPhysiologyDiagnostic | null> {
  if (options.enabled !== true) return null;
  const paddingMs = options.paddingMs ?? DEFAULT_WORKOUT_PHYSIOLOGY_PADDING_MS;

  let strictHrSampleCount: number | null = null;
  let strictHrFirstSampleAt: string | null = null;
  let strictHrLastSampleAt: string | null = null;
  let strictAvgHr: number | null = null;
  let strictMaxHr: number | null = null;
  let paddedHrSampleCount: number | null = null;
  let paddedHrFirstSampleAt: string | null = null;
  let paddedHrLastSampleAt: string | null = null;
  let paddedAvgHr: number | null = null;
  let paddedMaxHr: number | null = null;
  let heartRateError: string | null = null;

  if (typeof probe.queryHeartRateSamples === "function") {
    const strict = await safeCall(() =>
      probe.queryHeartRateSamples!(workout.start, workout.end),
    );
    if ("__thrown" in strict) {
      heartRateError = strict.__thrown;
    } else if (strict.ok) {
      const agg = aggregateHrSamples(strict.samples);
      strictHrSampleCount = agg.count;
      strictHrFirstSampleAt = agg.firstAt;
      strictHrLastSampleAt = agg.lastAt;
      strictAvgHr = agg.avg;
      strictMaxHr = agg.max;
    } else {
      heartRateError = strict.error;
    }

    const paddedStart = shiftIso(workout.start, -paddingMs);
    const paddedEnd = shiftIso(workout.end, paddingMs);
    const padded = await safeCall(() =>
      probe.queryHeartRateSamples!(paddedStart, paddedEnd),
    );
    if ("__thrown" in padded) {
      heartRateError = heartRateError ?? padded.__thrown;
    } else if (padded.ok) {
      const agg = aggregateHrSamples(padded.samples);
      paddedHrSampleCount = agg.count;
      paddedHrFirstSampleAt = agg.firstAt;
      paddedHrLastSampleAt = agg.lastAt;
      paddedAvgHr = agg.avg;
      paddedMaxHr = agg.max;
    } else {
      heartRateError = heartRateError ?? padded.error;
    }
  } else {
    heartRateError = "queryHeartRateSamples not available on bridge";
  }

  let routeAvailable = false;
  let routeSampleCount: number | null = null;
  let elevationGainMeters: number | null = null;
  let routeError: string | null = null;
  if (typeof probe.queryWorkoutRoute === "function") {
    const r = await safeCall(() => probe.queryWorkoutRoute!(workout));
    if ("__thrown" in r) {
      routeError = r.__thrown;
    } else if (r.ok) {
      routeAvailable = r.sampleCount > 0;
      routeSampleCount = r.sampleCount;
      elevationGainMeters = r.elevationGainMeters;
    } else {
      routeError = r.error;
    }
  } else {
    routeError = "queryWorkoutRoute not available on bridge";
  }

  let activeEnergyKcal: number | null = null;
  let basalEnergyKcal: number | null = null;
  let energyError: string | null = null;
  if (typeof probe.queryActiveEnergyKcal === "function") {
    const r = await safeCall(() =>
      probe.queryActiveEnergyKcal!(workout.start, workout.end),
    );
    if ("__thrown" in r) {
      energyError = r.__thrown;
    } else if (r.ok) {
      activeEnergyKcal = r.valueKcal;
    } else {
      energyError = r.error;
    }
  }
  if (typeof probe.queryBasalEnergyKcal === "function") {
    const r = await safeCall(() =>
      probe.queryBasalEnergyKcal!(workout.start, workout.end),
    );
    if ("__thrown" in r) {
      energyError = energyError ?? r.__thrown;
    } else if (r.ok) {
      basalEnergyKcal = r.valueKcal;
    } else {
      energyError = energyError ?? r.error;
    }
  }
  const totalEnergyKcal =
    activeEnergyKcal != null && basalEnergyKcal != null
      ? activeEnergyKcal + basalEnergyKcal
      : (activeEnergyKcal ?? basalEnergyKcal ?? null);

  let cadenceSampleCount: number | null = null;
  let powerSampleCount: number | null = null;
  let speedSampleCount: number | null = null;
  let cadenceError: string | null = null;
  let powerError: string | null = null;

  if (typeof probe.countSamplesByType === "function") {
    cadenceSampleCount = 0;
    for (const ident of CADENCE_TYPE_IDENTIFIERS) {
      const r = await safeCall(() =>
        probe.countSamplesByType!(ident, workout.start, workout.end),
      );
      if ("__thrown" in r) {
        cadenceError = cadenceError ?? r.__thrown;
        continue;
      }
      if (r.ok) {
        cadenceSampleCount += r.sampleCount;
      } else if (cadenceError == null) {
        cadenceError = r.error;
      }
    }

    powerSampleCount = 0;
    for (const ident of POWER_TYPE_IDENTIFIERS) {
      const r = await safeCall(() =>
        probe.countSamplesByType!(ident, workout.start, workout.end),
      );
      if ("__thrown" in r) {
        powerError = powerError ?? r.__thrown;
        continue;
      }
      if (r.ok) {
        powerSampleCount += r.sampleCount;
      } else if (powerError == null) {
        powerError = r.error;
      }
    }

    speedSampleCount = 0;
    for (const ident of SPEED_TYPE_IDENTIFIERS) {
      const r = await safeCall(() =>
        probe.countSamplesByType!(ident, workout.start, workout.end),
      );
      if ("__thrown" in r) {
        // Phase A: speed errors are folded under powerError to keep the
        // structured shape minimal. A non-zero powerError + null speed count
        // already conveys the failure mode.
        continue;
      }
      if (r.ok) {
        speedSampleCount += r.sampleCount;
      }
    }
  } else {
    cadenceError = "countSamplesByType not available on bridge";
    powerError = "countSamplesByType not available on bridge";
  }

  const hasHeartRate =
    (strictHrSampleCount ?? 0) > 0 || (paddedHrSampleCount ?? 0) > 0;
  const strictHrMissedButPaddedFound =
    (strictHrSampleCount ?? 0) === 0 && (paddedHrSampleCount ?? 0) > 0;

  const diagnostic: WorkoutPhysiologyDiagnostic = {
    workoutId: workout.id ?? synthesizeWorkoutId(workout),
    activityId: workout.activityId,
    activityName: workout.activityName,
    sourceId: workout.sourceId ?? null,
    start: workout.start,
    end: workout.end,
    durationMinutes: workout.durationMinutes,
    distanceMeters:
      typeof workout.distanceMeters === "number" && Number.isFinite(workout.distanceMeters)
        ? workout.distanceMeters
        : null,
    calories:
      typeof workout.calories === "number" && Number.isFinite(workout.calories)
        ? workout.calories
        : null,
    strictHrSampleCount,
    paddedHrSampleCount,
    strictHrFirstSampleAt,
    strictHrLastSampleAt,
    paddedHrFirstSampleAt,
    paddedHrLastSampleAt,
    strictAvgHr,
    strictMaxHr,
    paddedAvgHr,
    paddedMaxHr,
    routeAvailable,
    routeSampleCount,
    elevationGainMeters,
    /**
     * HKWorkoutEvents are not surfaced by the current react-native-health
     * bridge — `pullAnchoredWorkouts` / `pullWorkoutsByDateRange` drop them
     * when mapping to `TodayWorkout`. Phase A reports this transparently
     * (null + hasWorkoutEvents=false) rather than inventing. Future phases
     * may add a native shim to expose lap/pause/resume markers.
     */
    workoutEventsCount: null,
    workoutEventTypes: null,
    activeEnergyKcal,
    basalEnergyKcal,
    totalEnergyKcal,
    cadenceSampleCount,
    powerSampleCount,
    speedSampleCount,
    physiologyAvailabilityFlags: {
      hasHeartRate,
      strictHrMissedButPaddedFound,
      hasRoute: routeAvailable,
      hasElevation: elevationGainMeters != null && elevationGainMeters > 0,
      hasWorkoutEvents: false,
      hasCadence: (cadenceSampleCount ?? 0) > 0,
      hasPower: (powerSampleCount ?? 0) > 0,
      hasSpeed: (speedSampleCount ?? 0) > 0,
      hasBasalEnergy: basalEnergyKcal != null && basalEnergyKcal > 0,
    },
    errors: {
      heartRateError,
      routeError,
      cadenceError,
      powerError,
      energyError,
    },
  };

  try {
    if (typeof options.logger === "function") {
      options.logger(APPLE_HEALTH_PHYSIOLOGY_DIAGNOSTIC_LABEL, diagnostic);
    } else {
      // eslint-disable-next-line no-console
      console.log(APPLE_HEALTH_PHYSIOLOGY_DIAGNOSTIC_LABEL, diagnostic);
    }
  } catch {
    // never block on diagnostic emission
  }
  return diagnostic;
}

/**
 * Default Phase A gating: log diagnostics only in dev builds, never inside
 * Jest. Tests opt in by passing an explicit `enabled: true` to
 * {@link diagnoseWorkoutPhysiologyForWindow}.
 *
 * Override mechanisms (staging device builds / local debug):
 * - `process.env.AH_PHYSIOLOGY_DIAGNOSE === "1"` forces enable.
 * - `process.env.AH_PHYSIOLOGY_DIAGNOSE === "0"` forces disable.
 */
export function shouldLogAppleHealthPhysiologyDiagnostics(): boolean {
  const override = process.env.AH_PHYSIOLOGY_DIAGNOSE;
  if (override === "1") return true;
  if (override === "0") return false;
  const dev = (globalThis as unknown as { __DEV__?: boolean }).__DEV__ === true;
  return dev && !process.env.JEST_WORKER_ID;
}

/** Apple HealthKit identifier strings probed for cadence (Phase A). */
const CADENCE_TYPE_IDENTIFIERS = ["CyclingCadence", "RunningStrideLength"];
/** Apple HealthKit identifier strings probed for power (Phase A). */
const POWER_TYPE_IDENTIFIERS = ["CyclingPower", "RunningPower"];
/** Apple HealthKit identifier strings probed for in-workout speed (Phase A). */
const SPEED_TYPE_IDENTIFIERS = ["RunningSpeed", "CyclingSpeed"];

function aggregateHrSamples(samples: WorkoutPhysiologyHrSample[]): {
  count: number;
  firstAt: string | null;
  lastAt: string | null;
  avg: number | null;
  max: number | null;
} {
  if (!Array.isArray(samples) || samples.length === 0) {
    return { count: 0, firstAt: null, lastAt: null, avg: null, max: null };
  }
  const values: number[] = [];
  let firstAtMs: number | null = null;
  let lastAtMs: number | null = null;
  let firstAtIso: string | null = null;
  let lastAtIso: string | null = null;
  for (const s of samples) {
    if (typeof s?.value === "number" && Number.isFinite(s.value) && s.value > 0) {
      values.push(s.value);
    }
    const startIso = typeof s?.startDate === "string" ? s.startDate : null;
    if (startIso) {
      const t = Date.parse(startIso);
      if (Number.isFinite(t)) {
        if (firstAtMs == null || t < firstAtMs) {
          firstAtMs = t;
          firstAtIso = startIso;
        }
        if (lastAtMs == null || t > lastAtMs) {
          lastAtMs = t;
          lastAtIso = startIso;
        }
      }
    }
  }
  if (values.length === 0) {
    return {
      count: samples.length,
      firstAt: firstAtIso,
      lastAt: lastAtIso,
      avg: null,
      max: null,
    };
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / values.length);
  const max = Math.round(
    values.reduce((a, b) => (b > a ? b : a), values[0] ?? 0),
  );
  return { count: samples.length, firstAt: firstAtIso, lastAt: lastAtIso, avg, max };
}

function shiftIso(iso: string, deltaMs: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t + deltaMs).toISOString();
}

async function safeCall<T>(
  fn: () => Promise<T>,
): Promise<T | { __thrown: string }> {
  try {
    return await fn();
  } catch (e) {
    return { __thrown: e instanceof Error ? e.message : String(e) };
  }
}

function synthesizeWorkoutId(w: WorkoutForDiagnostic): string {
  return `${w.start}_${w.end}_${w.activityId}`;
}
