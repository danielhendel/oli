/**
 * Pure coordinated Daily Monitor refresh (no React / no I/O side effects except via deps).
 * Deduplication and refreshing UI state live in {@link useDailyMonitorRefresh}.
 */

import type { DayKey } from "@/lib/ui/calendar/types";
import type { DailyMonitorDomainId } from "@/lib/data/dash/dailyMonitorPresence";

export type DailyMonitorRefreshResult = {
  succeededDomains: DailyMonitorDomainId[];
  failedDomains: DailyMonitorDomainId[];
};

export type DailyMonitorRefreshReason = "pull" | "focus" | "foreground" | "retry";

export type DailyMonitorRefreshDeps = {
  userUid: string | null;
  dayKey: DayKey;
  /** Invalidate shared DailyFacts session cache and notify all `useDailyFacts` subscribers. */
  invalidateDailyFacts: (input: { userUid: string; day: string }) => void;
  /** Queue Apple Health steps repair (Activity focus parity). */
  scheduleStepsRepair: () => void;
  /** Bust bounded Workout/Cardio calendar hydrates for mounted ranges. */
  invalidateWorkoutCalendar: () => void;
  refetchSleep: (opts: { cacheBust: string }) => void;
  refetchReadiness: (opts: { cacheBust: string }) => void;
  refetchStress: (opts: { cacheBust: string }) => void;
  /** Re-read local calendar day (optional; prefer {@link useCurrentLocalDayKey}). */
  refreshDayKey?: () => void;
};

/**
 * One coordinated Monitor refresh. Does not call APIs directly.
 * Shared DailyFacts are refreshed via invalidation (all subscribers), not per-card GETs from the screen.
 */
export function runDailyMonitorRefresh(
  deps: DailyMonitorRefreshDeps,
  input: { reason: DailyMonitorRefreshReason; bust?: string },
): DailyMonitorRefreshResult {
  const bust = input.bust ?? `dailyMonitor:${input.reason}:${Date.now()}`;
  const succeeded: DailyMonitorDomainId[] = [];
  const failed: DailyMonitorDomainId[] = [];

  const hasUser = deps.userUid != null && deps.userUid.length > 0;

  if (hasUser) {
    try {
      deps.scheduleStepsRepair();
      deps.invalidateDailyFacts({ userUid: deps.userUid!, day: deps.dayKey });
      // Energy + Nutrition share DailyFacts with Activity.
      succeeded.push("activity", "energy", "nutrition");
    } catch {
      failed.push("activity", "energy", "nutrition");
    }
  } else {
    failed.push("activity", "energy", "nutrition");
  }

  try {
    deps.refetchSleep({ cacheBust: bust });
    succeeded.push("sleep");
  } catch {
    failed.push("sleep");
  }

  try {
    deps.refetchReadiness({ cacheBust: bust });
    succeeded.push("readiness");
  } catch {
    failed.push("readiness");
  }

  try {
    deps.refetchStress({ cacheBust: bust });
    succeeded.push("stress");
  } catch {
    failed.push("stress");
  }

  try {
    deps.invalidateWorkoutCalendar();
    succeeded.push("workout", "cardio");
  } catch {
    failed.push("workout", "cardio");
  }

  return {
    succeededDomains: uniqueDomains(succeeded),
    failedDomains: uniqueDomains(failed),
  };
}

function uniqueDomains(ids: DailyMonitorDomainId[]): DailyMonitorDomainId[] {
  return [...new Set(ids)];
}

/** Quiet focus/foreground refreshes within this window share one in-flight / skip. */
export const DAILY_MONITOR_QUIET_REFRESH_DEDUPE_MS = 2_000;
