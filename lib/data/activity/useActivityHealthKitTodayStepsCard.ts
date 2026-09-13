// lib/data/activity/useActivityHealthKitTodayStepsCard.ts
import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { pullStepCountForLocalCalendarDay } from "@/lib/integrations/appleHealth";
import { getAppleHealthConnected } from "@/lib/integrations/appleHealth/storage";
import type { DayKey } from "@/lib/ui/calendar/types";

export type ActivityHealthKitTodayStepsCardState =
  | { status: "partial" }
  | { status: "ready"; steps: number }
  | { status: "failed"; error: string }
  | { status: "skipped" };

/**
 * Live HealthKit step total for one local calendar day (device TZ).
 * Requires an explicit current-account Apple Health connection — device
 * permission alone must not authorize a HealthKit query.
 */
export function useActivityHealthKitTodayStepsCard(opts: { todayDayKey: DayKey; enabled: boolean }): {
  hkToday: ActivityHealthKitTodayStepsCardState;
  refreshHealthKitToday: () => void;
} {
  const { todayDayKey, enabled } = opts;

  const [hkToday, setHkToday] = useState<ActivityHealthKitTodayStepsCardState>(() =>
    !enabled || Platform.OS !== "ios" ? { status: "skipped" } : { status: "partial" },
  );

  const applyPullResult = useCallback((r: Awaited<ReturnType<typeof pullStepCountForLocalCalendarDay>>) => {
    if (r.ok) {
      setHkToday({ status: "ready", steps: Math.max(0, r.steps) });
    } else {
      setHkToday({ status: "failed", error: r.error });
    }
  }, []);

  const pullIfConnected = useCallback(async () => {
    if (!enabled || Platform.OS !== "ios") {
      setHkToday({ status: "skipped" });
      return;
    }
    const connected = await getAppleHealthConnected().catch(() => false);
    if (!connected) {
      setHkToday({ status: "skipped" });
      return;
    }
    setHkToday({ status: "partial" });
    const r = await pullStepCountForLocalCalendarDay(todayDayKey);
    applyPullResult(r);
  }, [applyPullResult, enabled, todayDayKey]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        if (!enabled || Platform.OS !== "ios") {
          if (!cancelled) setHkToday({ status: "skipped" });
          return;
        }
        const connected = await getAppleHealthConnected().catch(() => false);
        if (cancelled) return;
        if (!connected) {
          setHkToday({ status: "skipped" });
          return;
        }
        setHkToday({ status: "partial" });
        const r = await pullStepCountForLocalCalendarDay(todayDayKey);
        if (cancelled) return;
        applyPullResult(r);
      })();
      return () => {
        cancelled = true;
      };
    }, [applyPullResult, enabled, todayDayKey]),
  );

  const refreshHealthKitToday = useCallback(() => {
    void pullIfConnected();
  }, [pullIfConnected]);

  return { hkToday, refreshHealthKitToday };
}
