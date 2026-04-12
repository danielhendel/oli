import {
  DASH_RECAP_DISPLAY_PLACEMENT_CAPS,
  dashRecapPlacementMarker01,
} from "@/lib/data/dash/dashRecapDisplayPlacement";
import {
  ACTIVITY_OVERVIEW_AVG_12M_DAYS,
  ACTIVITY_OVERVIEW_AVG_30D_DAYS,
  ACTIVITY_OVERVIEW_AVG_7D_DAYS,
  activityTrailingNDaysInclusive,
} from "@/lib/data/activity/activityOverviewRanges";
import type { ActivityStepsRollupMap, DayStepsRollupEntry } from "@/lib/data/activity/activityOverviewRollupTypes";
import { formatDayKeyWeekdayShortMonthDay } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Same neutral display cap as Daily Recap steps bar — not a clinical target. */
export const ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP = DASH_RECAP_DISPLAY_PLACEMENT_CAPS.steps;

export type ActivityOverviewTimeframeKey = "today" | "avg7d" | "avg30d" | "avg365d";

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

/**
 * Mean steps over a trailing calendar window, using **only** days with numeric daily-facts steps.
 * Absent, error, and missing keys are excluded (not treated as 0 in the denominator).
 * If no numeric days in the window → 0.
 */
function averageStepsNumericDaysOnly(days: readonly DayKey[], rollup: Readonly<ActivityStepsRollupMap>): number {
  let sum = 0;
  let count = 0;
  for (const d of days) {
    const e = rollup[d];
    if (e?.kind !== "numeric") continue;
    sum += e.steps;
    count += 1;
  }
  if (count === 0) return 0;
  return sum / count;
}

export function formatActivityDailyDetailsTitle(selectedDay: DayKey, todayDayKey: DayKey): string {
  return selectedDay === todayDayKey ? "Today" : formatDayKeyWeekdayShortMonthDay(selectedDay);
}

export function formatActivityTodayRowSummary(entry: DayStepsRollupEntry | undefined): string {
  if (entry?.kind === "numeric") {
    return `${Math.round(entry.steps).toLocaleString()} steps`;
  }
  return "No daily rollup for this day";
}

export function formatActivityAverageRowSummary(avgStepsPerDay: number): string {
  return `${Math.round(avgStepsPerDay).toLocaleString()}/day`;
}

/**
 * Activity Overview summary — trailing windows **end on `overviewAnchorDay`** (Activity strip selection).
 * Source of truth: `activity.steps` per day from GET /users/me/daily-facts (rolled into {@link rollupByDay} as `kind: "numeric"` only when a finite non-negative steps value exists).
 *
 * Formulas (local calendar days, inclusive of anchor day):
 * - **Today row:** steps for `overviewAnchorDay` only (UI label unchanged).
 * - **7D / 30D / 365D Avg:** mean of steps on days **with numeric rollups inside that trailing window ending on the anchor** only.
 *   Missing/error/absent days do not count toward the average. No numeric days → **0**.
 */
export function buildActivityOverviewCardModel(input: {
  overviewAnchorDay: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityOverviewCardModel {
  const { overviewAnchorDay, rollupByDay } = input;

  const d7 = activityTrailingNDaysInclusive(overviewAnchorDay, ACTIVITY_OVERVIEW_AVG_7D_DAYS);
  const d30 = activityTrailingNDaysInclusive(overviewAnchorDay, ACTIVITY_OVERVIEW_AVG_30D_DAYS);
  const d365 = activityTrailingNDaysInclusive(overviewAnchorDay, ACTIVITY_OVERVIEW_AVG_12M_DAYS);

  const todayEntry = rollupByDay[overviewAnchorDay];

  const avg7 = averageStepsNumericDaysOnly(d7, rollupByDay);
  const avg30 = averageStepsNumericDaysOnly(d30, rollupByDay);
  const avg365 = averageStepsNumericDaysOnly(d365, rollupByDay);

  const cap = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP;

  const todayNumericSteps = todayEntry?.kind === "numeric" ? todayEntry.steps : 0;
  const todayMarker =
    todayEntry?.kind === "numeric" ? dashRecapPlacementMarker01(todayNumericSteps, cap) : 0;

  const timeframes: ActivityOverviewRowModel[] = [
    {
      key: "today",
      label: "Today",
      compactStatsSummary: formatActivityTodayRowSummary(todayEntry),
      markerPosition01: todayMarker,
    },
    {
      key: "avg7d",
      label: "7D Avg",
      compactStatsSummary: formatActivityAverageRowSummary(avg7),
      markerPosition01: dashRecapPlacementMarker01(avg7, cap),
    },
    {
      key: "avg30d",
      label: "30D Avg",
      compactStatsSummary: formatActivityAverageRowSummary(avg30),
      markerPosition01: dashRecapPlacementMarker01(avg30, cap),
    },
    {
      key: "avg365d",
      label: "365D Avg",
      compactStatsSummary: formatActivityAverageRowSummary(avg365),
      markerPosition01: dashRecapPlacementMarker01(avg365, cap),
    },
  ];

  return { timeframes };
}

export type ActivityDailyDetailsCardModel = {
  title: string;
  compactStatsSummary: string;
  markerPosition01: number;
};

export function buildActivityDailyDetailsCardModel(input: {
  selectedDay: DayKey;
  todayDayKey: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityDailyDetailsCardModel {
  const { selectedDay, todayDayKey, rollupByDay } = input;
  const entry = rollupByDay[selectedDay];
  const numericSteps = entry?.kind === "numeric" ? entry.steps : 0;
  const cap = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP;
  return {
    title: formatActivityDailyDetailsTitle(selectedDay, todayDayKey),
    compactStatsSummary: formatActivityTodayRowSummary(entry),
    markerPosition01: entry?.kind === "numeric" ? dashRecapPlacementMarker01(numericSteps, cap) : 0,
  };
}
