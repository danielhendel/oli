/**
 * Pure view-model for the Body "Weight Baseline" card — period deltas, no range/status pills.
 *
 * Periods: 7 Day, 30 Day, 90 Day, YTD, 12 Month.
 *
 * Delta semantics (repo-truth): each period's delta is the **latest daily reading minus the first
 * daily reading within the period window (vs. period start)**. This matches the existing repo
 * convention in `useWeightSeries` (`change30dKg = recent[last] − recent[0]`, `weeklyDelta = latest
 * − ref`), so the new card stays consistent with the data layer rather than inventing new
 * physiology logic. A period needs ≥ 2 distinct measured days to produce a delta; otherwise it
 * renders "Not enough data".
 *
 * Each day contributes its latest reading (by `observedAt`) via {@link latestWeightByDay}.
 * No React, no network.
 */
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";
import {
  dailyLatestWeightSeries,
  formatSignedWeightDeltaAccessibilityLabel,
  formatSignedWeightDeltaLabel,
} from "@/lib/data/body/bodyWeightDailySeries";
import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type BodyBaselineDeltaPeriodKey = "7d" | "30d" | "90d" | "ytd" | "12m";

export type BodyBaselineDeltaRow = {
  key: BodyBaselineDeltaPeriodKey;
  label: string;
  /** Signed delta label, e.g. `"+0.7 lb"`, or null when insufficient data. */
  deltaLabel: string | null;
  deltaKg: number | null;
  hasData: boolean;
  accessibilityLabel: string;
};

export type BodyWeightBaselineDeltaModel = {
  unit: "kg" | "lb";
  rows: readonly BodyBaselineDeltaRow[];
};

const INSUFFICIENT_COPY = "Not enough data";

const PERIOD_DEFS: readonly { key: BodyBaselineDeltaPeriodKey; label: string }[] = [
  { key: "7d", label: "7 Day" },
  { key: "30d", label: "30 Day" },
  { key: "90d", label: "90 Day" },
  { key: "ytd", label: "YTD" },
  { key: "12m", label: "12 Month" },
];

/** Inclusive window start (DayKey) for a given period, anchored at `todayDayKey`. */
function periodStartDayKey(key: BodyBaselineDeltaPeriodKey, todayDayKey: DayKey): DayKey {
  switch (key) {
    case "7d":
      return addCalendarDaysToDayKey(todayDayKey, -7);
    case "30d":
      return addCalendarDaysToDayKey(todayDayKey, -30);
    case "90d":
      return addCalendarDaysToDayKey(todayDayKey, -90);
    case "12m":
      return addCalendarDaysToDayKey(todayDayKey, -365);
    case "ytd": {
      const year = todayDayKey.slice(0, 4);
      return `${year}-01-01` as DayKey;
    }
  }
}

export function buildBodyWeightBaselineDeltaModel(input: {
  todayDayKey: DayKey;
  samples: readonly BodyWeightSample[];
  unit: "kg" | "lb";
}): BodyWeightBaselineDeltaModel {
  const { todayDayKey, samples, unit } = input;
  const series = dailyLatestWeightSeries(samples); // ascending by dayKey

  const rows: BodyBaselineDeltaRow[] = PERIOD_DEFS.map(({ key, label }) => {
    const start = periodStartDayKey(key, todayDayKey);
    const windowDays = series.filter((d) => d.dayKey >= start && d.dayKey <= todayDayKey);
    if (windowDays.length < 2) {
      return {
        key,
        label,
        deltaLabel: null,
        deltaKg: null,
        hasData: false,
        accessibilityLabel: `${label}. ${INSUFFICIENT_COPY}.`,
      };
    }
    const first = windowDays[0]!.weightKg;
    const last = windowDays[windowDays.length - 1]!.weightKg;
    const deltaKg = last - first;
    return {
      key,
      label,
      deltaLabel: formatSignedWeightDeltaLabel(deltaKg, unit),
      deltaKg,
      hasData: true,
      accessibilityLabel: `${label}. ${formatSignedWeightDeltaAccessibilityLabel(deltaKg, unit)}.`,
    };
  });

  return { unit, rows };
}
