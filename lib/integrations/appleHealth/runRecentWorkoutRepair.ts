/**
 * Workout Recent Repair — rolling 14-day Apple Health workout recovery.
 *
 * Why this exists
 * ----------------
 * Steady-state workout sync after `v14-physiology` is anchored-only
 * (`runAnchoredWorkoutsSync`). HealthKit's anchored delta sometimes misses workouts
 * created on the Watch (delayed phone sync, anchor advanced past a still-arriving
 * sample, app installed after the workout ended, etc). Once the one-shot range
 * bootstrap completes there is **no** mechanism to ever catch those rows again
 * without bumping `WORKOUT_DEEP_BACKFILL_VERSION` (which resets the anchor and
 * rebuilds 12 months).
 *
 * This helper closes that gap with a safe, bounded, idempotent re-pull of the
 * last N local calendar days. It runs **in addition to** anchored sync — never
 * instead of — and never touches the anchor, the deep backfill version, or the
 * range-bootstrap build id. It mirrors the reliability model already used by
 * steps repair (`lib/data/activity/appleHealthStepsRepairCoordinator.ts`).
 *
 * Contracts
 * ---------
 * - Pure / DI-driven: no module-level singletons, no React, no Firestore writes.
 * - Read-only against raw Apple Health truth — ingest is the only side effect.
 * - Idempotent: reuses `workoutIdempotencyKey`; the API's replay branch
 *   (`mergeAppleHealthWorkoutPhysiologyIfNeeded`) patches enrichment fields
 *   onto already-stored raw events without duplication.
 * - Fail-soft per-workout: an ingest failure increments `failedCount` and the
 *   loop **continues**, mirroring "best-effort recovery". On any failure the
 *   throttle marker is left unchanged so the next focus retries.
 * - Throttled by caller via `getLastRunAt` / `setLastRunAtOnSuccess` deps; this
 *   module computes `status: "skipped" | "ran" | "failed"` only.
 */

import type { TodayWorkout } from "./types";
import type { WorkoutForDiagnostic } from "./diagnoseWorkoutPhysiology";
import type { WorkoutPhysiologyEnrichmentBlock } from "./enrichWorkoutPhysiologyForIngest";

/** Default rolling window — covers Watch sync lag, app downtime, weekend gaps. */
export const RECENT_WORKOUT_REPAIR_DEFAULT_DAYS_BACK = 14;
/** Default throttle — once per 6 hours per uid. Independent of anchored sync (2 min). */
export const RECENT_WORKOUT_REPAIR_DEFAULT_THROTTLE_MS = 6 * 60 * 60 * 1000;
/** Page cap for the HK date-range query — generous, since 14 days rarely exceed it. */
export const RECENT_WORKOUT_REPAIR_DEFAULT_MAX_PAGES = 14;

/** Trigger source — passed through to logs only. Does not change behavior. */
export type RecentWorkoutRepairReason = "focus" | "foreground" | "connect" | "manual-debug";

export type RecentWorkoutRepairResult = {
  status: "skipped" | "ran" | "failed";
  /** Local-calendar `YYYY-MM-DD` of the earliest day inspected (inclusive). */
  startDay: string;
  /** Local-calendar `YYYY-MM-DD` of today (inclusive). */
  endDay: string;
  /** Inclusive count of local days inspected (`endDay - startDay + 1`). */
  daysRequested: number;
  /** Workouts returned by the HealthKit date-range query (after de-dup). */
  hkWorkoutCount: number;
  /**
   * Workouts ingested through `POST /ingest`. Includes both fresh inserts and
   * idempotent replays — the API path is the same in both cases.
   */
  ingestedCount: number;
  /** Workouts whose `POST /ingest` returned `ok: false`. */
  failedCount: number;
  /** Wall-clock milliseconds the run took (0 when skipped). */
  durationMs: number;
  /** Trigger that initiated this run; mirrored from input. */
  reason: RecentWorkoutRepairReason;
  /** Why the run was skipped, when applicable. Useful for log triage. */
  skippedReason?: "throttled" | "disabled" | "no_uid" | "no_token";
  /** Latest `workout.start` returned by HK, or null when none. */
  latestNativeWorkoutStart?: string | null;
  /** First ingest error encountered; reported alongside `failedCount`. */
  firstIngestError?: string | null;
};

/**
 * DI surface. Mirrors `runAnchoredWorkoutsSync`'s deps so wiring in
 * `overview.tsx` can reuse the same closures with zero adapter layer.
 */
export type RunRecentWorkoutRepairDeps = {
  /** HK date-range query. Same callable used by `runRangeBootstrap`. */
  pullWorkoutsByDateRange: (opts: {
    startDate: string;
    endDate: string;
    limit: number;
    maxPages?: number;
  }) => Promise<
    | { ok: true; data: { workouts: TodayWorkout[]; pagesFetched: number; truncated: boolean } }
    | { ok: false; error: string }
  >;
  /** API POST /ingest. Same callable used by anchored sync and range bootstrap. */
  ingestRawEvent: (
    body: unknown,
    token: string,
    opts: { idempotencyKey: string; timeoutMs: number },
  ) => Promise<{ ok: true } | { ok: false; error: string; requestId: string | null }>;
  /** Device IANA timezone (e.g. "Europe/Madrid"). Used for `payload.timezone`. */
  getDeviceTimezone: () => string;
  /** Local-calendar `YYYY-MM-DD` for "today" (device local). */
  getTodayDayKeyLocal: () => string;
  /** Local-day bounds (`start`/`end` ISO) for HK date-range queries. */
  getLocalCalendarDayBoundsFromYmd: (
    dayYmd: string,
  ) => { start: string; end: string; day: string };
  /** Shift a local day key by N days (no UTC drift). */
  addLocalCalendarDaysToDayKey: (dayYmd: string, deltaDays: number) => string;
  /** Same `workoutIdempotencyKey` used by anchored sync — guarantees no duplicates. */
  workoutIdempotencyKey: (params: {
    startIso: string;
    endIso: string;
    activityId: number;
    sourceId?: string | null;
  }) => string;
  /** Optional Phase B enrichment. Failures are swallowed; ingest still proceeds. */
  enrichWorkoutPhysiology?: (
    workout: WorkoutForDiagnostic,
    context: {
      neighbors: { priorEndIso: string | null; nextStartIso: string | null };
    },
  ) => Promise<WorkoutPhysiologyEnrichmentBlock | null>;
  /** Throttle reader. Returns ISO of last successful run or null. */
  getLastRunAt: (uid: string) => Promise<string | null>;
  /** Throttle writer. ONLY called on a successful run. */
  setLastRunAtOnSuccess: (uid: string, iso: string) => Promise<void>;
  /** Override for tests; defaults to `Date.now()`. */
  nowMs?: () => number;
};

export type RunRecentWorkoutRepairOpts = {
  uid: string;
  /** ID token for `POST /ingest`. When null the run is skipped (no `no_token` failure). */
  token: string | null;
  /**
   * Trailing local-day window (inclusive of today).
   * Defaults to {@link RECENT_WORKOUT_REPAIR_DEFAULT_DAYS_BACK}.
   * Clamped to `>= 1`. Values larger than ~30 indicate a misuse.
   */
  daysBack?: number;
  /**
   * Minimum interval between successful runs per uid (ms).
   * Defaults to {@link RECENT_WORKOUT_REPAIR_DEFAULT_THROTTLE_MS}.
   * Set to 0 to disable throttle (debug/manual paths).
   */
  throttleMs?: number;
  /** Trigger source for logging. */
  reason: RecentWorkoutRepairReason;
  /** Forwards through to HK page cap. */
  maxPages?: number;
  /**
   * Master kill switch. Defaults to true. When false the helper returns
   * `status: "skipped", skippedReason: "disabled"` without touching the throttle.
   */
  enabled?: boolean;
};

/**
 * Run the rolling repair pass. Returns a structured result for logging / tests.
 *
 * Behavior matrix:
 * - `enabled === false`              → `skipped: disabled`
 * - `uid` blank                      → `skipped: no_uid`
 * - `token` null                     → `skipped: no_token`
 * - throttle fresh                   → `skipped: throttled`
 * - HK pull fails                    → `failed` (no marker update)
 * - HK pull empty                    → `ran` with `hkWorkoutCount = 0` (marker updated)
 * - All ingests succeed              → `ran` (marker updated)
 * - Some ingests fail                → `ran` with `failedCount > 0` (NO marker update,
 *                                       so the next focus retries the failures)
 */
export async function runRecentWorkoutRepair(
  opts: RunRecentWorkoutRepairOpts,
  deps: RunRecentWorkoutRepairDeps,
): Promise<RecentWorkoutRepairResult> {
  const now = (deps.nowMs ?? (() => Date.now()))();
  const reason = opts.reason;
  const enabled = opts.enabled ?? true;

  // ---------------------------------------------------------------------------
  // Up-front gates. Stable status order so the log triage rule is obvious.
  // ---------------------------------------------------------------------------
  const endDay = deps.getTodayDayKeyLocal();
  const daysBack = Math.max(1, opts.daysBack ?? RECENT_WORKOUT_REPAIR_DEFAULT_DAYS_BACK);
  const startDay = deps.addLocalCalendarDaysToDayKey(endDay, -(daysBack - 1));
  const daysRequested = daysBack;

  if (!enabled) {
    return skippedResult({
      startDay,
      endDay,
      daysRequested,
      reason,
      skippedReason: "disabled",
    });
  }
  if (!opts.uid || typeof opts.uid !== "string") {
    return skippedResult({
      startDay,
      endDay,
      daysRequested,
      reason,
      skippedReason: "no_uid",
    });
  }
  if (!opts.token) {
    return skippedResult({
      startDay,
      endDay,
      daysRequested,
      reason,
      skippedReason: "no_token",
    });
  }

  const throttleMs = opts.throttleMs ?? RECENT_WORKOUT_REPAIR_DEFAULT_THROTTLE_MS;
  if (throttleMs > 0) {
    const last = await safeGetLastRunAt(deps, opts.uid);
    if (last != null) {
      const t = Date.parse(last);
      if (Number.isFinite(t) && now - t < throttleMs) {
        return skippedResult({
          startDay,
          endDay,
          daysRequested,
          reason,
          skippedReason: "throttled",
        });
      }
    }
  }

  const startedMs = now;

  // ---------------------------------------------------------------------------
  // HK date-range query. Local-day-bounds → device-local ISO start/end (not UTC).
  // ---------------------------------------------------------------------------
  const rangeStart = deps.getLocalCalendarDayBoundsFromYmd(startDay).start;
  const rangeEnd = deps.getLocalCalendarDayBoundsFromYmd(endDay).end;
  const pulled = await deps.pullWorkoutsByDateRange({
    startDate: rangeStart,
    endDate: rangeEnd,
    limit: 500,
    maxPages: opts.maxPages ?? RECENT_WORKOUT_REPAIR_DEFAULT_MAX_PAGES,
  });

  if (!pulled.ok) {
    return {
      status: "failed",
      startDay,
      endDay,
      daysRequested,
      hkWorkoutCount: 0,
      ingestedCount: 0,
      failedCount: 0,
      durationMs: elapsed(deps, startedMs),
      reason,
      latestNativeWorkoutStart: null,
      firstIngestError: pulled.error,
    };
  }

  const workouts = pulled.data.workouts;
  const hkWorkoutCount = workouts.length;
  const latestNativeWorkoutStart = maxIsoStart(workouts);

  // No workouts in window → success (do not interpret as failure).
  if (hkWorkoutCount === 0) {
    await safeSetLastRunAtOnSuccess(deps, opts.uid, isoFromMs(now));
    return {
      status: "ran",
      startDay,
      endDay,
      daysRequested,
      hkWorkoutCount: 0,
      ingestedCount: 0,
      failedCount: 0,
      durationMs: elapsed(deps, startedMs),
      reason,
      latestNativeWorkoutStart: null,
    };
  }

  // ---------------------------------------------------------------------------
  // Workout Physiology v1 — neighbor boundaries for padded HR clipping.
  // Mirrors `runAnchoredWorkoutsSync` so back-to-back sessions in the repair
  // window don't bleed HR samples across boundaries.
  // ---------------------------------------------------------------------------
  const sortedForNeighbors = [...workouts].sort((a, b) => a.start.localeCompare(b.start));
  const neighborByKey = new Map<
    string,
    { priorEndIso: string | null; nextStartIso: string | null }
  >();
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

  const timezone = deps.getDeviceTimezone();
  let ingestedCount = 0;
  let failedCount = 0;
  let firstIngestError: string | null = null;

  for (const w of workouts) {
    const idempotencyKey = deps.workoutIdempotencyKey({
      startIso: w.start,
      endIso: w.end,
      activityId: w.activityId,
      sourceId: w.sourceId,
    });

    const diagnosticWorkout: WorkoutForDiagnostic = {
      start: w.start,
      end: w.end,
      activityId: w.activityId,
      activityName: w.activityName,
      sourceId: w.sourceId ?? null,
      durationMinutes: w.durationMinutes,
      ...(typeof w.distanceMeters === "number" ? { distanceMeters: w.distanceMeters } : {}),
      ...(typeof w.calories === "number" ? { calories: w.calories } : {}),
    };

    let physiologyBlock: WorkoutPhysiologyEnrichmentBlock | null = null;
    if (typeof deps.enrichWorkoutPhysiology === "function") {
      const neighbors =
        neighborByKey.get(idempotencyKey) ?? { priorEndIso: null, nextStartIso: null };
      try {
        physiologyBlock = await deps.enrichWorkoutPhysiology(diagnosticWorkout, { neighbors });
      } catch {
        // Swallowed by design — ingest proceeds with whatever fields were already present.
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
        // Distinguishes repair-origin payloads from anchored/range_bootstrap in logs
        // and on raw events. Backend already accepts a free-form `sync.mode` (see
        // `mapManualWorkout`); no schema change required.
        mode: "recent_repair" as const,
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
      idempotencyKey,
      timeoutMs: 15000,
    });
    if (res.ok) {
      ingestedCount += 1;
    } else {
      failedCount += 1;
      if (firstIngestError == null) firstIngestError = res.error;
    }
  }

  // Throttle marker is only advanced on a clean run. A partial failure (any
  // `failedCount > 0`) leaves the marker so the next focus retries the rejected
  // workouts; the idempotency key prevents duplicate writes on the success path.
  if (failedCount === 0) {
    await safeSetLastRunAtOnSuccess(deps, opts.uid, isoFromMs(now));
  }

  return {
    status: "ran",
    startDay,
    endDay,
    daysRequested,
    hkWorkoutCount,
    ingestedCount,
    failedCount,
    durationMs: elapsed(deps, startedMs),
    reason,
    latestNativeWorkoutStart,
    ...(firstIngestError != null ? { firstIngestError } : {}),
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function skippedResult(input: {
  startDay: string;
  endDay: string;
  daysRequested: number;
  reason: RecentWorkoutRepairReason;
  skippedReason: NonNullable<RecentWorkoutRepairResult["skippedReason"]>;
}): RecentWorkoutRepairResult {
  return {
    status: "skipped",
    startDay: input.startDay,
    endDay: input.endDay,
    daysRequested: input.daysRequested,
    hkWorkoutCount: 0,
    ingestedCount: 0,
    failedCount: 0,
    durationMs: 0,
    reason: input.reason,
    skippedReason: input.skippedReason,
  };
}

function elapsed(deps: RunRecentWorkoutRepairDeps, startedMs: number): number {
  const now = (deps.nowMs ?? (() => Date.now()))();
  return Math.max(0, now - startedMs);
}

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
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

async function safeGetLastRunAt(
  deps: RunRecentWorkoutRepairDeps,
  uid: string,
): Promise<string | null> {
  try {
    return await deps.getLastRunAt(uid);
  } catch {
    // Throttle read failure → behave as if no previous run; the worst case is one
    // extra repair pass, which is bounded by HK pagination + idempotent ingest.
    return null;
  }
}

async function safeSetLastRunAtOnSuccess(
  deps: RunRecentWorkoutRepairDeps,
  uid: string,
  iso: string,
): Promise<void> {
  try {
    await deps.setLastRunAtOnSuccess(uid, iso);
  } catch {
    // Marker write failure → next focus may run again; bounded by idempotency.
  }
}
