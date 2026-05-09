import { InteractionManager, Platform } from "react-native";

import { ingestRawEvent } from "@/lib/api/ingest";
import {
  getAppleHealthConnected,
  getAppleHealthStepsAutoRepairLastCompletedAt,
  getAppleHealthStepsBackfillState,
  setAppleHealthStepsAutoRepairLastCompletedAt,
  setAppleHealthStepsBackfillState,
  type AppleHealthStepsRepairTriggerSource,
} from "@/lib/integrations/appleHealth/storage";
import {
  pullStepCountForLocalCalendarDay,
  requestPermissions,
  runAppleHealthStepsBackfill,
  stepsIdempotencyKey,
} from "@/lib/integrations/appleHealth";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { nowIso } from "@/lib/sync/throttle";
import { APPLE_HEALTH_STEPS_BACKFILL_TRAILING_LOCAL_DAYS } from "@/lib/integrations/appleHealth/runAppleHealthStepsBackfill";
import { runForcedLocalTodayAppleHealthStepsIngest } from "@/lib/data/activity/appleHealthForcedLocalTodaySteps";
import { runForcedLocalYesterdayAppleHealthStepsIngest } from "@/lib/data/activity/appleHealthForcedLocalYesterdaySteps";
import { detectAppleHealthStepsRawGapsForRecentDays } from "@/lib/data/activity/detectAppleHealthStepsRawGaps";
import { runAppleHealthStepsBackfillSerialized } from "@/lib/data/activity/appleHealthStepsBackfillMutex";
import { stepsRepairCooldownAllowsRun } from "@/lib/data/activity/stepsRepairCooldown";
import { scheduleDailyFactsInvalidationAfterIngest } from "@/lib/data/dailyFactsSessionCache";

export { STEPS_REPAIR_AUTO_COOLDOWN_MS, stepsRepairCooldownAllowsRun } from "@/lib/data/activity/stepsRepairCooldown";

const RECENT_GAP_DAYS = 7;

function ingestRawEventNarrow(
  body: unknown,
  token: string,
  opts: { idempotencyKey: string; timeoutMs: number },
): Promise<{ ok: true } | { ok: false; error: string; requestId: string | null }> {
  return ingestRawEvent(body, token, opts).then((r) => {
    if (r.ok) return { ok: true as const };
    return { ok: false as const, error: r.error, requestId: r.requestId };
  });
}

export type ScheduleAppleHealthStepsRepairOpts = {
  trigger: AppleHealthStepsRepairTriggerSource;
  /** When true, skip cooldown (first repair after Health permissions / body connect). */
  bypassCooldown?: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  /**
   * Default: trailing {@link APPLE_HEALTH_STEPS_BACKFILL_TRAILING_LOCAL_DAYS} local days.
   * When `trigger === "recovery"` and gaps exist, the repair still uses at least this default so the window covers recent gaps.
   */
  lookbackDays?: number;
  /** When true, discard in-progress backfill state and restart from window start. */
  forceRestart?: boolean;
  /**
   * Authenticated user uid. When provided and the run successfully ingests the local "today",
   * the coordinator schedules a deferred {@link invalidateDailyFactsSessionCache} for that day
   * so subscribers (e.g. {@link useDailyFacts}) refetch after the backend recompute lands.
   * Optional only for legacy/no-user paths; missing uid silently disables the post-ingest refresh.
   */
  userUid?: string;
};

async function isOutsideAutoCooldown(bypass: boolean): Promise<boolean> {
  const last = await getAppleHealthStepsAutoRepairLastCompletedAt().catch(() => null);
  return stepsRepairCooldownAllowsRun({
    lastCompletedAtIso: last,
    nowMs: Date.now(),
    bypassCooldown: bypass,
  });
}

/**
 * Runs trailing-local-days steps backfill with HealthKit + ingest. Serialized so sync + gap + connection do not overlap.
 *
 * Always runs {@link runForcedLocalTodayAppleHealthStepsIngest} and
 * {@link runForcedLocalYesterdayAppleHealthStepsIngest} first (both bypass gap detection,
 * raw presence, repair cooldown, and client monotonic ingest guard) so the current and
 * previous local calendar days can finalize via the normal raw → canonical → dailyFacts pipeline.
 *
 * Today must be a forced ingest because the gap probe used by the recovery branch checks
 * for missing rawEvent docs only — it sees today's existing (but stale) doc and skips repair,
 * leaving `dailyFacts.activity.steps` (and Daily Energy NEAT) frozen at the morning total.
 */
export async function executeAppleHealthStepsRepair(opts: ScheduleAppleHealthStepsRepairOpts): Promise<void> {
  if (Platform.OS !== "ios") return;
  await runAppleHealthStepsBackfillSerialized(async () => {
    await runForcedLocalTodayAppleHealthStepsIngest({
      getIdToken: opts.getIdToken,
      ...(opts.userUid ? { userUid: opts.userUid } : {}),
    });
    await runForcedLocalYesterdayAppleHealthStepsIngest(opts.getIdToken);
    await runRepairInner(opts);
  });
}

async function runRepairInner(opts: ScheduleAppleHealthStepsRepairOpts): Promise<void> {
  const connected = await getAppleHealthConnected().catch(() => false);
  if (!connected) return;

  if (!(await isOutsideAutoCooldown(opts.bypassCooldown === true))) return;

  const token = await opts.getIdToken(false);
  if (!token) return;

  const today = getTodayDayKeyLocal();

  if (opts.trigger === "recovery") {
    const { gaps, probeReliable } = await detectAppleHealthStepsRawGapsForRecentDays(token, today, RECENT_GAP_DAYS);
    // When the gap probe fails (e.g. raw-events 400), do not skip repair — empty gaps would be a false negative.
    if (probeReliable && gaps.length === 0) return;
  }

  const perm = await requestPermissions();
  if (!perm.ok) return;

  const defaultLookback = APPLE_HEALTH_STEPS_BACKFILL_TRAILING_LOCAL_DAYS;
  const lookbackDays =
    opts.trigger === "recovery"
      ? Math.max(defaultLookback, opts.lookbackDays ?? defaultLookback)
      : Math.max(1, opts.lookbackDays ?? defaultLookback);

  const forceRestart =
    opts.forceRestart !== undefined
      ? opts.forceRestart
      : opts.trigger === "recovery" || opts.trigger === "connection";

  try {
    const result = await runAppleHealthStepsBackfill(
      {
        token,
        forceRestart,
        lookbackDays,
        triggerSource: opts.trigger,
      },
      {
        nowIso,
        getTodayDayKeyLocal,
        getDeviceTimezone: () => {
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            return typeof tz === "string" && tz.length ? tz : "UTC";
          } catch {
            return "UTC";
          }
        },
        pullStepCountForLocalCalendarDay,
        ingestRawEvent: ingestRawEventNarrow,
        stepsIdempotencyKey,
        getBackfillState: getAppleHealthStepsBackfillState,
        setBackfillState: setAppleHealthStepsBackfillState,
      },
    );

    // Backend pipeline (rawEvent UPDATE → onRawEventUpdatedForNormalization →
    // recomputeDerivedTruthForDay) writes a fresh `dailyFacts/{today}` doc with
    // updated activity.steps and energy.factors.steps. Tell client subscribers
    // (e.g. Dash Daily Energy via useDailyFacts) to refetch *after* the recompute
    // settles. Skipped silently if no uid was provided or no day was actually ingested.
    if (
      result.ok &&
      result.daysIngested > 0 &&
      typeof opts.userUid === "string" &&
      opts.userUid.length > 0 &&
      today >= result.windowStartDay &&
      today <= result.windowEndDay
    ) {
      scheduleDailyFactsInvalidationAfterIngest({ userUid: opts.userUid, day: today });
    }
  } finally {
    await setAppleHealthStepsAutoRepairLastCompletedAt(nowIso()).catch(() => undefined);
  }
}

/**
 * Non-blocking: queues repair after interactions complete. Safe to call from sync handlers and focus effects.
 */
export function scheduleAppleHealthStepsRepair(opts: ScheduleAppleHealthStepsRepairOpts): void {
  InteractionManager.runAfterInteractions(() => {
    void executeAppleHealthStepsRepair(opts).catch(() => undefined);
  });
}
