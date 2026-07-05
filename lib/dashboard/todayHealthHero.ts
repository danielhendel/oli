import type { DailyFactsDto, HealthScoreDoc, HealthScoreTier } from "@/lib/contracts";
import { formatTodayDashboardDate } from "@/lib/date/formatDashboardDate";
import { formatHealthScoreTier } from "@/lib/format/healthScore";

/** Display when sleep or recovery is unavailable (em dash). */
export const EMPTY_METRIC_PLACEHOLDER = "\u2014";

export const SLEEP_RECOVERY_FOOTER = "Last night";

export type GreetingPeriod = "morning" | "afternoon" | "evening";

export function greetingPeriodForLocalHour(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

export function greetingPhraseForPeriod(period: GreetingPeriod): string {
  switch (period) {
    case "morning":
      return "Good morning";
    case "afternoon":
      return "Good afternoon";
    default:
      return "Good evening";
  }
}

export function greetingHeadline(now: Date): { period: GreetingPeriod; phrase: string } {
  const period = greetingPeriodForLocalHour(now.getHours());
  return { period, phrase: greetingPhraseForPeriod(period) };
}

import {
  pickSleepMinutesFromFacts,
  type SleepMinutesPick,
} from "@/lib/data/sleep/pickSleepMinutesFromFacts";

export type { SleepMinutesPick };
export { pickSleepMinutesFromFacts };

/** Compact display for Dash sleep cell, e.g. `8h 12m`. */
export function formatSleepDurationCompact(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${h}h ${m}m`;
}

function formatSleepMinutesForAccessibility(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m} minutes`;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h} ${h === 1 ? "hour" : "hours"} ${m} minutes`;
}

/**
 * VoiceOver label per product spec, e.g.
 * "Last night summary. Sleep 8 hours 12 minutes. Recovery strong."
 */
export function buildSleepRecoveryAccessibilityLabel(args: {
  sleepMinutes: number | undefined;
  recoveryTier: HealthScoreTier | undefined;
}): string {
  const sleepPart =
    typeof args.sleepMinutes === "number" &&
    Number.isFinite(args.sleepMinutes) &&
    args.sleepMinutes > 0
      ? `Sleep ${formatSleepMinutesForAccessibility(args.sleepMinutes)}.`
      : "Sleep not available.";
  const recoveryPart =
    args.recoveryTier != null
      ? `Recovery ${formatHealthScoreTier(args.recoveryTier).toLowerCase()}.`
      : "Recovery not available.";
  return `Last night summary. ${sleepPart} ${recoveryPart}`;
}

export type SleepRecoverySummaryModel = {
  sleepDisplay: string;
  recoveryDisplay: string;
  footerLabel: string;
  loading: boolean;
  accessibilityLabel: string;
};

export type TodayHealthHeroViewModel = {
  greetingPhrase: string;
  firstName: string | null;
  dateLine: string;
  /** Greeting + name row hydrating. */
  loading: boolean;
  sleepRecovery: SleepRecoverySummaryModel;
};

export type BuildTodayHealthHeroVmInput = {
  now: Date;
  dateLocale?: string;
  firstName: string | null;
  dailyFacts: DailyFactsDto | undefined;
  dailyFactsSettled: boolean;
  healthScore: HealthScoreDoc | undefined;
  healthSettled: boolean;
  /** Profile or facts still hydrating — greeting skeleton. */
  headerLoading: boolean;
  /** Facts or health score still hydrating — sleep/recovery skeleton. */
  sleepRecoveryLoading: boolean;
};

export function buildSleepRecoverySummaryModel(args: {
  dailyFactsSettled: boolean;
  healthSettled: boolean;
  dailyFacts: DailyFactsDto | undefined;
  healthScore: HealthScoreDoc | undefined;
  loading: boolean;
}): SleepRecoverySummaryModel {
  const { loading, dailyFactsSettled, healthSettled, dailyFacts, healthScore } = args;

  if (loading) {
    return {
      sleepDisplay: EMPTY_METRIC_PLACEHOLDER,
      recoveryDisplay: EMPTY_METRIC_PLACEHOLDER,
      footerLabel: SLEEP_RECOVERY_FOOTER,
      loading: true,
      accessibilityLabel: "Loading last night summary.",
    };
  }

  const sleepMin = pickSleepMinutesFromFacts(dailyFacts?.sleep);
  const tier = healthScore?.domainScores.recovery.tier;

  const sleepDisplay =
    dailyFactsSettled && sleepMin != null ? formatSleepDurationCompact(sleepMin) : EMPTY_METRIC_PLACEHOLDER;

  const recoveryDisplay =
    healthSettled && tier != null ? formatHealthScoreTier(tier) : EMPTY_METRIC_PLACEHOLDER;

  return {
    sleepDisplay,
    recoveryDisplay,
    footerLabel: SLEEP_RECOVERY_FOOTER,
    loading: false,
    accessibilityLabel: buildSleepRecoveryAccessibilityLabel({
      sleepMinutes: sleepMin,
      recoveryTier: tier,
    }),
  };
}

export function buildTodayHealthHeroViewModel(input: BuildTodayHealthHeroVmInput): TodayHealthHeroViewModel {
  const { phrase } = greetingHeadline(input.now);
  const dateLine = formatTodayDashboardDate(input.now, input.dateLocale);
  const firstName = input.firstName?.trim() ? input.firstName.trim() : null;

  const sleepRecovery = buildSleepRecoverySummaryModel({
    dailyFactsSettled: input.dailyFactsSettled,
    healthSettled: input.healthSettled,
    dailyFacts: input.dailyFacts,
    healthScore: input.healthScore,
    loading: input.sleepRecoveryLoading,
  });

  return {
    greetingPhrase: phrase,
    firstName,
    dateLine,
    loading: input.headerLoading,
    sleepRecovery,
  };
}
