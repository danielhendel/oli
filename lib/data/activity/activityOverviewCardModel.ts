import {
  DASH_RECAP_DISPLAY_PLACEMENT_CAPS,
  dashRecapPlacementMarker01,
} from "@/lib/data/dash/dashRecapDisplayPlacement";
import {
  ACTIVITY_BASELINE_TRAILING_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA,
  meanNumericStepsForWindow,
  meanStepsPerDayZeroFilled,
  stepsWindowHasAnyErrorDay,
  stepsWindowHasFullNumericCoverage,
} from "@/lib/data/activity/activityOverviewSufficiency";
import type { ActivityStepsRollupMap, DayStepsRollupEntry } from "@/lib/data/activity/activityOverviewRollupTypes";
import { formatDayKeyWeekdayShortMonthDay } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import type { DayKey } from "@/lib/ui/calendar/types";
import { stepsFromLocaleDigitString } from "@/lib/utils/activityStepRating";

/** Same neutral display cap as Daily Recap steps bar — not a clinical target. */
export const ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP = DASH_RECAP_DISPLAY_PLACEMENT_CAPS.steps;

export type ActivityOverviewTimeframeKey = "yesterday" | "day7" | "day30" | "ytd" | "month12";

export type ActivityOverviewRowModel = {
  key: ActivityOverviewTimeframeKey;
  label: string;
  /** Single line for the row (averages when sufficient, otherwise exact insufficient copy). */
  compactStatsSummary: string;
  /** Neutral placement along shared 5-zone track. */
  markerPosition01: number;
};

export type ActivityOverviewCardModel = {
  timeframes: ActivityOverviewRowModel[];
};

/** First Overview row: completed **yesterday** only (`overviewAnchorEndDay`), same rollup rules as Yesterday card. */
function rowYesterdayOverview(input: {
  overviewAnchorEndDay: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityOverviewRowModel {
  const { overviewAnchorEndDay: end, rollupByDay } = input;
  const entry = rollupByDay[end];
  const cap = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP;
  if (entry?.kind === "numeric") {
    const steps = entry.steps;
    return {
      key: "yesterday",
      label: "Yesterday",
      compactStatsSummary: `${Math.round(steps).toLocaleString()} steps`,
      markerPosition01: dashRecapPlacementMarker01(steps, cap),
    };
  }
  return {
    key: "yesterday",
    label: "Yesterday",
    compactStatsSummary: ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA,
    markerPosition01: 0,
  };
}

function rowFromFullCoverageWindow(input: {
  key: ActivityOverviewTimeframeKey;
  label: string;
  days: readonly DayKey[];
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityOverviewRowModel {
  const { key, label, days, rollupByDay } = input;
  const cap = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP;
  const sufficient = stepsWindowHasFullNumericCoverage(days, rollupByDay);
  if (!sufficient) {
    return {
      key,
      label,
      compactStatsSummary: ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA,
      markerPosition01: 0,
    };
  }
  const avg = meanNumericStepsForWindow(days, rollupByDay);
  return {
    key,
    label,
    compactStatsSummary: formatActivityAverageRowSummary(avg),
    markerPosition01: dashRecapPlacementMarker01(avg, cap),
  };
}

/**
 * YTD / 12 Month: fixed window length; missing/absent days contribute 0.
 * If any day has a failed request (`kind: "error"`, e.g. 503), do not show a numeric average — that would
 * silently treat failures as zero and overstate certainty.
 */
function rowFromZeroFilledFixedDenominator(input: {
  key: ActivityOverviewTimeframeKey;
  label: string;
  days: readonly DayKey[];
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityOverviewRowModel {
  const { key, label, days, rollupByDay } = input;
  const cap = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP;
  if (stepsWindowHasAnyErrorDay(days, rollupByDay)) {
    return {
      key,
      label,
      compactStatsSummary: ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA,
      markerPosition01: 0,
    };
  }
  const avg = meanStepsPerDayZeroFilled(days, rollupByDay);
  return {
    key,
    label,
    compactStatsSummary: formatActivityAverageRowSummary(avg),
    markerPosition01: dashRecapPlacementMarker01(avg, cap),
  };
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
 * Activity overview rows use a **completed-day anchor** (`overviewAnchorEndDay`, typically local yesterday).
 * Strip selection and partial “today” do not move these windows.
 *
 * - **7 Day / 30 Day:** mean steps/day only when every day in the window has a numeric rollup; else
 *   {@link ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA}.
 * - **YTD / 12 Month:** true calendar mean `sum(steps or 0) / windowDayCount` when no day in the window
 *   has a failed daily-facts fetch; otherwise {@link ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA}.
 */
export function buildActivityOverviewCardModel(input: {
  overviewAnchorEndDay: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityOverviewCardModel {
  const { overviewAnchorEndDay: end, rollupByDay } = input;

  const d7 = activityTrailingNDaysInclusive(end, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  const d30 = activityTrailingNDaysInclusive(end, ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
  const d365 = activityTrailingNDaysInclusive(end, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);
  const ytdDays = activityYtdInclusiveThroughEndDay(end);

  const timeframes: ActivityOverviewRowModel[] = [
    rowYesterdayOverview({ overviewAnchorEndDay: end, rollupByDay }),
    rowFromFullCoverageWindow({ key: "day7", label: "7 Day", days: d7, rollupByDay }),
    rowFromFullCoverageWindow({ key: "day30", label: "30 Day", days: d30, rollupByDay }),
    rowFromZeroFilledFixedDenominator({ key: "ytd", label: "YTD", days: ytdDays, rollupByDay }),
    rowFromZeroFilledFixedDenominator({ key: "month12", label: "12 Month", days: d365, rollupByDay }),
  ];

  return { timeframes };
}

/**
 * Activity Baseline: mean steps/day over **exactly** {@link ACTIVITY_BASELINE_TRAILING_DAY_COUNT}
 * **completed** local days from `start = addCalendarDaysToDayKey(overviewAnchorEndDay, -(90-1))`
 * through `overviewAnchorEndDay` inclusive ({@link activityTrailingNDaysInclusive}).
 *
 * **Caller contract:** pass `overviewAnchorEndDay = getActivityOverviewAnchorEndDay(getTodayDayKeyLocal())`
 * (local yesterday). Then `days` **excludes device today by construction** (today is the day after `end`);
 * {@link meanNumericStepsForWindow} only sums those keys, so a numeric rollup for “today” in the map
 * cannot affect the baseline.
 *
 * Sufficiency matches Overview 7/30: {@link stepsWindowHasFullNumericCoverage}.
 */
export function buildActivityBaselineCardModel(input: {
  /** Local-calendar yesterday (last completed day); must not be device today. */
  overviewAnchorEndDay: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityDailyDetailsCardModel {
  const { overviewAnchorEndDay: end, rollupByDay } = input;
  const cap = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP;
  const days = activityTrailingNDaysInclusive(end, ACTIVITY_BASELINE_TRAILING_DAY_COUNT);
  const sufficient = stepsWindowHasFullNumericCoverage(days, rollupByDay);
  if (!sufficient) {
    return {
      title: "Activity Baseline",
      compactStatsSummary: ACTIVITY_OVERVIEW_NOT_ENOUGH_DATA,
      markerPosition01: 0,
    };
  }
  const avg = meanNumericStepsForWindow(days, rollupByDay);
  const rounded = Math.round(avg);
  return {
    title: "Activity Baseline",
    compactStatsSummary: `${rounded.toLocaleString()} steps`,
    markerPosition01: dashRecapPlacementMarker01(avg, cap),
  };
}

export type ActivityDailyDetailsCardModel = {
  title: string;
  compactStatsSummary: string;
  markerPosition01: number;
  /** Today’s Steps only: `todaySteps - baselineMean` when both totals are numeric. */
  deltaFromBaselineSteps?: number | null;
  /** Today’s Steps only: derived from {@link deltaFromBaselineSteps}; omitted when delta cannot be computed. */
  deltaFromBaselineLabel?: string | null;
};

/** Parses `{n} steps` summaries from daily/baseline cards (display strings only). */
export function parseActivityDailyDetailsNumericSteps(compactStatsSummary: string): number | null {
  const m = compactStatsSummary.trim().match(/^([\d,]+)\s+steps$/i);
  if (!m?.[1]) return null;
  const raw = stepsFromLocaleDigitString(m[1]);
  if (!Number.isFinite(raw)) return null;
  return Math.round(raw);
}

/** Today’s Steps row from a live HealthKit total (not daily-facts). */
export function buildActivityTodayStepsLiveCardModel(input: { todayDayKey: DayKey; steps: number }): ActivityDailyDetailsCardModel {
  const cap = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP;
  const steps = Math.max(0, input.steps);
  return {
    title: formatActivityDailyDetailsTitle(input.todayDayKey, input.todayDayKey),
    compactStatsSummary: `${Math.round(steps).toLocaleString()} steps`,
    markerPosition01: dashRecapPlacementMarker01(steps, cap),
  };
}

export function buildActivityDailyDetailsCardModel(input: {
  /** Calendar day whose rollup backs the row (Activity overview passes device today for Today’s Steps). */
  detailDayKey: DayKey;
  todayDayKey: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityDailyDetailsCardModel {
  const { detailDayKey, todayDayKey, rollupByDay } = input;
  const entry = rollupByDay[detailDayKey];
  const numericSteps = entry?.kind === "numeric" ? entry.steps : 0;
  const cap = ACTIVITY_OVERVIEW_STEPS_PLACEMENT_CAP;
  return {
    title: formatActivityDailyDetailsTitle(detailDayKey, todayDayKey),
    compactStatsSummary: formatActivityTodayRowSummary(entry),
    markerPosition01: entry?.kind === "numeric" ? dashRecapPlacementMarker01(numericSteps, cap) : 0,
  };
}
