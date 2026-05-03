import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import {
  meanNumericStepsForWindow,
  meanStepsPerDayZeroFilled,
  stepsWindowHasAnyErrorDay,
  stepsWindowHasFullNumericCoverage,
} from "@/lib/data/activity/activityOverviewSufficiency";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  activityStepsDisplayScaleFill01,
  getStepRatingActivityDescriptorPill,
  getStepRatingTierIndex,
} from "@/lib/utils/activityStepRating";

export type ActivityHistoryRangeKey = "day7" | "day30" | "day90" | "ytd" | "month12";

export type ActivityHistorySummaryRowLabel = "7 Day" | "30 Day" | "90 Day" | "YTD" | "12 Month";

export type ActivityHistorySummaryRow = {
  key: ActivityHistoryRangeKey;
  label: ActivityHistorySummaryRowLabel;
  hasEnoughData: boolean;
  averageStepsPerDay: number | null;
  displayValue: string;
  tierLabel: string | null;
  tierIndexForBar: number | null;
  progressFill01: number | null;
  helperText?: string;
};

export type ActivityHistorySummaryModel = {
  rows: readonly ActivityHistorySummaryRow[];
};

export function formatActivityStepsPerDayDisplay(avgStepsPerDay: number): string {
  return `${Math.round(avgStepsPerDay).toLocaleString()} steps/day`;
}

function ratingFieldsFromAvgSteps(avgStepsPerDay: number): Pick<
  ActivityHistorySummaryRow,
  "tierLabel" | "tierIndexForBar" | "progressFill01"
> {
  const pill = getStepRatingActivityDescriptorPill(avgStepsPerDay);
  const tierIndex = getStepRatingTierIndex(avgStepsPerDay);
  return {
    tierLabel: pill.label,
    tierIndexForBar: tierIndex,
    progressFill01: activityStepsDisplayScaleFill01(avgStepsPerDay),
  };
}

function emptyRow(
  key: ActivityHistoryRangeKey,
  label: ActivityHistorySummaryRowLabel,
  helper?: string,
): ActivityHistorySummaryRow {
  return {
    key,
    label,
    hasEnoughData: false,
    averageStepsPerDay: null,
    displayValue: "—",
    tierLabel: null,
    tierIndexForBar: null,
    progressFill01: null,
    ...(helper ? { helperText: helper } : {}),
  };
}

function rowFullCoverageWindow(input: {
  key: ActivityHistoryRangeKey;
  label: ActivityHistorySummaryRowLabel;
  days: readonly DayKey[];
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityHistorySummaryRow {
  const sufficient = stepsWindowHasFullNumericCoverage(input.days, input.rollupByDay);
  if (!sufficient) {
    return emptyRow(input.key, input.label);
  }
  const avg = meanNumericStepsForWindow(input.days, input.rollupByDay);
  return {
    key: input.key,
    label: input.label,
    hasEnoughData: true,
    averageStepsPerDay: avg,
    displayValue: formatActivityStepsPerDayDisplay(avg),
    ...ratingFieldsFromAvgSteps(avg),
  };
}

function rowZeroFilledWindow(input: {
  key: ActivityHistoryRangeKey;
  label: ActivityHistorySummaryRowLabel;
  days: readonly DayKey[];
  rollupByDay: Readonly<ActivityStepsRollupMap>;
  insufficientHelper?: string;
}): ActivityHistorySummaryRow {
  if (stepsWindowHasAnyErrorDay(input.days, input.rollupByDay)) {
    return emptyRow(
      input.key,
      input.label,
      input.key === "month12"
        ? input.insufficientHelper ?? "Data will appear when enough history is available"
        : undefined,
    );
  }
  const avg = meanStepsPerDayZeroFilled(input.days, input.rollupByDay);
  return {
    key: input.key,
    label: input.label,
    hasEnoughData: true,
    averageStepsPerDay: avg,
    displayValue: formatActivityStepsPerDayDisplay(avg),
    ...ratingFieldsFromAvgSteps(avg),
  };
}

/**
 * Activity overview “Baseline” table: average daily steps per rolling/calendar window.
 * Aligns windows with Strength/Cardio baseline cards (7/30 through today; 90 through local yesterday; YTD; 12 Month).
 */
export function buildActivityHistorySummaryModel(input: {
  todayDayKey: DayKey;
  rollupByDay: Readonly<ActivityStepsRollupMap>;
}): ActivityHistorySummaryModel {
  const { todayDayKey, rollupByDay } = input;
  const anchorYesterday = getActivityOverviewAnchorEndDay(todayDayKey);

  const d7 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT);
  const d30 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT);
  const d90 = activityTrailingNDaysInclusive(anchorYesterday, 90);
  const ytdDays = activityYtdInclusiveThroughEndDay(todayDayKey);
  const d365 = activityTrailingNDaysInclusive(todayDayKey, ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT);

  return {
    rows: [
      rowFullCoverageWindow({ key: "day7", label: "7 Day", days: d7, rollupByDay }),
      rowFullCoverageWindow({ key: "day30", label: "30 Day", days: d30, rollupByDay }),
      rowFullCoverageWindow({ key: "day90", label: "90 Day", days: d90, rollupByDay }),
      rowZeroFilledWindow({ key: "ytd", label: "YTD", days: ytdDays, rollupByDay }),
      rowZeroFilledWindow({
        key: "month12",
        label: "12 Month",
        days: d365,
        rollupByDay,
        insufficientHelper: "Data will appear when enough history is available",
      }),
    ],
  };
}
