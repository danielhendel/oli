/**
 * Owns the active local calendar day key for Daily Monitor.
 * No network I/O. Updates after local midnight and when the app returns to foreground.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(250, next.getTime() - now.getTime() + 50);
}

export type UseCurrentLocalDayKeyResult = {
  dayKey: DayKey;
  /** Force re-read from the canonical local-day helper (e.g. tests). */
  refreshDayKey: () => void;
};

export function useCurrentLocalDayKey(): UseCurrentLocalDayKeyResult {
  const [dayKey, setDayKey] = useState<DayKey>(() => getTodayDayKeyLocal());
  const dayKeyRef = useRef(dayKey);
  dayKeyRef.current = dayKey;

  const refreshDayKey = useCallback(() => {
    const next = getTodayDayKeyLocal();
    if (next !== dayKeyRef.current) {
      setDayKey(next);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleMidnight = () => {
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(() => {
        refreshDayKey();
        scheduleMidnight();
      }, msUntilNextLocalMidnight());
      // Allow Jest / process exit while a long midnight timer is pending.
      if (typeof (timer as { unref?: () => void }).unref === "function") {
        (timer as { unref: () => void }).unref();
      }
    };

    scheduleMidnight();

    const onAppState = (next: AppStateStatus) => {
      if (next === "active") {
        refreshDayKey();
        scheduleMidnight();
      }
    };
    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      if (timer != null) clearTimeout(timer);
      sub.remove();
    };
  }, [refreshDayKey]);

  return { dayKey, refreshDayKey };
}
