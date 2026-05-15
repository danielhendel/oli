import { pickLatestSleepWeekDayWithPresence } from "@/lib/data/sleep/pickLatestSleepWeekDayWithPresence";

export type SleepWeekPresenceForAnchor =
  | { status: "partial" }
  | { status: "ready"; hasSleepDataByDay: Record<string, boolean> };

/**
 * Un-pinned Sleep tab semantics: week strip is anchored on `calendarToday`, and the selected
 * day snaps to the latest week day with sleep presence when the calendar day has none.
 *
 * Dash Daily Sleep uses this so `GET /users/me/oura-sleep-view?day=` and DailyFacts sleep rows
 * target the same physiological sleep day as the Sleep screen default, without weakening
 * `isOuraViewAlignedToDay` on the vendor view.
 */
export function resolveSleepScreenStyleAnchorDay(
  calendarToday: string,
  weekDayKeys: readonly string[],
  presence: SleepWeekPresenceForAnchor,
): string {
  if (presence.status !== "ready") return calendarToday;
  const map = presence.hasSleepDataByDay;
  if (map[calendarToday] === true) return calendarToday;
  const pivot = pickLatestSleepWeekDayWithPresence(weekDayKeys, map);
  return pivot ?? calendarToday;
}
