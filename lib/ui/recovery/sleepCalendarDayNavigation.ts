/**
 * Deterministic navigation when user picks a day on the Sleep full-screen calendar.
 */
export const SLEEP_MAIN_SCREEN_PATHNAME = "/(app)/recovery/sleep" as const;

export type SleepCalendarRouterLike = {
  replace: (opts: {
    pathname: typeof SLEEP_MAIN_SCREEN_PATHNAME;
    params: { day: string };
  }) => void;
};

export function replaceSleepDayFromCalendarPick(router: SleepCalendarRouterLike, dayKey: string): void {
  router.replace({ pathname: SLEEP_MAIN_SCREEN_PATHNAME, params: { day: dayKey } });
}
