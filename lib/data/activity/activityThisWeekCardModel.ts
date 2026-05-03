import { formatSignedBaselineDelta } from "@/lib/data/activity/activityTodayBaselineDelta";
import type { ActivityStepsRollupMap } from "@/lib/data/activity/activityOverviewRollupTypes";
import { formatWeekdayFullFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import type { DayKey } from "@/lib/ui/calendar/types";
import {
  activityStepsDisplayScaleFill01,
  getStepRatingActivityDescriptorPill,
  getStepRatingTierIndex,
} from "@/lib/utils/activityStepRating";

export type ActivityThisWeekDayRow = {
  dayKey: DayKey;
  /** Full weekday name only (`formatWeekdayFullFromDayKey`); no month/day. */
  dateLabel: string;
  /** Rounded steps for display (no “steps” suffix — row adds it). */
  stepsDigits: string;
  /** Signed delta vs activity baseline mean, or null when baseline unavailable. */
  deltaText: string | null;
};

/** Embedded StrengthFrequencyMetricCard + weekly tier strip (calendar week, Sun → Sat). */
export type ActivityThisWeekCardModel = {
  compactValuePrimary: string;
  ratingLabel: string;
  activityTierIndexForBar: number;
  fillWidth01Override: number;
  days: readonly ActivityThisWeekDayRow[];
  isEmpty: boolean;
};

/**
 * Calendar week containing `todayDayKey`, ordered Sun → Sat.
 * Only includes days on/before today with **numeric** rollup step data (skips future days and empty slots).
 */
export function buildActivityThisWeekCardModel(input: {
  todayDayKey: DayKey;
  /** Typically {@link getWeekDaysForAnchor}`(todayDayKey)`. */
  weekDayKeys: readonly DayKey[];
  rollupByDay: Readonly<ActivityStepsRollupMap>;
  /** 90-day baseline mean steps/day when available (same source as Today delta). */
  baselineMeanSteps: number | null;
}): ActivityThisWeekCardModel {
  const { todayDayKey, weekDayKeys, rollupByDay, baselineMeanSteps } = input;

  const rows: ActivityThisWeekDayRow[] = [];
  for (const dayKey of weekDayKeys) {
    if (dayKey > todayDayKey) continue;

    const e = rollupByDay[dayKey];
    if (e?.kind !== "numeric") continue;

    const steps = Math.round(e.steps);
    const deltaText = formatSignedBaselineDelta(steps, baselineMeanSteps);
    rows.push({
      dayKey,
      dateLabel: formatWeekdayFullFromDayKey(dayKey),
      stepsDigits: steps.toLocaleString(),
      deltaText,
    });
  }

  const elapsedKeys = weekDayKeys.filter((d) => d <= todayDayKey);
  let sum = 0;
  let count = 0;
  for (const d of elapsedKeys) {
    const entry = rollupByDay[d];
    if (entry?.kind === "numeric") {
      sum += entry.steps;
      count += 1;
    }
  }

  const isEmpty = count === 0;
  const weeklyAvg = count > 0 ? sum / count : 0;
  const pill = getStepRatingActivityDescriptorPill(weeklyAvg);
  const tierIdx = getStepRatingTierIndex(weeklyAvg);

  return {
    compactValuePrimary: `${Math.round(weeklyAvg).toLocaleString()} steps/day`,
    ratingLabel: pill.label,
    activityTierIndexForBar: tierIdx,
    fillWidth01Override: activityStepsDisplayScaleFill01(weeklyAvg),
    days: rows,
    isEmpty,
  };
}
