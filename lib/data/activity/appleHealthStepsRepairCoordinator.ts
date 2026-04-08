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
import { computeLocalYtdLookbackDays } from "@/lib/integrations/appleHealth/runAppleHealthStepsBackfill";
import { detectAppleHealthStepsRawGapsForRecentDays } from "@/lib/data/activity/detectAppleHealthStepsRawGaps";
import { runAppleHealthStepsBackfillSerialized } from "@/lib/data/activity/appleHealthStepsBackfillMutex";
import { stepsRepairCooldownAllowsRun } from "@/lib/data/activity/stepsRepairCooldown";

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
   * Default: YTD local (`computeLocalYtdLookbackDays(today)`).
   * Ignored when `trigger === "recovery"` and gaps exist — then uses at least YTD so the window always covers gaps.
   */
  lookbackDays?: number;
  /** When true, discard in-progress backfill state and restart from window start. */
  forceRestart?: boolean;
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
 * Runs YTD (or custom lookback) steps backfill with HealthKit + ingest. Serialized so sync + gap + connection do not overlap.
 */
export async function executeAppleHealthStepsRepair(opts: ScheduleAppleHealthStepsRepairOpts): Promise<void> {
  if (Platform.OS !== "ios") return;
  await runAppleHealthStepsBackfillSerialized(() => runRepairInner(opts));
}

async function runRepairInner(opts: ScheduleAppleHealthStepsRepairOpts): Promise<void> {
  const connected = await getAppleHealthConnected().catch(() => false);
  if (!connected) return;

  if (!(await isOutsideAutoCooldown(opts.bypassCooldown === true))) return;

  const token = await opts.getIdToken(false);
  if (!token) return;

  if (opts.trigger === "recovery") {
    const today = getTodayDayKeyLocal();
    const { gaps, probeReliable } = await detectAppleHealthStepsRawGapsForRecentDays(token, today, RECENT_GAP_DAYS);
    // When the gap probe fails (e.g. raw-events 400), do not skip repair — empty gaps would be a false negative.
    if (probeReliable && gaps.length === 0) return;
  }

  const perm = await requestPermissions();
  if (!perm.ok) return;

  const today = getTodayDayKeyLocal();
  const ytd = computeLocalYtdLookbackDays(today);
  const lookbackDays =
    opts.trigger === "recovery"
      ? Math.max(ytd, opts.lookbackDays ?? ytd)
      : Math.max(1, opts.lookbackDays ?? ytd);

  const forceRestart =
    opts.forceRestart !== undefined
      ? opts.forceRestart
      : opts.trigger === "recovery" || opts.trigger === "connection";

  try {
    await runAppleHealthStepsBackfill(
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
