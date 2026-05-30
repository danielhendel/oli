/**
 * Bounded multi-pass Apple Health workout history backfill.
 * Optionally runs a one-time date-range bootstrap, then anchored incremental passes.
 */

import {
  runAnchoredWorkoutsSync,
  type RunAnchoredWorkoutsSyncDeps,
} from "@/lib/integrations/appleHealth/runAnchoredWorkoutsSync";

export const DEFAULT_WORKOUT_BACKFILL_MAX_PASSES = 36;
export const DEFAULT_WORKOUT_BOOTSTRAP_MAX_PAGES = 72;

type WorkoutBootstrapRange = {
  startDate: string;
  endDate: string;
};

export type RunWorkoutHistoryBackfillDeps = RunAnchoredWorkoutsSyncDeps & {
  pullWorkoutsByDateRange?: (opts: {
    startDate: string;
    endDate: string;
    limit: number;
    maxPages?: number;
  }) => Promise<
    | {
        ok: true;
        data: {
          workouts: {
            start: string;
            end: string;
            activityId: number;
            activityName: string;
            sourceId: string | null;
            durationMinutes: number;
            calories: number;
            distanceMeters?: number;
            averageHeartRateBpm?: number;
            maxHeartRateBpm?: number;
          }[];
          pagesFetched: number;
          truncated: boolean;
        };
      }
    | { ok: false; error: string }
  >;
};

export type WorkoutHistoryBootstrapSummary = {
  attempted: boolean;
  requestedStartDate: string | null;
  requestedEndDate: string | null;
  /** Native bridge exposes getAnchoredWorkouts (react-native-health). */
  nativeMethodAssumed: boolean;
  workoutsFetched: number;
  workoutsIngested: number;
  pagesFetched: number;
  truncated: boolean;
  nativeEarliestStart: string | null;
  nativeLatestStart: string | null;
  ingestAttempted: number;
  ingestOk: number;
  ingestFailed: number;
};

export type RunWorkoutHistoryBackfillResult =
  | {
      ok: true;
      passesRun: number;
      mayHaveMoreWorkouts: boolean;
      bootstrap: WorkoutHistoryBootstrapSummary;
    }
  | { ok: false; error: string; requestId: string | null; passesRun: number };

/** Test / caller helper: shape returned when no range bootstrap runs. */
export function emptyWorkoutHistoryBootstrapSummary(): WorkoutHistoryBootstrapSummary {
  return {
    attempted: false,
    requestedStartDate: null,
    requestedEndDate: null,
    nativeMethodAssumed: false,
    workoutsFetched: 0,
    workoutsIngested: 0,
    pagesFetched: 0,
    truncated: false,
    nativeEarliestStart: null,
    nativeLatestStart: null,
    ingestAttempted: 0,
    ingestOk: 0,
    ingestFailed: 0,
  };
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

async function runRangeBootstrap(
  opts: {
    token: string;
    limit: number;
    bootstrapRange: WorkoutBootstrapRange;
    bootstrapMaxPages: number;
  },
  deps: RunWorkoutHistoryBackfillDeps,
): Promise<
  | { ok: true; summary: WorkoutHistoryBootstrapSummary }
  | { ok: false; error: string; requestId: string | null; partialSummary?: WorkoutHistoryBootstrapSummary }
> {
  if (!deps.pullWorkoutsByDateRange) {
    return { ok: false, error: "Historical workout bootstrap is unavailable.", requestId: null };
  }
  const pulled = await deps.pullWorkoutsByDateRange({
    startDate: opts.bootstrapRange.startDate,
    endDate: opts.bootstrapRange.endDate,
    limit: opts.limit,
    maxPages: opts.bootstrapMaxPages,
  });
  if (!pulled.ok) return { ok: false, error: pulled.error, requestId: null };

  const nativeEarliest = minIsoStart(pulled.data.workouts);
  const nativeLatest = maxIsoStart(pulled.data.workouts);
  const timezone = deps.getDeviceTimezone();
  let ingestOk = 0;
  let ingestFailed = 0;
  const total = pulled.data.workouts.length;

  /**
   * Workout Physiology v1 — Pre-compute neighbor boundaries (stable ascending sort
   * by start) so the padded HR enrichment window can clip against back-to-back
   * historical sessions. Lookup keyed by the workout idempotency key.
   */
  const sortedForNeighbors = [...pulled.data.workouts].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const neighborByKey = new Map<string, { priorEndIso: string | null; nextStartIso: string | null }>();
  for (let i = 0; i < sortedForNeighbors.length; i++) {
    const w = sortedForNeighbors[i]!;
    const key = deps.workoutIdempotencyKey({
      startIso: w.start,
      endIso: w.end,
      activityId: w.activityId,
      sourceId: w.sourceId,
    });
    neighborByKey.set(key, {
      priorEndIso: i > 0 ? sortedForNeighbors[i - 1]!.end : null,
      nextStartIso: i + 1 < sortedForNeighbors.length ? sortedForNeighbors[i + 1]!.start : null,
    });
  }

  for (const w of pulled.data.workouts) {
    /**
     * Workout Physiology v1 — Phase A diagnostic (dev/staging only).
     * Mirrors the anchored sync path. Runs BEFORE ingest so a failure here
     * cannot affect the payload or bootstrap outcome.
     */
    const diagnosticWorkout = {
      start: w.start,
      end: w.end,
      activityId: w.activityId,
      activityName: w.activityName,
      sourceId: w.sourceId ?? null,
      durationMinutes: w.durationMinutes,
      ...(typeof w.distanceMeters === "number" ? { distanceMeters: w.distanceMeters } : {}),
      ...(typeof w.calories === "number" ? { calories: w.calories } : {}),
    };

    if (typeof deps.diagnoseWorkoutPhysiology === "function") {
      try {
        await deps.diagnoseWorkoutPhysiology(diagnosticWorkout);
      } catch (e) {
        if (__DEV__ && !process.env.JEST_WORKER_ID) {
          // eslint-disable-next-line no-console
          console.log("[AH][PHYSIOLOGY_DIAGNOSE] dep threw; continuing ingest", e);
        }
      }
    }

    let physiologyBlock = null as
      | import("./enrichWorkoutPhysiologyForIngest").WorkoutPhysiologyEnrichmentBlock
      | null;
    if (typeof deps.enrichWorkoutPhysiology === "function") {
      const key = deps.workoutIdempotencyKey({
        startIso: w.start,
        endIso: w.end,
        activityId: w.activityId,
        sourceId: w.sourceId,
      });
      const neighbors = neighborByKey.get(key) ?? { priorEndIso: null, nextStartIso: null };
      try {
        physiologyBlock = await deps.enrichWorkoutPhysiology(diagnosticWorkout, { neighbors });
      } catch (e) {
        if (__DEV__ && !process.env.JEST_WORKER_ID) {
          // eslint-disable-next-line no-console
          console.warn("[AH] enrichWorkoutPhysiology threw; continuing without physiology", e);
        }
        physiologyBlock = null;
      }
    }

    const payload = {
      start: w.start,
      end: w.end,
      timezone,
      sport: w.activityName || "Workout",
      durationMinutes: Math.max(1, w.durationMinutes),
      ...(typeof w.calories === "number" && Number.isFinite(w.calories) && w.calories > 0
        ? { calories: Math.round(w.calories) }
        : {}),
      ...(typeof w.distanceMeters === "number" &&
      Number.isFinite(w.distanceMeters) &&
      w.distanceMeters > 0
        ? { distanceMeters: w.distanceMeters }
        : {}),
      // Legacy strict-window summary HR — used only as fallback when padded
      // enrichment did not return a value (see `runAnchoredWorkoutsSync`).
      ...(physiologyBlock?.averageHeartRateBpm == null &&
      typeof w.averageHeartRateBpm === "number" &&
      Number.isFinite(w.averageHeartRateBpm) &&
      w.averageHeartRateBpm > 0
        ? { averageHeartRateBpm: w.averageHeartRateBpm }
        : {}),
      ...(physiologyBlock?.maxHeartRateBpm == null &&
      typeof w.maxHeartRateBpm === "number" &&
      Number.isFinite(w.maxHeartRateBpm) &&
      w.maxHeartRateBpm > 0
        ? { maxHeartRateBpm: w.maxHeartRateBpm }
        : {}),
      ...(physiologyBlock ?? {}),
      hk: { sourceId: w.sourceId ?? null, activityId: w.activityId },
      sync: {
        mode: "range_bootstrap" as const,
        anchorVersion: 1,
        anchorUsed: false,
      },
    };
    const body = {
      provider: "apple_health" as const,
      sourceId: "healthkit",
      kind: "workout" as const,
      observedAt: w.start,
      timeZone: timezone,
      payload,
    };
    const res = await deps.ingestRawEvent(body, opts.token, {
      idempotencyKey: deps.workoutIdempotencyKey({
        startIso: w.start,
        endIso: w.end,
        activityId: w.activityId,
        sourceId: w.sourceId,
      }),
      timeoutMs: 15000,
    });
    if (!res.ok) {
      ingestFailed += 1;
      const partialSummary: WorkoutHistoryBootstrapSummary = {
        attempted: true,
        requestedStartDate: opts.bootstrapRange.startDate,
        requestedEndDate: opts.bootstrapRange.endDate,
        nativeMethodAssumed: true,
        workoutsFetched: total,
        workoutsIngested: ingestOk,
        pagesFetched: pulled.data.pagesFetched,
        truncated: pulled.data.truncated,
        nativeEarliestStart: nativeEarliest,
        nativeLatestStart: nativeLatest,
        ingestAttempted: ingestOk + ingestFailed,
        ingestOk,
        ingestFailed,
      };
      if (__DEV__ && !process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.log("[WORKOUT_BOOTSTRAP_DEBUG] ingestion-result", {
          ingestAttempted: partialSummary.ingestAttempted,
          ingestOk: partialSummary.ingestOk,
          ingestFailed: partialSummary.ingestFailed,
          firstError: res.error,
          requestId: res.requestId,
        });
      }
      return { ok: false, error: res.error, requestId: res.requestId, partialSummary };
    }
    ingestOk += 1;
  }

  const summary: WorkoutHistoryBootstrapSummary = {
    attempted: true,
    requestedStartDate: opts.bootstrapRange.startDate,
    requestedEndDate: opts.bootstrapRange.endDate,
    nativeMethodAssumed: true,
    workoutsFetched: total,
    workoutsIngested: ingestOk,
    pagesFetched: pulled.data.pagesFetched,
    truncated: pulled.data.truncated,
    nativeEarliestStart: nativeEarliest,
    nativeLatestStart: nativeLatest,
    ingestAttempted: total,
    ingestOk,
    ingestFailed: 0,
  };

  if (__DEV__ && !process.env.JEST_WORKER_ID) {
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] bootstrap-range", {
      requestedStart: opts.bootstrapRange.startDate,
      requestedEnd: opts.bootstrapRange.endDate,
      pagesFetched: pulled.data.pagesFetched,
      workoutsFetched: pulled.data.workouts.length,
      workoutsIngested: ingestOk,
      truncated: pulled.data.truncated,
    });
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_BOOTSTRAP_DEBUG] ingestion-result", {
      ingestAttempted: summary.ingestAttempted,
      ingestOk: summary.ingestOk,
      ingestFailed: summary.ingestFailed,
    });
  }
  return { ok: true, summary };
}

/**
 * Runs up to `maxPasses` anchored sync passes in sequence.
 * Stops early when a pull returns fewer than `limit` workouts (no more pages).
 * Fail-closed: any pass failure aborts; anchor was already advanced only for completed passes.
 */
export async function runWorkoutHistoryBackfillPasses(
  opts: {
    uid: string;
    token: string;
    limit: number;
    maxPasses?: number;
    bootstrapRange?: WorkoutBootstrapRange;
    bootstrapMaxPages?: number;
  },
  deps: RunWorkoutHistoryBackfillDeps,
): Promise<RunWorkoutHistoryBackfillResult> {
  const maxPasses = opts.maxPasses ?? DEFAULT_WORKOUT_BACKFILL_MAX_PASSES;
  let passesRun = 0;
  let bootstrapResult: WorkoutHistoryBootstrapSummary = emptyWorkoutHistoryBootstrapSummary();

  if (opts.bootstrapRange) {
    if (__DEV__ && !process.env.JEST_WORKER_ID) {
      // eslint-disable-next-line no-console
      console.log("[WORKOUT_BOOTSTRAP_DEBUG] bootstrap-entry", {
        requestedStartDate: opts.bootstrapRange.startDate,
        requestedEndDate: opts.bootstrapRange.endDate,
        limit: opts.limit,
        bootstrapMaxPages: opts.bootstrapMaxPages ?? DEFAULT_WORKOUT_BOOTSTRAP_MAX_PAGES,
      });
    }
    const boot = await runRangeBootstrap(
      {
        token: opts.token,
        limit: opts.limit,
        bootstrapRange: opts.bootstrapRange,
        bootstrapMaxPages: opts.bootstrapMaxPages ?? DEFAULT_WORKOUT_BOOTSTRAP_MAX_PAGES,
      },
      deps,
    );
    if (!boot.ok) {
      if (boot.partialSummary && __DEV__ && !process.env.JEST_WORKER_ID) {
        // eslint-disable-next-line no-console
        console.log("[WORKOUT_BOOTSTRAP_DEBUG] bootstrap-aborted-after-partial-ingest", boot.partialSummary);
      }
      return {
        ok: false,
        error: boot.error,
        requestId: boot.requestId,
        passesRun,
      };
    }
    bootstrapResult = boot.summary;
  }

  for (let i = 0; i < maxPasses; i++) {
    if (__DEV__ && !process.env.JEST_WORKER_ID) {
      // eslint-disable-next-line no-console
      console.log("[WORKOUT_TRUTH_DEBUG] backfill-pass-start", {
        passNumber: i + 1,
        maxPasses,
      });
    }
    const r = await runAnchoredWorkoutsSync(
      { uid: opts.uid, token: opts.token, limit: opts.limit },
      deps,
    );

    if (!r.ok) {
      return {
        ok: false,
        error: r.error,
        requestId: r.requestId,
        passesRun,
      };
    }

    passesRun += 1;
    if (!r.mayHaveMoreWorkouts) {
      return { ok: true, passesRun, mayHaveMoreWorkouts: false, bootstrap: bootstrapResult };
    }
  }

  return { ok: true, passesRun, mayHaveMoreWorkouts: true, bootstrap: bootstrapResult };
}
