import type { ActivityStepsRollupMap, DayStepsRollupEntry } from "@/lib/data/activity/activityOverviewRollupTypes";
import type { DayKey } from "@/lib/ui/calendar/types";

export type ActivityRollupInlineError = {
  message: string;
  requestId: string | null;
  onRetry: () => void;
};

/**
 * When some daily-facts fetches fail, surface a partial error (remaining days may still be numeric).
 */
export function buildActivityRollupAggregateError(
  rollupByDay: ActivityStepsRollupMap,
  onRetry: () => void,
): ActivityRollupInlineError | null {
  let failed = 0;
  let requestId: string | null = null;
  for (const v of Object.values(rollupByDay)) {
    if (v?.kind === "error") {
      failed += 1;
      if (requestId == null && v.requestId != null) requestId = v.requestId;
    }
  }
  if (failed === 0) return null;
  return {
    message:
      failed === 1
        ? "Couldn’t load steps for one day. Other days may still show below."
        : `Couldn’t load steps for ${failed} days. Other days may still show below.`,
    requestId,
    onRetry,
  };
}

export function buildActivitySelectedDayRollupError(
  selectedDay: DayKey,
  rollupByDay: ActivityStepsRollupMap,
  onRetry: () => void,
): ActivityRollupInlineError | null {
  const e = rollupByDay[selectedDay];
  if (e?.kind !== "error") return null;
  return {
    message: e.message,
    requestId: e.requestId,
    onRetry,
  };
}

/** For tests and diagnostics: HTTP/API failures must not be conflated with absent rollups. */
export function rollupEntryIsFailure(entry: DayStepsRollupEntry | undefined): boolean {
  return entry?.kind === "error";
}
