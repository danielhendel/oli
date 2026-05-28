import { useCallback } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import { runSleepPullToRefresh } from "@/lib/data/sleep/runSleepPullToRefresh";

export function useSleepPullToRefresh(args: {
  selectedDay: string;
  refetchSleep: (opts?: TruthGetOptions) => void | Promise<void>;
  /**
   * Optional. The Sleep overview screen no longer renders the weekly presence strip, so it omits
   * this. Other surfaces that still consume strip presence may pass it.
   */
  refetchWeekStrip?: () => void | Promise<void>;
}): { pullToRefreshSleep: () => Promise<{ didVendorSyncAndRecompute: boolean }> } {
  const { getIdToken } = useAuth();
  const { selectedDay, refetchSleep, refetchWeekStrip } = args;

  const pullToRefreshSleep = useCallback(async () => {
    return runSleepPullToRefresh({
      selectedDay,
      getIdToken,
      refetchSleep,
      ...(refetchWeekStrip != null ? { refetchWeekStrip } : {}),
    });
  }, [selectedDay, getIdToken, refetchSleep, refetchWeekStrip]);

  return { pullToRefreshSleep };
}
