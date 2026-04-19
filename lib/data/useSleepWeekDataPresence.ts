import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getDailyFacts, getOuraSleepView } from "@/lib/api/usersMe";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { dailyFactsHasSleepSignal } from "@/lib/data/sleep/sleepFactsSignal";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

import {
  mergeOuraWeekPresenceMaps,
  partitionOuraWeekPresenceDayKeys,
} from "@/lib/data/oura/useOuraViewWeekSnapshotPresence";

/**
 * Per-day presence: DailyFacts sleep signal first, else legacy Oura vendor snapshot (transition).
 */
async function dayHasSleepData(day: string, token: string): Promise<boolean> {
  const factsRes = await getDailyFacts(day, token);
  const factsOutcome = truthOutcomeFromApiResult(factsRes);
  if (factsOutcome.status === "ready" && dailyFactsHasSleepSignal(factsOutcome.data.sleep)) {
    return true;
  }
  const ouraRes = await getOuraSleepView(day, token);
  return truthOutcomeFromApiResult(ouraRes).status === "ready";
}

type State =
  | { status: "partial" }
  | {
      status: "ready";
      hasSleepDataByDay: Record<string, boolean>;
    };

export function useSleepWeekDataPresence(
  dayKeys: readonly string[],
): State & { refetch: () => void } {
  const { user, initializing, getIdToken } = useAuth();
  const dayKeysRef = useRef(dayKeys);
  dayKeysRef.current = dayKeys;
  const requestSeq = useRef(0);

  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [state, setState] = useState<State>({ status: "partial" });

  const fetchAll = useCallback(async () => {
    const seq = ++requestSeq.current;
    const keys = [...dayKeysRef.current];
    const { initializing: init, userUid, getIdToken: getToken } = authRef.current;

    const safeSet = (next: State) => {
      if (seq === requestSeq.current) setState(next);
    };

    if (init || !userUid || keys.length === 0) {
      safeSet({ status: "ready", hasSleepDataByDay: {} });
      return;
    }

    const todayDayKey = getTodayDayKeyLocal();
    const { noSnapshotFutureDays, daysToFetch } = partitionOuraWeekPresenceDayKeys(keys, todayDayKey);

    if (daysToFetch.length === 0) {
      safeSet({ status: "ready", hasSleepDataByDay: { ...noSnapshotFutureDays } });
      return;
    }

    safeSet({ status: "partial" });

    const token = await getToken(false);
    if (!token || seq !== requestSeq.current) return;

    const results = await Promise.all(
      daysToFetch.map(async (day) => {
        const has = await dayHasSleepData(day, token);
        return [day, has] as const;
      }),
    );

    if (seq !== requestSeq.current) return;

    const hasSleepDataByDay = mergeOuraWeekPresenceMaps(noSnapshotFutureDays, results);
    safeSet({ status: "ready", hasSleepDataByDay });
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, user?.uid, dayKeys.join(",")]);

  return useMemo(() => ({ ...state, refetch: fetchAll }), [state, fetchAll]);
}
