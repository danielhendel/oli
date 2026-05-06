/**
 * W2.2 — Anchored workouts sync runner. Pure function for testability.
 * Only calls setWorkoutsAnchor after full success; fail-closed on truncation or ingest failure.
 */

import { shouldIngestAppleHealthStepsForDay } from "./appleHealthStepsIngestGuard";
import { buildAppleHealthStepsIngestBody } from "./appleHealthStepsIngestBody";
import { getLastIngestedStepsForDay, setLastIngestedStepsForDay } from "./storage";
import type { TodaySnapshot, TodayWorkout } from "./types";

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

  for (const w of anchored.data.workouts) {
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
      ...(typeof w.averageHeartRateBpm === "number" &&
      Number.isFinite(w.averageHeartRateBpm) &&
      w.averageHeartRateBpm > 0
        ? { averageHeartRateBpm: w.averageHeartRateBpm }
        : {}),
      ...(typeof w.maxHeartRateBpm === "number" &&
      Number.isFinite(w.maxHeartRateBpm) &&
      w.maxHeartRateBpm > 0
        ? { maxHeartRateBpm: w.maxHeartRateBpm }
        : {}),
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
