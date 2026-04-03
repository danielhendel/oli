import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ingestRawEvent } from "@/lib/api/ingest";
import {
  appleHealthBodyCompositionIdempotencyKey,
  appleHealthBodyWeightIdempotencyKey,
  pullBodyCompositionSamples,
  requestPermissions,
  runAppleHealthBodySync,
} from "@/lib/integrations/appleHealth";
import {
  getAppleHealthBodyLastCheckedAt,
  setAppleHealthBodyLastCheckedAt,
  setAppleHealthConnected,
  setLastSyncAt,
} from "@/lib/integrations/appleHealth/storage";
import { nowIso, shouldRun } from "@/lib/sync/throttle";

const BODY_SYNC_MIN_MS = 15 * 60 * 1000;
const DAYS_BACK = 45;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export function useAppleHealthBodySync(onSynced?: () => void): {
  isBodySyncing: boolean;
  syncAppleHealthBodyNow: () => Promise<void>;
  /** True after at least one successful incremental body sync in this session (pull + ingest OK). */
  hasSuccessfulBodySync: boolean;
} {
  const { user, getIdToken } = useAuth();
  const inFlight = useRef(false);
  const [isBodySyncing, setIsBodySyncing] = useState(false);
  const [hasSuccessfulBodySync, setHasSuccessfulBodySync] = useState(false);
  const previousUserUid = useRef<string | undefined>(undefined);

  useEffect(() => {
    const uid = user?.uid;
    if (previousUserUid.current !== uid && previousUserUid.current !== undefined) {
      setHasSuccessfulBodySync(false);
    }
    previousUserUid.current = uid;
  }, [user?.uid]);

  const runAppleHealthBodyIngest = useCallback(async () => {
    const token = await getIdToken(false);
    if (!token) return { ok: false as const };

    const perm = await requestPermissions();
    if (!perm.ok) return { ok: false as const };

    const result = await runAppleHealthBodySync(
      {
        token,
        startDate: isoDaysAgo(DAYS_BACK),
        endDate: new Date().toISOString(),
        limit: 200,
      },
      {
        pullBodyCompositionSamples,
        ingestRawEvent,
        appleHealthBodyWeightIdempotencyKey,
        appleHealthBodyCompositionIdempotencyKey,
        getDeviceTimezone,
      },
    );

    await setAppleHealthBodyLastCheckedAt(nowIso()).catch(() => undefined);

    if (!result.ok) return { ok: false as const };
    setHasSuccessfulBodySync(true);
    await setAppleHealthConnected(true).catch(() => undefined);
    await setLastSyncAt(nowIso()).catch(() => undefined);
    onSynced?.();
    return { ok: true as const };
  }, [getIdToken, onSynced]);

  const doSync = useCallback(
    async (opts: { skipThrottle: boolean }) => {
      if (!user || inFlight.current) return;
      if (!opts.skipThrottle) {
        const lastChecked = await getAppleHealthBodyLastCheckedAt().catch(() => null);
        if (!shouldRun(lastChecked, BODY_SYNC_MIN_MS)) return;
      }

      inFlight.current = true;
      setIsBodySyncing(true);
      try {
        await runAppleHealthBodyIngest();
      } finally {
        inFlight.current = false;
        setIsBodySyncing(false);
      }
    },
    [user, runAppleHealthBodyIngest],
  );

  const syncAppleHealthBodyNow = useCallback(async () => {
    await doSync({ skipThrottle: true });
  }, [doSync]);

  useEffect(() => {
    void doSync({ skipThrottle: false });
  }, [doSync, user?.uid]);

  return { isBodySyncing, syncAppleHealthBodyNow, hasSuccessfulBodySync };
}
