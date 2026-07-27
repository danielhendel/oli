/**
 * Readiness contributor pattern averages — 7 / 30 / 90-day windows (Phase 2F-C1).
 *
 * Pure helpers over the shared contributor-history map. One 90-day range fetch
 * is sliced into windows; no classification, no consumer labels, no UI.
 *
 * Contributor values are Oura-owned 0–100 scores (provider-owned). Missing is
 * never zero. Averages use unrounded valid samples; round only for future
 * presentation.
 *
 * Windows are inclusive of the selected day and the prior N−1 local calendar days.
 * Future days excluded. Duplicate calendar days excluded (one sample per day).
 * Range API rows are exact-day only (no prior-night fallback densification).
 *
 * Minimum sufficiency (mirrors Sleep Duration / RHR):
 * - 7d: ≥3 valid contributor days
 * - 30d: ≥10 valid contributor days
 * - 90d: ≥30 valid contributor days
 */

import type { ReadinessRangeContributorKey } from "@oli/contracts/ouraVendor";
import { normalizeReadinessContributorScore } from "@oli/contracts/ouraVendor";

import { activityTrailingNDaysInclusive } from "@/lib/data/activity/activityOverviewRanges";
import type { ReadinessContributorDayCell } from "@/lib/data/readiness/readinessContributorHistoryTypes";
import type { DayKey } from "@/lib/ui/calendar/types";

/** Inclusive day count for the shared contributor detail history request. */
export const READINESS_CONTRIBUTOR_DETAIL_HISTORY_DAY_COUNT = 90 as const;

export const READINESS_CONTRIBUTOR_AVERAGE_7D_EXPECTED = 7 as const;
export const READINESS_CONTRIBUTOR_AVERAGE_30D_EXPECTED = 30 as const;
export const READINESS_CONTRIBUTOR_AVERAGE_90D_EXPECTED = 90 as const;

export const READINESS_CONTRIBUTOR_AVERAGE_7D_MIN_VALID = 3 as const;
export const READINESS_CONTRIBUTOR_AVERAGE_30D_MIN_VALID = 10 as const;
export const READINESS_CONTRIBUTOR_AVERAGE_90D_MIN_VALID = 30 as const;

export type ReadinessContributorAverageWindow = "7d" | "30d" | "90d";

export type ReadinessContributorDaySample = {
  calendarDay: DayKey;
  /** Unrounded validated 0–100 contributor score. */
  score: number;
};

export type ReadinessContributorAverageSummary = {
  window: ReadinessContributorAverageWindow;
  contributorKey: ReadinessRangeContributorKey;
  /** Unrounded arithmetic mean when sufficient; otherwise null. */
  averageScore: number | null;
  validDayCount: number;
  expectedDayCount: 7 | 30 | 90;
  minimumRequiredDayCount: number;
  hasEnoughData: boolean;
  /** Selected-day current contributor score (null when missing/invalid). */
  selectedDayScore: number | null;
};

export function readinessContributorDetailHistoryDayKeys(selectedDay: DayKey): DayKey[] {
  return activityTrailingNDaysInclusive(
    selectedDay,
    READINESS_CONTRIBUTOR_DETAIL_HISTORY_DAY_COUNT,
  );
}

export function readinessContributorAverageWindowDayKeys(
  selectedDay: DayKey,
  window: ReadinessContributorAverageWindow,
): DayKey[] {
  const count =
    window === "7d"
      ? READINESS_CONTRIBUTOR_AVERAGE_7D_EXPECTED
      : window === "30d"
        ? READINESS_CONTRIBUTOR_AVERAGE_30D_EXPECTED
        : READINESS_CONTRIBUTOR_AVERAGE_90D_EXPECTED;
  return activityTrailingNDaysInclusive(selectedDay, count);
}

function minValidForWindow(window: ReadinessContributorAverageWindow): number {
  if (window === "7d") return READINESS_CONTRIBUTOR_AVERAGE_7D_MIN_VALID;
  if (window === "30d") return READINESS_CONTRIBUTOR_AVERAGE_30D_MIN_VALID;
  return READINESS_CONTRIBUTOR_AVERAGE_90D_MIN_VALID;
}

function expectedForWindow(window: ReadinessContributorAverageWindow): 7 | 30 | 90 {
  if (window === "7d") return READINESS_CONTRIBUTOR_AVERAGE_7D_EXPECTED;
  if (window === "30d") return READINESS_CONTRIBUTOR_AVERAGE_30D_EXPECTED;
  return READINESS_CONTRIBUTOR_AVERAGE_90D_EXPECTED;
}

/**
 * Collect exact-day contributor samples for one approved key.
 * Missing / invalid excluded. Future days skipped. One sample per calendar day.
 */
export function collectReadinessContributorSamples(input: {
  contributorKey: ReadinessRangeContributorKey;
  calendarDays: readonly DayKey[];
  todayDayKey: DayKey;
  dayByDay: Readonly<Partial<Record<DayKey, ReadinessContributorDayCell>>>;
}): ReadinessContributorDaySample[] {
  const samples: ReadinessContributorDaySample[] = [];
  const seenDays = new Set<string>();

  for (const calendarDay of input.calendarDays) {
    if (calendarDay > input.todayDayKey) continue;
    if (seenDays.has(calendarDay)) continue;
    const cell = input.dayByDay[calendarDay];
    if (cell == null || !cell.settled || cell.day == null) continue;
    // Range rows are exact-day vendor truth; reject day mismatch if present.
    if (cell.day.day !== calendarDay) continue;
    const raw = cell.day.contributors?.[input.contributorKey];
    const score = normalizeReadinessContributorScore(raw);
    if (score == null) continue;
    seenDays.add(calendarDay);
    samples.push({ calendarDay, score });
  }

  return samples;
}

/**
 * Arithmetic mean of valid contributor scores.
 * Invalid / missing values are excluded (not treated as 0).
 */
export function averageScoreFromContributorSamples(
  samples: readonly ReadinessContributorDaySample[],
): number | null {
  if (samples.length === 0) return null;
  const total = samples.reduce((acc, s) => acc + s.score, 0);
  return total / samples.length;
}

export function resolveSelectedDayContributorScore(input: {
  contributorKey: ReadinessRangeContributorKey;
  selectedDay: DayKey;
  todayDayKey: DayKey;
  dayByDay: Readonly<Partial<Record<DayKey, ReadinessContributorDayCell>>>;
}): number | null {
  if (input.selectedDay > input.todayDayKey) return null;
  const cell = input.dayByDay[input.selectedDay];
  if (cell == null || !cell.settled || cell.day == null) return null;
  if (cell.day.day !== input.selectedDay) return null;
  return normalizeReadinessContributorScore(cell.day.contributors?.[input.contributorKey]);
}

export function buildReadinessContributorAverageSummary(input: {
  contributorKey: ReadinessRangeContributorKey;
  window: ReadinessContributorAverageWindow;
  selectedDay: DayKey;
  todayDayKey: DayKey;
  dayByDay: Readonly<Partial<Record<DayKey, ReadinessContributorDayCell>>>;
}): ReadinessContributorAverageSummary {
  const { contributorKey, window, selectedDay, todayDayKey, dayByDay } = input;
  const expectedDayCount = expectedForWindow(window);
  const minimumRequiredDayCount = minValidForWindow(window);
  const calendarDays = readinessContributorAverageWindowDayKeys(selectedDay, window);
  const samples = collectReadinessContributorSamples({
    contributorKey,
    calendarDays,
    todayDayKey,
    dayByDay,
  });
  const validDayCount = samples.length;
  const hasEnoughData = validDayCount >= minimumRequiredDayCount;
  const mean = averageScoreFromContributorSamples(samples);
  const averageScore = hasEnoughData && mean != null ? mean : null;
  const selectedDayScore = resolveSelectedDayContributorScore({
    contributorKey,
    selectedDay,
    todayDayKey,
    dayByDay,
  });

  return {
    window,
    contributorKey,
    averageScore,
    validDayCount,
    expectedDayCount,
    minimumRequiredDayCount,
    hasEnoughData,
    selectedDayScore,
  };
}

export function buildReadinessContributorAverageSummaries(input: {
  contributorKey: ReadinessRangeContributorKey;
  selectedDay: DayKey;
  todayDayKey: DayKey;
  dayByDay: Readonly<Partial<Record<DayKey, ReadinessContributorDayCell>>>;
}): {
  sevenDay: ReadinessContributorAverageSummary;
  thirtyDay: ReadinessContributorAverageSummary;
  ninetyDay: ReadinessContributorAverageSummary;
} {
  return {
    sevenDay: buildReadinessContributorAverageSummary({ ...input, window: "7d" }),
    thirtyDay: buildReadinessContributorAverageSummary({ ...input, window: "30d" }),
    ninetyDay: buildReadinessContributorAverageSummary({ ...input, window: "90d" }),
  };
}
