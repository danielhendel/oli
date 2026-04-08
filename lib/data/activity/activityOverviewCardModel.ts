import {
  DASH_RECAP_DISPLAY_PLACEMENT_CAPS,
  dashRecapPlacementMarker01,
} from "@/lib/data/dash/dashRecapDisplayPlacement";
import {
  activityMtdDaysThrough,
  activityWeekElapsedDaysThrough,
  activityYtdDaysThrough,
} from "@/lib/data/activity/activityOverviewRanges";
import type { ActivityStepsRollupMap, DayStepsRollupEntry } from "@/lib/data/activity/activityOverviewRollupTypes";
import { formatDayKeyWeekdayShortMonthDay } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Same neutral display cap as Daily Recap steps bar — not a clinical target. */
export const ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP = DASH_RECAP_DISPLAY_PLACEMENT_CAPS.steps;

export type ActivityOverviewTimeframeKey = "today" | "thisWeek" | "mtd" | "ytd";

export type ActivityOverviewRowModel = {
  key: ActivityOverviewTimeframeKey;
  label: string;
  /** Single line for the row (totals vs averages formatted here, not in the screen). */
  compactStatsSummary: string;
  /** Neutral placement along shared 5-zone track. */
  markerPosition01: number;
};

export type ActivityOverviewCardModel = {
  timeframes: ActivityOverviewRowModel[];
};

function primaryDayRowLabel(selectedDay: DayKey, todayDayKey: DayKey): string {
  return selectedDay === todayDayKey ? "Today" : formatDayKeyWeekdayShortMonthDay(selectedDay);
}

/** Steps counted toward multi-day averages: numeric rollups only; absent/error days contribute 0. */
function numericContribution(rollup: Readonly<ActivityStepsRollupMap>, d: DayKey): number {
  const e = rollup[d];
  return e?.kind === "numeric" ? e.steps : 0;
}

function sumNumericForDays(days: readonly DayKey[], rollup: Readonly<ActivityStepsRollupMap>): number {
  let t = 0;
  for (const d of days) {
    t += numericContribution(rollup, d);
  }
  return t;
}

function averageOverCalendarDays(totalNumericSteps: number, dayCount: number): number {
  if (dayCount <= 0) return 0;
  return totalNumericSteps / dayCount;
}

/** @internal — tests */
export function formatActivityTodayRowSummary(entry: DayStepsRollupEntry | undefined): string {
  if (entry?.kind === "numeric") {
    return `${Math.round(entry.steps).toLocaleString()} steps`;
  }
  return "No daily rollup for this day";
}

/** @internal — tests */
export function formatActivityAverageRowSummary(avgStepsPerDay: number): string {
  return `${Math.round(avgStepsPerDay).toLocaleString()}/day`;
}

/**
 * Builds Activity Overview rows from per-day rollup entries (GET /users/me/daily-facts).
 * Today: total only when `activity.steps` exists; multi-day rows: calendar average (sum of numeric days / calendar span).
 */
export function buildActivityOverviewCardModel(input: {
  selectedDay: DayKey;
  todayDayKey: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityOverviewCardModel {
  const { selectedDay, todayDayKey, rollupByDay } = input;

  const weekDays = activityWeekElapsedDaysThrough(selectedDay);
  const mtdDays = activityMtdDaysThrough(selectedDay);
  const ytdDays = activityYtdDaysThrough(selectedDay);

  const todayEntry = rollupByDay[selectedDay];
  const weekTotal = sumNumericForDays(weekDays, rollupByDay);
  const mtdTotal = sumNumericForDays(mtdDays, rollupByDay);
  const ytdTotal = sumNumericForDays(ytdDays, rollupByDay);

  const weekAvg = averageOverCalendarDays(weekTotal, weekDays.length);
  const mtdAvg = averageOverCalendarDays(mtdTotal, mtdDays.length);
  const ytdAvg = averageOverCalendarDays(ytdTotal, ytdDays.length);

  const cap = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP;

  const todayNumericSteps = todayEntry?.kind === "numeric" ? todayEntry.steps : 0;
  const todayMarker =
    todayEntry?.kind === "numeric" ? dashRecapPlacementMarker01(todayNumericSteps, cap) : 0;

  const timeframes: ActivityOverviewRowModel[] = [
    {
      key: "today",
      label: primaryDayRowLabel(selectedDay, todayDayKey),
      compactStatsSummary: formatActivityTodayRowSummary(todayEntry),
      markerPosition01: todayMarker,
    },
    {
      key: "thisWeek",
      label: "This Week",
      compactStatsSummary: formatActivityAverageRowSummary(weekAvg),
      markerPosition01: dashRecapPlacementMarker01(weekAvg, cap),
    },
    {
      key: "mtd",
      label: "MTD",
      compactStatsSummary: formatActivityAverageRowSummary(mtdAvg),
      markerPosition01: dashRecapPlacementMarker01(mtdAvg, cap),
    },
    {
      key: "ytd",
      label: "YTD",
      compactStatsSummary: formatActivityAverageRowSummary(ytdAvg),
      markerPosition01: dashRecapPlacementMarker01(ytdAvg, cap),
    },
  ];

  return { timeframes };
}
