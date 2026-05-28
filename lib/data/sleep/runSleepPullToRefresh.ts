import { postOuraSleepDayRefresh } from "@/lib/api/ouraSleepDayRefresh";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export type SleepPullToRefreshDeps = {
  selectedDay: string;
  /** Override for tests (defaults to local calendar “today”). */
  todayDayKey?: string;
  getIdToken: (forceRefresh: boolean) => Promise<string | null>;
  refetchSleep: (opts?: TruthGetOptions) => void | Promise<void>;
  /**
   * Optional. Previously triggered the weekly-strip presence map, which the Sleep page no longer
   * renders. Kept here so other surfaces (calendar, recovery) can still pass a refresher; the
   * Sleep overview screen omits it.
   */
  refetchWeekStrip?: () => void | Promise<void>;
};

/**
 * Sleep pull-to-refresh: on the latest calendar day, run Oura sync + server recompute, then refetch UI.
 * Historical days only refetch (no vendor sync / recompute).
 */
export async function runSleepPullToRefresh(deps: SleepPullToRefreshDeps): Promise<{
  didVendorSyncAndRecompute: boolean;
}> {
  const today = deps.todayDayKey ?? getTodayDayKeyLocal();
  const bust = Date.now();
  let didVendorSyncAndRecompute = false;

  if (deps.selectedDay === today) {
    const token = await deps.getIdToken(false);
    if (token) {
      didVendorSyncAndRecompute = true;
      const idem = `sleep-day-refresh:${deps.selectedDay}:${bust}`;
      const refreshRes = await postOuraSleepDayRefresh(
        token,
        { day: deps.selectedDay },
        { idempotencyKey: idem, timeoutMs: 120_000, noStore: true },
      );
      if (!refreshRes.ok) {
        didVendorSyncAndRecompute = false;
      }
    }
  }

  await Promise.all([
    Promise.resolve(deps.refetchSleep({ cacheBust: `sleep:pull:${bust}` })),
    deps.refetchWeekStrip ? Promise.resolve(deps.refetchWeekStrip()) : Promise.resolve(),
  ]);

  return { didVendorSyncAndRecompute };
}
