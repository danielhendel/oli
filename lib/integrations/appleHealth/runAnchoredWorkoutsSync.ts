/**
 * W2.2 — Anchored workouts sync runner. Pure function for testability.
 * Only calls setWorkoutsAnchor after full success; fail-closed on truncation or ingest failure.
 */

import { shouldIngestAppleHealthStepsForDay } from "./appleHealthStepsIngestGuard";
import { buildAppleHealthStepsIngestBody } from "./appleHealthStepsIngestBody";
import { getLastIngestedStepsForDay, setLastIngestedStepsForDay } from "./storage";
import type { TodaySnapshot, TodayWorkout } from "./types";
import type { WorkoutForDiagnostic } from "./diagnoseWorkoutPhysiology";
import type { WorkoutPhysiologyEnrichmentBlock } from "./enrichWorkoutPhysiologyForIngest";

export type RunAnchoredWorkoutsSyncDeps = {
  getWorkoutsAnchor: (uid: string) => Promise<string | null>;
  setWorkoutsAnchor: (uid: string, anchor: string) => Promise<void>;
  pullAnchoredWorkouts: (opts: { anchor?: string | null; limit: number }) => Promise<
    | { ok: true; data: { workouts: TodayWorkout[]; anchor: string } }
    | { ok: false; error: string }
  >;
  pullTodaySnapshot: () => Promise<{ ok: true; data: TodaySnapshot } | { ok: false; error: string }>;
  ingestRawEvent: (
    body: unknown,
    token: string,
    opts: { idempotencyKey: string; timeoutMs: number },
  ) => Promise<{ ok: true } | { ok: false; error: string; requestId: string | null }>;
  getTodayBounds: () => { start: string; end: string; day: string };
  getDeviceTimezone: () => string;
  stepsIdempotencyKey: (day: string) => string;
  workoutIdempotencyKey: (params: {
    startIso: string;
    endIso: string;
    activityId: number;
    sourceId?: string | null;
  }) => string;
  /**
   * Phase 2A — Optional per-workout step enrichment. When provided, called with each
   * anchored workout's `[start, end]` ISO range; the resolved value (when finite & non-negative)
   * is included in the workout ingest payload as `payload.steps`. Enrichment failures must
   * resolve to `null` and never block workout ingest.
   */
  getStepCountForDateRange?: (startDate: string, endDate: string) => Promise<number | null>;
  /**
   * Workout Physiology v1 — Phase A diagnostics (dev/staging only).
   *
   * When provided, invoked once per anchored workout to emit a structured
   * `[AH][PHYSIOLOGY_DIAGNOSE]` log describing HR / route / energy / cadence /
   * power / speed availability. Strictly READ-ONLY and non-blocking:
   * - Errors thrown by this dep are swallowed; ingest proceeds.
   * - Must not mutate the workout or the ingest body.
   * - Must not write to raw events, canonical events, or DailyFacts.
   *
   * Production wiring: see `runAppleHealthWorkoutPhysiologyDiagnostic` in
   * `healthKit.ts`. Tests can omit this dep entirely (diagnostics silent).
   */
  diagnoseWorkoutPhysiology?: (workout: WorkoutForDiagnostic) => Promise<void>;
  /**
   * Workout Physiology v1 — Phase B production enrichment.
   *
   * When provided, invoked once per anchored workout BEFORE payload assembly to
   * compute additive physiology fields (HR avg/max, energy, zones, recovery).
   * Result is merged into the workout payload via a conditional spread; null
   * means no physiology was available and the legacy payload is unchanged.
   *
   * Contracts:
   * - Errors are caught upstream (`runAppleHealthWorkoutPhysiologyEnrichment`
   *   never throws); any thrown rejection here is swallowed so ingest proceeds.
   * - Caller passes neighbor boundaries (`priorEndIso` / `nextStartIso`) so the
   *   helper can clip the padded HR window for back-to-back sessions.
   *
   * Production wiring: see `runAppleHealthWorkoutPhysiologyEnrichment` in
   * `healthKit.ts`. Tests can omit this dep entirely (no physiology fields).
   */
  enrichWorkoutPhysiology?: (
    workout: WorkoutForDiagnostic,
    context: {
      neighbors: { priorEndIso: string | null; nextStartIso: string | null };
    },
  ) => Promise<WorkoutPhysiologyEnrichmentBlock | null>;
};

export type RunAnchoredWorkoutsSyncResult =
  | { ok: true; mayHaveMoreWorkouts: boolean }
  | { ok: false; error: string; requestId: string | null };

/**
 * Run anchored workouts sync. Ingests every workout returned by the anchored pull.
 * Updates anchor only after full success (steps + all workouts). Idempotent per workout.
 * When the pull returns `limit` workouts, more history may remain — caller may run again
 * with the updated anchor (bounded multi-pass orchestration on the client).
 */
export async function runAnchoredWorkoutsSync(
  opts: { uid: string; token: string; limit: number },
  deps: RunAnchoredWorkoutsSyncDeps,
): Promise<RunAnchoredWorkoutsSyncResult> {
  const { uid, token, limit } = opts;
  const anchor = await deps.getWorkoutsAnchor(uid);
  const anchored = await deps.pullAnchoredWorkouts({ anchor, limit });
  if (!anchored.ok) {
    return { ok: false, error: anchored.error, requestId: null };
  }

  const timezone = deps.getDeviceTimezone();
  const { start, end, day } = deps.getTodayBounds();

  const pull = await deps.pullTodaySnapshot();
  const data = pull.ok
    ? pull.data
    : {
        day,
        steps: null,
        exerciseMinutes: null,
        activeEnergyKcal: null,
        restingHeartRateBpm: null,
        workouts: [],
      };

  if (!pull.ok && __DEV__ && !process.env.JEST_WORKER_ID) {
    // eslint-disable-next-line no-console
    console.warn("[AH] pullTodaySnapshot failed; continuing workout ingest", pull.error);
  }

  if (data.steps != null && data.steps >= 0) {
    const lastIngested = await getLastIngestedStepsForDay(day);
    const sendSteps = shouldIngestAppleHealthStepsForDay({
      healthSteps: data.steps,
      hkEmpty: false,
      lastIngestedSteps: lastIngested,
    });
    if (sendSteps) {
      const body = buildAppleHealthStepsIngestBody({
        start,
        end,
        day,
        timezone,
        steps: data.steps,
        ...(typeof data.walkingRunningDistanceMeters === "number" &&
        Number.isFinite(data.walkingRunningDistanceMeters) &&
        data.walkingRunningDistanceMeters > 0
          ? { distanceMeters: data.walkingRunningDistanceMeters }
          : {}),
      });
      const res = await deps.ingestRawEvent(body, token, {
        idempotencyKey: deps.stepsIdempotencyKey(day),
        timeoutMs: 15000,
      });
      if (!res.ok) {
        if (__DEV__ && !process.env.JEST_WORKER_ID) {
          // eslint-disable-next-line no-console
          console.warn("[AH] steps ingest failed; continuing workout ingest", res.error, res.requestId);
        }
      } else {
        await setLastIngestedStepsForDay(day, data.steps);
      }
    }
  }

  // Do not set payload.day: calendar grouping uses start + timezone (deriveWorkoutDayKey).
  // Using "today" would mis-attribute all historical workouts to the sync day.

  /**
   * Workout Physiology v1 — Pre-compute neighbor boundaries used to clip the padded
   * HR enrichment window. Stable ascending sort by `start`. We do NOT reorder
   * `anchored.data.workouts` itself (callers/anchors depend on insertion order);
   * we only build an auxiliary lookup keyed by workout idempotency key.
   */
  const sortedForNeighbors = [...anchored.data.workouts].sort((a, b) =>
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

  for (const w of anchored.data.workouts) {
    /**
     * Workout Physiology v1 — Phase A diagnostic (dev/staging only).
     * Runs BEFORE ingest so a failure here cannot taint the payload. Wrapped
     * in try/catch and `Promise.resolve().catch(...)` so a rejected promise
     * from the dep can never block ingest.
     */
    if (typeof deps.diagnoseWorkoutPhysiology === "function") {
      try {
        await deps.diagnoseWorkoutPhysiology(w);
      } catch (e) {
        if (__DEV__ && !process.env.JEST_WORKER_ID) {
          // eslint-disable-next-line no-console
          console.log("[AH][PHYSIOLOGY_DIAGNOSE] dep threw; continuing ingest", e);
        }
      }
    }

    /**
     * Workout Physiology v1 — Phase B enrichment. Optional dep; failures swallowed
     * so ingest proceeds with legacy fields only. Neighbor boundaries pre-computed
     * above are passed so the padded HR window clips against back-to-back sessions.
     */
    let physiologyBlock: WorkoutPhysiologyEnrichmentBlock | null = null;
    if (typeof deps.enrichWorkoutPhysiology === "function") {
      const key = deps.workoutIdempotencyKey({
        startIso: w.start,
        endIso: w.end,
        activityId: w.activityId,
        sourceId: w.sourceId,
      });
      const neighbors = neighborByKey.get(key) ?? { priorEndIso: null, nextStartIso: null };
      try {
        physiologyBlock = await deps.enrichWorkoutPhysiology(w, { neighbors });
      } catch (e) {
        if (__DEV__ && !process.env.JEST_WORKER_ID) {
          // eslint-disable-next-line no-console
          console.warn("[AH] enrichWorkoutPhysiology threw; continuing without physiology", e);
        }
        physiologyBlock = null;
      }
    }

    /**
     * Phase 2A — Per-workout step enrichment. Fail-closed: any error or `null` is silently
     * dropped from the payload (we never invent steps from duration/calories/distance).
     * Enrichment failures must not block workout ingest — preserves anchor advancement
     * semantics from prior phases.
     */
    let workoutSteps: number | null = null;
    if (typeof deps.getStepCountForDateRange === "function") {
      try {
        const enriched = await deps.getStepCountForDateRange(w.start, w.end);
        if (typeof enriched === "number" && Number.isFinite(enriched) && enriched >= 0) {
          workoutSteps = Math.round(enriched);
        }
      } catch (e) {
        if (__DEV__ && !process.env.JEST_WORKER_ID) {
          // eslint-disable-next-line no-console
          console.warn("[AH] getStepCountForDateRange threw; continuing without workout.steps", e);
        }
        workoutSteps = null;
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
      // Legacy strict-window summary HR (from `HKWorkout.totalAverageHeartRate` /
      // `HKWorkout.totalMaxHeartRate` via `pullAnchoredWorkouts`). Used only when
      // padded enrichment did NOT produce a value — the padded enrichment is more
      // reliable per Phase A diagnostics (`strictHrMissedButPaddedFound`).
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
      ...(workoutSteps != null ? { steps: workoutSteps } : {}),
      // Workout Physiology v1 — spreads averageHeartRateBpm, maxHeartRateBpm (when
      // produced by padded enrichment), activeEnergyKcal, basalEnergyKcal,
      // totalEnergyKcal, heartRateZoneMinutes + heartRateZoneBasis,
      // postWorkoutHeartRate, and physiologyVersion. Absent fields are simply not
      // present on the block (no null placeholders).
      ...(physiologyBlock ?? {}),
      hk: { sourceId: w.sourceId ?? null, activityId: w.activityId },
      sync: {
        mode: "anchored" as const,
        anchorVersion: 1,
        anchorUsed: anchor != null,
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
    const res = await deps.ingestRawEvent(body, token, {
      idempotencyKey: deps.workoutIdempotencyKey({
        startIso: w.start,
        endIso: w.end,
        activityId: w.activityId,
        sourceId: w.sourceId,
      }),
      timeoutMs: 15000,
    });
    if (!res.ok) {
      return { ok: false, error: res.error, requestId: res.requestId };
    }
  }

  await deps.setWorkoutsAnchor(uid, anchored.data.anchor);
  const mayHaveMoreWorkouts = anchored.data.workouts.length >= limit;
  if (__DEV__ && !process.env.JEST_WORKER_ID) {
    // eslint-disable-next-line no-console
    console.log("[WORKOUT_TRUTH_DEBUG] backfill-pass", {
      anchorBefore: anchor,
      anchorAfter: anchored.data.anchor,
      workoutsIngested: anchored.data.workouts.length,
      mayHaveMoreWorkouts,
    });
  }
  return { ok: true, mayHaveMoreWorkouts };
}
