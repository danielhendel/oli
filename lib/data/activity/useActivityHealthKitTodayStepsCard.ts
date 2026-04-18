import { useCallback, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { pullStepCountForLocalCalendarDay } from "@/lib/integrations/appleHealth";
import type { DayKey } from "@/lib/ui/calendar/types";

export type ActivityHealthKitTodayStepsCardState =
  | { status: "partial" }
  | { status: "ready"; steps: number }
  | { status: "failed"; error: string }
  | { status: "skipped" };

/**
 * Live HealthKit step total for one local calendar day (device TZ). Used for Activity “Today’s Steps”
 * so the card is not limited to persisted daily-facts lag. Non‑iOS or unsigned-in callers get `skipped`.
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

  useFocusEffect(
    useCallback(() => {
      if (!enabled || Platform.OS !== "ios") {
        setHkToday({ status: "skipped" });
        return undefined;
      }
      let cancelled = false;
      setHkToday({ status: "partial" });
      void pullStepCountForLocalCalendarDay(todayDayKey).then((r) => {
        if (cancelled) return;
        applyPullResult(r);
      });
      return () => {
        cancelled = true;
      };
    }, [applyPullResult, enabled, todayDayKey]),
  );

  const refreshHealthKitToday = useCallback(() => {
    if (!enabled || Platform.OS !== "ios") return;
    setHkToday({ status: "partial" });
    void pullStepCountForLocalCalendarDay(todayDayKey).then(applyPullResult);
  }, [applyPullResult, enabled, todayDayKey]);

  return { hkToday, refreshHealthKitToday };
}
