import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ingestRawEvent } from "@/lib/api/ingest";
import {
  appleHealthBodyCompositionIdempotencyKey,
  appleHealthBodyWeightIdempotencyKey,
  pullBodyCompositionSamples,
  requestPermissions,
  runAppleHealthBodyBackfill,
} from "@/lib/integrations/appleHealth";
import {
  getAppleHealthBodyBackfillState,
  setAppleHealthBodyBackfillState,
  type AppleHealthBodyBackfillState,
} from "@/lib/integrations/appleHealth/storage";
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
  summary: AppleHealthBodyBackfillState["summary"] | null;
};

export function useAppleHealthBodyBackfill(onSynced?: () => void): {
  state: LocalState;
  start: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { user, getIdToken } = useAuth();
  const [state, setState] = useState<LocalState>({
    status: "idle",
    message: null,
    summary: null,
  });

  const refresh = useCallback(async () => {
    const s = await getAppleHealthBodyBackfillState().catch(() => null);
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

  const start = useCallback(async () => {
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
        message: perm.error ?? "Apple Health permission is required for body history.",
      }));
      return;
    }
    const res = await runAppleHealthBodyBackfill(
      { token },
      {
        nowIso,
        pullBodyCompositionSamples,
        ingestRawEvent,
        appleHealthBodyWeightIdempotencyKey,
        appleHealthBodyCompositionIdempotencyKey,
        getDeviceTimezone,
        getBackfillState: getAppleHealthBodyBackfillState,
        setBackfillState: setAppleHealthBodyBackfillState,
      },
    );
    if (!res.ok) {
      await refresh();
      setState((prev) => ({ ...prev, status: "failed", message: res.error }));
      return;
    }
    await refresh();
    onSynced?.();
  }, [user, getIdToken, refresh, onSynced]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.uid]);

  return { state, start, refresh };
}
