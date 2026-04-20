import { useCallback } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import { runSleepPullToRefresh } from "@/lib/data/sleep/runSleepPullToRefresh";

export function useSleepPullToRefresh(args: {
  selectedDay: string;
  refetchSleep: (opts?: TruthGetOptions) => void | Promise<void>;
  refetchWeekStrip: () => void | Promise<void>;
}): { pullToRefreshSleep: () => Promise<{ didVendorSyncAndRecompute: boolean }> } {
  const { getIdToken } = useAuth();
  const { selectedDay, refetchSleep, refetchWeekStrip } = args;

  const pullToRefreshSleep = useCallback(async () => {
    return runSleepPullToRefresh({
      selectedDay,
      getIdToken,
      refetchSleep,
      refetchWeekStrip,
    });
  }, [selectedDay, getIdToken, refetchSleep, refetchWeekStrip]);

  return { pullToRefreshSleep };
}
