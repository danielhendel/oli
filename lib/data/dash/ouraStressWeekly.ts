/**
 * Oura Daily Stress V1 — pure normalizer and weekly balanced-day coverage.
 * No invented 0–100 stress score.
 */
import { z } from "zod";

import { dayKeySchema } from "@oli/contracts";

/** Official PublicDailyStressSummary values (Oura API v2). */
export const OURA_DAILY_STRESS_SUMMARY_VALUES = ["restored", "normal", "stressful"] as const;
export type OuraDailyStressSummary = (typeof OURA_DAILY_STRESS_SUMMARY_VALUES)[number];

export const ouraDailyStressSummarySchema = z.enum(OURA_DAILY_STRESS_SUMMARY_VALUES);

export type OuraStressBalanceClass = "balanced" | "stressful";

export function classifyOuraStressDaySummary(
  summary: OuraDailyStressSummary,
): OuraStressBalanceClass {
  if (summary === "stressful") return "stressful";
  return "balanced";
}

export type WeeklyStressDayInput = {
  day: string;
  daySummary: OuraDailyStressSummary;
};

export type WeeklyStressCoverageResult = {
  /** Days with a valid exact summary in the elapsed week window. */
  eligibleStressDayCount: number;
  balancedDayCount: number;
  stressfulDayCount: number;
  restoredDayCount: number;
  normalDayCount: number;
  /** balanced / eligible; null when no eligible days. */
  progress01: number | null;
  displayValue: string;
  accessibilityLabel: string;
};

/**
 * Weekly Stress V1: balanced-day coverage among eligible exact provider days.
 * Missing / future days are omitted from the denominator by the caller (elapsed
 * window + only days with summaries passed in).
 */
export function computeWeeklyStressBalancedCoverage(input: {
  days: readonly WeeklyStressDayInput[];
}): WeeklyStressCoverageResult {
  let balancedDayCount = 0;
  let stressfulDayCount = 0;
  let restoredDayCount = 0;
  let normalDayCount = 0;

  for (const d of input.days) {
    const dayOk = dayKeySchema.safeParse(d.day);
    if (!dayOk.success) continue;
    const summaryOk = ouraDailyStressSummarySchema.safeParse(d.daySummary);
    if (!summaryOk.success) continue;

    if (summaryOk.data === "restored") restoredDayCount += 1;
    else if (summaryOk.data === "normal") normalDayCount += 1;
    else stressfulDayCount += 1;

    if (classifyOuraStressDaySummary(summaryOk.data) === "balanced") {
      balancedDayCount += 1;
    }
  }

  const eligibleStressDayCount =
    restoredDayCount + normalDayCount + stressfulDayCount;

  if (eligibleStressDayCount === 0) {
    return {
      eligibleStressDayCount: 0,
      balancedDayCount: 0,
      stressfulDayCount: 0,
      restoredDayCount: 0,
      normalDayCount: 0,
      progress01: null,
      displayValue: "No data",
      accessibilityLabel:
        "Stress, no data for this week from Oura, button. Opens Stress analytics.",
    };
  }

  const progress01 = balancedDayCount / eligibleStressDayCount;
  const displayValue = `${balancedDayCount} of ${eligibleStressDayCount} balanced`;
  return {
    eligibleStressDayCount,
    balancedDayCount,
    stressfulDayCount,
    restoredDayCount,
    normalDayCount,
    progress01,
    displayValue,
    accessibilityLabel: `Stress, ${balancedDayCount} of ${eligibleStressDayCount} eligible days balanced, button. Opens Stress analytics.`,
  };
}

/** Runtime provider document schema (Oura daily_stress item). */
export const ouraDailyStressProviderDocumentSchema = z
  .object({
    id: z.string().min(1).optional(),
    day: dayKeySchema,
    day_summary: ouraDailyStressSummarySchema.nullable().optional(),
    stress_high: z.number().finite().nonnegative().nullable().optional(),
    recovery_high: z.number().finite().nonnegative().nullable().optional(),
  })
  .strip();

export type OuraDailyStressProviderDocument = z.infer<
  typeof ouraDailyStressProviderDocumentSchema
>;

export function parseOuraDailyStressProviderDocument(
  raw: unknown,
): OuraDailyStressProviderDocument | null {
  const parsed = ouraDailyStressProviderDocumentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
