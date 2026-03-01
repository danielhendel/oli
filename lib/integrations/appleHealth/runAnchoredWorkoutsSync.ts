/**
 * W2.2 — Anchored workouts sync runner. Pure function for testability.
 * Only calls setWorkoutsAnchor after full success; fail-closed on truncation or ingest failure.
 */

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
  | { ok: true }
  | { ok: false; error: string; requestId: string | null };

const TRUNCATION_MESSAGE =
  "Workout sync reached limit (500). Run Sync again to continue.";

/**
 * Run anchored workouts sync. Updates anchor only after all ingest steps succeed.
 * Does not update anchor on pull error, truncation (length >= limit), or ingest failure.
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
  if (anchored.data.workouts.length >= limit) {
    return { ok: false, error: TRUNCATION_MESSAGE, requestId: null };
  }

  const pull = await deps.pullTodaySnapshot();
  if (!pull.ok) {
    return { ok: false, error: pull.error, requestId: null };
  }
  const data = pull.data;
  const timezone = deps.getDeviceTimezone();
  const { start, end, day } = deps.getTodayBounds();

  if (data.steps != null && data.steps >= 0) {
    const body = {
      provider: "apple_health" as const,
      sourceId: "healthkit",
      kind: "steps" as const,
      observedAt: start,
      timeZone: timezone,
      payload: {
        start,
        end,
        timezone,
        day,
        steps: data.steps,
        sync: { mode: "range" as const, anchorVersion: 1, anchorUsed: false },
      },
    };
    const res = await deps.ingestRawEvent(body, token, {
      idempotencyKey: deps.stepsIdempotencyKey(day),
      timeoutMs: 15000,
    });
    if (!res.ok) {
      return { ok: false, error: res.error, requestId: res.requestId };
    }
  }

  for (const w of anchored.data.workouts) {
    const payload = {
      start: w.start,
      end: w.end,
      timezone,
      day,
      sport: w.activityName || "Workout",
      durationMinutes: Math.max(1, w.durationMinutes),
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
  return { ok: true };
}
