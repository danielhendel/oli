import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getOuraReadinessView, getOuraSleepView } from "@/lib/api/usersMe";
import { isOuraViewAlignedToDay } from "@/lib/data/oura/isOuraViewAlignedToDay";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export type OuraRecoveryViewKind = "sleep" | "readiness";

/**
 * Split week strip days: future (local calendar) → no snapshot, no fetch; today and past → query API.
 * YYYY-MM-DD string order matches chronological order.
 */
export function partitionOuraWeekPresenceDayKeys(
  dayKeys: readonly string[],
  todayDayKey: string,
): { noSnapshotFutureDays: Record<string, boolean>; daysToFetch: string[] } {
  const noSnapshotFutureDays: Record<string, boolean> = {};
  const daysToFetch: string[] = [];
  for (const day of dayKeys) {
    if (day > todayDayKey) {
      noSnapshotFutureDays[day] = false;
    } else {
      daysToFetch.push(day);
    }
  }
  return { noSnapshotFutureDays, daysToFetch };
}

export function mergeOuraWeekPresenceMaps(
  noSnapshotFutureDays: Record<string, boolean>,
  fetched: readonly (readonly [string, boolean])[],
): Record<string, boolean> {
  const out: Record<string, boolean> = { ...noSnapshotFutureDays };
  for (const [day, has] of fetched) {
    out[day] = has;
  }
  return out;
}

type State =
  | { status: "partial" }
  | {
      status: "ready";
      /** True when GET oura-*-view returned 200 with a valid DTO (synced snapshot exists for that day). */
      hasSnapshotByDay: Record<string, boolean>;
    };

/**
 * Per-day Oura snapshot presence for a week strip. Uses existing per-day view endpoints only (no new API).
 */
export function useOuraViewWeekSnapshotPresence(
  dayKeys: readonly string[],
  kind: OuraRecoveryViewKind,
): State & { refetch: () => void } {
  const { user, initializing, getIdToken } = useAuth();
  const dayKeysRef = useRef(dayKeys);
  dayKeysRef.current = dayKeys;
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const requestSeq = useRef(0);

  /** Stable across renders; read inside async fetch to avoid unstable useCallback deps (e.g. mock useAuth). */
  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [state, setState] = useState<State>({ status: "partial" });

  const fetchAll = useCallback(async () => {
    const seq = ++requestSeq.current;
    const keys = [...dayKeysRef.current];
    const k = kindRef.current;
    const { initializing: init, userUid, getIdToken: getToken } = authRef.current;

    const safeSet = (next: State) => {
      if (seq === requestSeq.current) setState(next);
    };

    if (init || !userUid || keys.length === 0) {
      safeSet({ status: "ready", hasSnapshotByDay: {} });
      return;
    }

    const todayDayKey = getTodayDayKeyLocal();
    const { noSnapshotFutureDays, daysToFetch } = partitionOuraWeekPresenceDayKeys(keys, todayDayKey);

    if (daysToFetch.length === 0) {
      safeSet({ status: "ready", hasSnapshotByDay: { ...noSnapshotFutureDays } });
      return;
    }

    safeSet({ status: "partial" });

    const token = await getToken(false);
    if (!token || seq !== requestSeq.current) return;

    const results = await Promise.all(
      daysToFetch.map(async (day) => {
        const res =
          k === "sleep" ? await getOuraSleepView(day, token) : await getOuraReadinessView(day, token);
        const outcome = truthOutcomeFromApiResult(res);
        const has = outcome.status === "ready" && isOuraViewAlignedToDay(outcome.data, day);
        return [day, has] as const;
      }),
    );

    if (seq !== requestSeq.current) return;

    const hasSnapshotByDay = mergeOuraWeekPresenceMaps(noSnapshotFutureDays, results);
    safeSet({ status: "ready", hasSnapshotByDay });
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, kind, user?.uid, dayKeys.join(",")]);

  return useMemo(() => ({ ...state, refetch: fetchAll }), [state, fetchAll]);
}
