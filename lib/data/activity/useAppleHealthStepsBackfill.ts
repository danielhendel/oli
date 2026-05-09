import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ingestRawEvent } from "@/lib/api/ingest";
import {
  pullStepCountForLocalCalendarDay,
  requestPermissions,
  runAppleHealthStepsBackfill,
  stepsIdempotencyKey,
} from "@/lib/integrations/appleHealth";
import {
  getAppleHealthStepsBackfillState,
  setAppleHealthStepsBackfillState,
  type AppleHealthStepsBackfillState,
} from "@/lib/integrations/appleHealth/storage";
import { runAppleHealthStepsBackfillSerialized } from "@/lib/data/activity/appleHealthStepsBackfillMutex";
<<<<<<< HEAD
import { scheduleDailyFactsInvalidationAfterIngest } from "@/lib/data/dailyFactsSessionCache";
=======
import { invalidateDailyFactsSessionCache } from "@/lib/data/dailyFactsSessionCache";
>>>>>>> origin/main
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { nowIso } from "@/lib/sync/throttle";

function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

type LocalState = {
  status: "idle" | "running" | "completed" | "failed";
  message: string | null;
  summary: AppleHealthStepsBackfillState["summary"] | null;
  windowStartDay: string | null;
  windowEndDay: string | null;
  lastTriggerSource: AppleHealthStepsBackfillState["lastTriggerSource"];
};

export function useAppleHealthStepsBackfill(onSynced?: () => void): {
  state: LocalState;
  start: (opts?: { lookbackDays?: number; forceRestart?: boolean }) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { user, getIdToken } = useAuth();
  const [state, setState] = useState<LocalState>({
    status: "idle",
    message: null,
    summary: null,
    windowStartDay: null,
    windowEndDay: null,
    lastTriggerSource: null,
  });

  const refresh = useCallback(async () => {
    const s = await getAppleHealthStepsBackfillState().catch(() => null);
    if (!s) {
      setState({
        status: "idle",
        message: null,
        summary: null,
        windowStartDay: null,
        windowEndDay: null,
        lastTriggerSource: null,
      });
      return;
    }
    setState({
      status:
        s.status === "in_progress"
          ? "running"
          : s.status === "completed"
            ? "completed"
            : s.status === "failed"
              ? "failed"
              : "idle",
      message: s.error,
      summary: s.summary,
      windowStartDay: s.windowStartDay,
      windowEndDay: s.windowEndDay,
      lastTriggerSource: s.lastTriggerSource ?? null,
    });
  }, []);

  const start = useCallback(
    async (opts?: { lookbackDays?: number; forceRestart?: boolean }) => {
      if (!user) {
        setState((prev) => ({ ...prev, status: "failed", message: "Sign in required." }));
        return;
      }
      setState((prev) => ({ ...prev, status: "running", message: null }));
      const token = await getIdToken(false);
      if (!token) {
        setState((prev) => ({ ...prev, status: "failed", message: "No auth token." }));
        return;
      }
      const perm = await requestPermissions();
      if (!perm.ok) {
        setState((prev) => ({
          ...prev,
          status: "failed",
          message: perm.error ?? "Apple Health permission is required for steps history.",
        }));
        return;
      }
      const runOpts = {
        token,
        triggerSource: "manual" as const,
        ...(opts?.lookbackDays != null ? { lookbackDays: opts.lookbackDays } : {}),
        ...(opts?.forceRestart === true ? { forceRestart: true as const } : {}),
      };
      const res = await runAppleHealthStepsBackfillSerialized(() =>
        runAppleHealthStepsBackfill(runOpts, {
          nowIso,
          getTodayDayKeyLocal,
          getDeviceTimezone,
          pullStepCountForLocalCalendarDay,
          ingestRawEvent,
          stepsIdempotencyKey,
          getBackfillState: getAppleHealthStepsBackfillState,
          setBackfillState: setAppleHealthStepsBackfillState,
        }),
      );
      if (!res.ok) {
        await refresh();
        setState((prev) => ({ ...prev, status: "failed", message: res.error }));
        return;
      }
      await refresh();
      setState((prev) => ({ ...prev, status: "completed", message: null }));
<<<<<<< HEAD
      // Defer cache invalidation so consumers (useDailyFacts → useDailyEnergyCard) refetch
      // *after* the rawEvent UPDATE → normalization → recomputeForDay pipeline settles.
      // Activity / Weekly Fitness already merge live HealthKit `today` into the UI; Daily
      // Energy depends on persisted `dailyFacts.energy.factors.steps`, so we wait for the
      // recompute before nudging a refetch.
      if (res.ok && res.daysIngested > 0) {
        scheduleDailyFactsInvalidationAfterIngest({
          userUid: user.uid,
          day: getTodayDayKeyLocal(),
        });
      }
=======
      invalidateDailyFactsSessionCache({ userUid: user.uid, day: getTodayDayKeyLocal() });
>>>>>>> origin/main
      onSynced?.();
    },
    [user, getIdToken, refresh, onSynced],
  );

  useEffect(() => {
    void refresh();
  }, [refresh, user?.uid]);

  return { state, start, refresh };
}
