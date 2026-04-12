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

/** Steps counted toward period sums: numeric rollups only; absent/error days contribute 0. */
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

/**
 * Average steps per day over a fixed-length trailing window ending on `todayDayKey`.
 * Missing/absent days count as 0 steps and still count in the denominator (deterministic).
 */
function averageStepsFixedWindow(totalSteps: number, windowDays: number): number {
  if (windowDays <= 0) return 0;
  return totalSteps / windowDays;
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
 * Activity Overview summary — **independent of strip selection**.
 * Source of truth: persisted `activity.steps` per day from GET /users/me/daily-facts (rolled into {@link rollupByDay}).
 *
 * Formulas (local calendar days, inclusive of today):
 * - **Today:** steps for `todayDayKey` only.
 * - **7D Avg:** (Σ steps over last 7 days including today) / 7.
 * - **30D Avg:** (Σ steps over last 30 days including today) / 30.
 * - **365D Avg:** (Σ steps over last 365 days including today) / 365 (trailing window, not calendar year).
 */
export function buildActivityOverviewCardModel(input: {
  todayDayKey: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityOverviewCardModel {
  const { todayDayKey, rollupByDay } = input;

  const d7 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_AVG_7D_DAYS);
  const d30 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_AVG_30D_DAYS);
  const d365 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_AVG_12M_DAYS);

  const todayEntry = rollupByDay[todayDayKey];

  const sum7 = sumNumericForDays(d7, rollupByDay);
  const sum30 = sumNumericForDays(d30, rollupByDay);
  const sum365 = sumNumericForDays(d365, rollupByDay);

  const avg7 = averageStepsFixedWindow(sum7, ACTIVITY_OVERVIEW_AVG_7D_DAYS);
  const avg30 = averageStepsFixedWindow(sum30, ACTIVITY_OVERVIEW_AVG_30D_DAYS);
  const avg365 = averageStepsFixedWindow(sum365, ACTIVITY_OVERVIEW_AVG_12M_DAYS);

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
