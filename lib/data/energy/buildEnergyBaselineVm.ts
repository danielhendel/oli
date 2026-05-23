import {
  ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  activityTrailingNDaysInclusive,
  activityYtdInclusiveThroughEndDay,
  getActivityOverviewAnchorEndDay,
} from "@/lib/data/activity/activityOverviewRanges";
import type { WeeklyDailyEnergyCell } from "@/lib/data/dash/useWeeklyDailyEnergyMap";
import { formatEnergyAvgRangePerDay } from "@/lib/ui/energy/energyPresentation";
import type { DayKey } from "@/lib/ui/calendar/types";

export type EnergyBaselineRangeKey = "day7" | "day30" | "day90" | "ytd" | "month12";

export type EnergyBaselineRowLabel = "7 Day" | "30 Day" | "90 Day" | "YTD" | "12 Month";

/**
 * One row in the Energy Baseline card.
 *
 * Display contract:
 * - `displayValue` is `"{avgLow}–{avgHigh} kcal/day"` (en dash, commas via `toLocaleString`) when
 *   `hasEnoughData`, otherwise the unavailable glyph {@link ENERGY_BASELINE_UNAVAILABLE_DISPLAY}.
 * - `progressFill01` is `avgHigh / globalMaxHigh` clamped to `[0, 1]` when data is present and the
 *   global maximum is `> 0`; `null` when unavailable.
 * - Averages are returned for tests and accessibility; the card never displays a midpoint.
 */
export type EnergyBaselineRow = {
  key: EnergyBaselineRangeKey;
  label: EnergyBaselineRowLabel;
  hasEnoughData: boolean;
  avgLow: number | null;
  avgHigh: number | null;
  displayValue: string;
  progressFill01: number | null;
};

export type EnergyBaselineVm = {
  rows: readonly EnergyBaselineRow[];
};

/** Glyph used in unavailable rows (en dash). Kept here so tests don't hard-code the literal. */
export const ENERGY_BASELINE_UNAVAILABLE_DISPLAY = "\u2014";

export const ENERGY_BASELINE_EXPLAINER_COPY =
  "Your energy baseline is the average daily burn across key time ranges.";

function pickDayRange(
  cell: WeeklyDailyEnergyCell | undefined,
): { low: number; high: number } | null {
  const est = cell?.energy?.estimatedKcal;
  if (est == null) return null;
  const low = est.low;
  const high = est.high;
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= 0) return null;
  return { low: Math.max(0, low), high: Math.max(low, high) };
}

/**
 * Completeness filter — only days with **both BMR and NEAT computed** contribute to a baseline
 * average. Excludes BMR-only days (e.g. carried-forward weight only), steps-only days, and any
 * other days the backend flagged as missing a required input.
 *
 * Source of truth: backend writes `missingRequiredInputs` on every `dailyFacts.energy` doc
 * (`services/functions/src/energy/computeDailyEnergyV1.ts`). A day is complete iff that list
 * is empty.
 */
function isCompleteEnergyDay(cell: WeeklyDailyEnergyCell | undefined): boolean {
  const energy = cell?.energy;
  if (energy == null) return false;
  const missing = energy.missingRequiredInputs;
  if (!Array.isArray(missing)) return false;
  return missing.length === 0;
}

type DayRangePair = { low: number; high: number; day: DayKey };

type EnergyConfidenceLevel = "low" | "moderate" | "high";

type EnergyWindowDiagnostic = {
  key: EnergyBaselineRangeKey;
  label: EnergyBaselineRowLabel;
  /** Total elapsed days enumerated for the window (future days already excluded). */
  windowDayCount: number;
  /**
   * Required number of complete days for the row to be displayable. Equal to {@link windowDayCount}
   * for all current ranges (no future days enter any window by construction).
   */
  requiredDayCount: number;
  /** Days that passed the completeness filter and contributed to the average. */
  validDayCount: number;
  excludedFutureCount: number;
  excludedMissingCount: number;
  excludedIncompleteCount: number;
  excludedBmrOnlyCount: number;
  excludedStepsOnlyCount: number;
  /** `true` iff `validDayCount >= requiredDayCount`. Drives row availability. */
  hasFullCoverage: boolean;
  earliestIncludedDay: DayKey | null;
  latestIncludedDay: DayKey | null;
  minLow: number | null;
  maxLow: number | null;
  avgLow: number | null;
  minHigh: number | null;
  maxHigh: number | null;
  avgHigh: number | null;
  includedConfidenceMix: { low: number; moderate: number; high: number };
};

function collectWindowStats(input: {
  spec: WindowSpec;
  todayDayKey: DayKey;
  energyByDay: Readonly<Partial<Record<DayKey, WeeklyDailyEnergyCell>>>;
}): {
  ranges: DayRangePair[];
  diagnostic: EnergyWindowDiagnostic;
} {
  const { spec, todayDayKey, energyByDay } = input;
  const ranges: DayRangePair[] = [];
  let windowDayCount = 0;
  let excludedFutureCount = 0;
  let excludedMissingCount = 0;
  let excludedIncompleteCount = 0;
  let excludedBmrOnlyCount = 0;
  let excludedStepsOnlyCount = 0;
  const includedConfidenceMix = { low: 0, moderate: 0, high: 0 } as Record<
    EnergyConfidenceLevel,
    number
  >;

  for (const day of spec.days) {
    if (day > todayDayKey) {
      excludedFutureCount += 1;
      continue;
    }
    windowDayCount += 1;
    const cell = energyByDay[day];
    const range = pickDayRange(cell);
    if (range == null) {
      excludedMissingCount += 1;
      continue;
    }
    if (!isCompleteEnergyDay(cell)) {
      excludedIncompleteCount += 1;
      const missing = cell?.energy?.missingRequiredInputs ?? [];
      const missingBaseline = missing.includes("baseline");
      const missingSteps = missing.includes("steps");
      if (missingSteps && !missingBaseline) {
        excludedBmrOnlyCount += 1;
      } else if (missingBaseline && !missingSteps) {
        excludedStepsOnlyCount += 1;
      }
      continue;
    }
    ranges.push({ low: range.low, high: range.high, day });
    const conf = cell?.energy?.confidence;
    if (conf === "low" || conf === "moderate" || conf === "high") {
      includedConfidenceMix[conf] += 1;
    }
  }

  const lows = ranges.map((r) => r.low);
  const highs = ranges.map((r) => r.high);
  const avgLow = lows.length > 0 ? lows.reduce((a, b) => a + b, 0) / lows.length : null;
  const avgHigh = highs.length > 0 ? highs.reduce((a, b) => a + b, 0) / highs.length : null;
  const earliestIncludedDay = ranges.length > 0 ? ranges[0]!.day : null;
  const latestIncludedDay = ranges.length > 0 ? ranges[ranges.length - 1]!.day : null;
  const requiredDayCount = spec.requiredDayCount;
  const hasFullCoverage = ranges.length >= requiredDayCount;

  return {
    ranges,
    diagnostic: {
      key: spec.key,
      label: spec.label,
      windowDayCount,
      requiredDayCount,
      validDayCount: ranges.length,
      excludedFutureCount,
      excludedMissingCount,
      excludedIncompleteCount,
      excludedBmrOnlyCount,
      excludedStepsOnlyCount,
      hasFullCoverage,
      earliestIncludedDay,
      latestIncludedDay,
      minLow: lows.length > 0 ? Math.min(...lows) : null,
      maxLow: lows.length > 0 ? Math.max(...lows) : null,
      avgLow,
      minHigh: highs.length > 0 ? Math.min(...highs) : null,
      maxHigh: highs.length > 0 ? Math.max(...highs) : null,
      avgHigh,
      includedConfidenceMix,
    },
  };
}

function averagesFromPairs(
  pairs: readonly DayRangePair[],
): { avgLow: number; avgHigh: number } | null {
  if (pairs.length === 0) return null;
  const n = pairs.length;
  const avgLow = pairs.reduce((sum, p) => sum + p.low, 0) / n;
  const avgHigh = pairs.reduce((sum, p) => sum + p.high, 0) / n;
  return { avgLow, avgHigh };
}

/**
 * Dev-only console diagnostic for QA. Behind `__DEV__` so production builds skip the work.
 * Logs once per VM rebuild — one log line per row, including the shared
 * `todayDayKey` / `baselineEndDay` anchors. Remove in the follow-up cleanup PR after baseline
 * values have been validated against backend data.
 */
function logEnergyBaselineDiagnostics(
  todayDayKey: DayKey,
  baselineEndDay: DayKey,
  diagnostics: readonly EnergyWindowDiagnostic[],
): void {
  if (!__DEV__) return;
  for (const d of diagnostics) {
    // eslint-disable-next-line no-console -- intentional dev diagnostics (Energy Baseline QA verification)
    console.log("[EnergyBaseline audit]", {
      todayDayKey,
      baselineEndDay,
      key: d.key,
      label: d.label,
      windowDayCount: d.windowDayCount,
      requiredDayCount: d.requiredDayCount,
      validDayCount: d.validDayCount,
      hasFullCoverage: d.hasFullCoverage,
      excludedFutureCount: d.excludedFutureCount,
      excludedMissingCount: d.excludedMissingCount,
      excludedIncompleteCount: d.excludedIncompleteCount,
      excludedBmrOnlyCount: d.excludedBmrOnlyCount,
      excludedStepsOnlyCount: d.excludedStepsOnlyCount,
      earliestIncludedDay: d.earliestIncludedDay,
      latestIncludedDay: d.latestIncludedDay,
      avgLow: d.avgLow,
      avgHigh: d.avgHigh,
      minLow: d.minLow,
      maxLow: d.maxLow,
      minHigh: d.minHigh,
      maxHigh: d.maxHigh,
      includedConfidenceMix: d.includedConfidenceMix,
    });
  }
}

function emptyRow(
  key: EnergyBaselineRangeKey,
  label: EnergyBaselineRowLabel,
): EnergyBaselineRow {
  return {
    key,
    label,
    hasEnoughData: false,
    avgLow: null,
    avgHigh: null,
    displayValue: ENERGY_BASELINE_UNAVAILABLE_DISPLAY,
    progressFill01: null,
  };
}

type WindowSpec = {
  key: EnergyBaselineRangeKey;
  label: EnergyBaselineRowLabel;
  days: readonly DayKey[];
  /**
   * Coverage threshold for the row to be displayable. Equal to `days.length` because every
   * window enumerated below contains only elapsed (non-future) calendar days.
   * - 7 Day: 7
   * - 30 Day: 30
   * - 90 Day: 90
   * - YTD: Jan 1 through `todayDayKey` (e.g. day-of-year)
   * - 12 Month: 365
   */
  requiredDayCount: number;
};

/**
 * Energy Baseline window contract — **all** windows end at the prior completed day
 * (`baselineEndDay = getActivityOverviewAnchorEndDay(todayDayKey)`, usually local yesterday).
 * Device-today is in progress and would pull historical averages down, so it is excluded from
 * every range:
 * - 7 Day: trailing 7 days inclusive of `baselineEndDay`.
 * - 30 Day: trailing 30 days inclusive of `baselineEndDay`.
 * - 90 Day: trailing 90 days inclusive of `baselineEndDay`.
 * - YTD: Jan 1 of `baselineEndDay`'s year through `baselineEndDay`.
 * - 12 Month: trailing 365 days inclusive of `baselineEndDay`.
 *
 * Future days are excluded defensively inside {@link collectWindowStats} (`day > todayDayKey`).
 * With the anchor at `baselineEndDay`, no day in any window can equal `todayDayKey`, but the
 * defensive filter remains as a guard against future regressions.
 */
function buildWindowSpecs(baselineEndDay: DayKey): readonly WindowSpec[] {
  const day7 = activityTrailingNDaysInclusive(
    baselineEndDay,
    ACTIVITY_OVERVIEW_TRAILING_7_DAY_COUNT,
  );
  const day30 = activityTrailingNDaysInclusive(
    baselineEndDay,
    ACTIVITY_OVERVIEW_TRAILING_30_DAY_COUNT,
  );
  const day90 = activityTrailingNDaysInclusive(baselineEndDay, 90);
  const ytd = activityYtdInclusiveThroughEndDay(baselineEndDay);
  const month12 = activityTrailingNDaysInclusive(
    baselineEndDay,
    ACTIVITY_OVERVIEW_TRAILING_12_MONTH_DAY_COUNT,
  );
  return [
    {
      key: "day7",
      label: "7 Day",
      days: day7,
      requiredDayCount: day7.length,
    },
    {
      key: "day30",
      label: "30 Day",
      days: day30,
      requiredDayCount: day30.length,
    },
    {
      key: "day90",
      label: "90 Day",
      days: day90,
      requiredDayCount: day90.length,
    },
    {
      key: "ytd",
      label: "YTD",
      days: ytd,
      requiredDayCount: ytd.length,
    },
    {
      key: "month12",
      label: "12 Month",
      days: month12,
      requiredDayCount: month12.length,
    },
  ];
}

/**
 * Union of `DayKey`s that must be fetched to back the Energy Baseline card. Use this when
 * computing the keys passed to `useWeeklyDailyEnergyMap` so the existing 30s session cache
 * dedupes against other Daily Energy consumers.
 *
 * All windows anchor at `baselineEndDay = getActivityOverviewAnchorEndDay(todayDayKey)` (local
 * yesterday), so today is never fetched on behalf of the baseline. The defensive
 * `d > todayDayKey` filter is preserved.
 */
export function computeEnergyBaselineFetchDayKeys(todayDayKey: DayKey): DayKey[] {
  const baselineEndDay = getActivityOverviewAnchorEndDay(todayDayKey);
  const specs = buildWindowSpecs(baselineEndDay);
  const set = new Set<DayKey>();
  for (const spec of specs) {
    for (const d of spec.days) {
      if (d > todayDayKey) continue;
      set.add(d);
    }
  }
  return [...set].sort();
}

/**
 * Pure VM builder for the Energy Baseline card.
 *
 * Anchor rule — every window ends at the **prior completed day**:
 *   `baselineEndDay = getActivityOverviewAnchorEndDay(todayDayKey)` (local yesterday).
 * Device-today is in progress and is never included in any baseline window.
 *
 * Display gating (per range) — a row displays an average **only** when complete-day coverage
 * spans the entire timeframe:
 * - 7 Day requires 7 complete days ending at `baselineEndDay`
 * - 30 Day requires 30 complete days ending at `baselineEndDay`
 * - 90 Day requires 90 complete days ending at `baselineEndDay`
 * - YTD requires every elapsed day from Jan 1 through `baselineEndDay`
 * - 12 Month requires 365 complete days ending at `baselineEndDay`
 *
 * Calculation rules (no calorie math here — only formatting + averaging persisted values):
 * - For each window, collect days where `cell.energy.estimatedKcal.low/high` are finite, `high > 0`,
 *   **and** `cell.energy.missingRequiredInputs.length === 0` (completeness filter). BMR-only and
 *   steps-only days are excluded.
 * - Defensive future-day exclusion (`dayKey > todayDayKey`) is preserved; with the
 *   `baselineEndDay` anchor it is a guard rail, not a hot path.
 * - If `validDayCount < requiredDayCount`, the row falls back to the unavailable state.
 *   Partial windows are never averaged.
 * - When coverage is complete: `avgLow = mean(low_i)`, `avgHigh = mean(high_i)` computed
 *   independently. No midpoint. No zero-fill.
 *
 * Progress fill rule: `progressFill01 = avgHigh / globalMaxHigh` clamped to `[0, 1]`, where
 * `globalMaxHigh = max(avgHigh)` across rows that have full coverage. Midpoint is never used.
 */
export function buildEnergyBaselineVm(input: {
  todayDayKey: DayKey;
  energyByDay: Readonly<Partial<Record<DayKey, WeeklyDailyEnergyCell>>>;
}): EnergyBaselineVm {
  const { todayDayKey, energyByDay } = input;
  const baselineEndDay = getActivityOverviewAnchorEndDay(todayDayKey);
  const specs = buildWindowSpecs(baselineEndDay);

  const diagnostics: EnergyWindowDiagnostic[] = [];
  const stage = specs.map((spec) => {
    const { ranges, diagnostic } = collectWindowStats({ spec, todayDayKey, energyByDay });
    diagnostics.push(diagnostic);
    if (!diagnostic.hasFullCoverage) {
      return { row: emptyRow(spec.key, spec.label), avgHigh: null };
    }
    const avg = averagesFromPairs(ranges);
    if (avg == null) {
      return { row: emptyRow(spec.key, spec.label), avgHigh: null };
    }
    const row: EnergyBaselineRow = {
      key: spec.key,
      label: spec.label,
      hasEnoughData: true,
      avgLow: avg.avgLow,
      avgHigh: avg.avgHigh,
      displayValue: formatEnergyAvgRangePerDay(avg.avgLow, avg.avgHigh),
      progressFill01: null,
    };
    return { row, avgHigh: avg.avgHigh };
  });

  logEnergyBaselineDiagnostics(todayDayKey, baselineEndDay, diagnostics);

  const highs: number[] = [];
  for (const entry of stage) {
    if (entry.avgHigh != null && Number.isFinite(entry.avgHigh) && entry.avgHigh > 0) {
      highs.push(entry.avgHigh);
    }
  }
  const globalMaxHigh = highs.length > 0 ? Math.max(...highs) : 0;

  const rows: EnergyBaselineRow[] = stage.map((entry) => {
    if (!entry.row.hasEnoughData || entry.avgHigh == null || globalMaxHigh <= 0) {
      return entry.row;
    }
    const fill = entry.avgHigh / globalMaxHigh;
    const clamped = Math.max(0, Math.min(1, fill));
    return { ...entry.row, progressFill01: clamped };
  });

  return { rows };
}
