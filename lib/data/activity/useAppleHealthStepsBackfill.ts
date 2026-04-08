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
  });

  const refresh = useCallback(async () => {
    const s = await getAppleHealthStepsBackfillState().catch(() => null);
    if (!s) {
      setState({ status: "idle", message: null, summary: null });
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
      const runOpts =
        opts?.lookbackDays != null || opts?.forceRestart === true
          ? {
              token,
              ...(opts.lookbackDays != null ? { lookbackDays: opts.lookbackDays } : {}),
              ...(opts.forceRestart === true ? { forceRestart: true as const } : {}),
            }
          : { token };
      const res = await runAppleHealthStepsBackfill(runOpts, {
          nowIso,
          getTodayDayKeyLocal,
          getDeviceTimezone,
          pullStepCountForLocalCalendarDay,
          ingestRawEvent,
          stepsIdempotencyKey,
          getBackfillState: getAppleHealthStepsBackfillState,
          setBackfillState: setAppleHealthStepsBackfillState,
        });
      if (!res.ok) {
        await refresh();
        setState((prev) => ({ ...prev, status: "failed", message: res.error }));
        return;
      }
      await refresh();
      setState((prev) => ({ ...prev, status: "completed", message: null }));
      onSynced?.();
    },
    [user, getIdToken, refresh, onSynced],
  );

  useEffect(() => {
    void refresh();
  }, [refresh, user?.uid]);

  return { state, start, refresh };
}
