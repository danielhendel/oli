/**
 * Pure Sleep stage detail view model (Phase 2E-B Deep / REM).
 *
 * Composes current stage minutes + percent-of-total-sleep + bounded history averages
 * + personal numerical comparison into presentation-ready fields.
 *
 * No React/RN, no I/O, no population In range, no quality-score tiers, no YTD, no chart.
 */

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  buildSleepStageAverageSummaries,
  SLEEP_STAGE_AVERAGE_30D_EXPECTED,
  SLEEP_STAGE_AVERAGE_7D_EXPECTED,
  SLEEP_STAGE_AVERAGE_90D_EXPECTED,
  type SleepStageAverageSummary,
} from "@/lib/data/sleep/sleepStageAverages";
import { sleepStageExplainerCopyFor } from "@/lib/data/sleep/sleepStageExplainerCopy";
import {
  sleepStageDefinitionFor,
  stageMinutesFromNight,
  type SleepStageMetricId,
} from "@/lib/data/sleep/sleepStageMetric";
import {
  buildSleepStagePersonalComparison,
  type SleepStagePersonalComparison,
} from "@/lib/data/sleep/sleepStagePersonalComparison";
import {
  formatSleepStagePercentOfTotal,
  resolveSleepStagePercent,
} from "@/lib/data/sleep/sleepStagePercent";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepStageDetailHistoryStatus = "idle" | "loading" | "ready" | "error";

export type SleepStageDetailExplainerSection = {
  heading: string;
  body: string;
};

export type SleepStagePatternRowId = "7d" | "30d" | "90d";

/** Presentation-ready Your Pattern row — no population status labels. */
export type SleepStagePatternRow = {
  id: SleepStagePatternRowId;
  label: string;
  value: string;
  /** Optional secondary: average % of total sleep when sufficiently supported. */
  secondaryValue: string | null;
  accessibilitySummary: string;
};

export type SleepStagePatternComparison = {
  heading: "Your Pattern";
  sevenDay: SleepStagePatternRow;
  thirtyDay: SleepStagePatternRow;
  ninetyDay: SleepStagePatternRow;
};

export type SleepStageDetailViewModel = {
  metricId: SleepStageMetricId;
  selectedDay: DayKey;
  title: string;
  currentValueMinutes: number | null;
  currentFormatted: string;
  currentPresence: "present" | "absent";
  /** Secondary hero line — e.g. "11% of total sleep"; null when omitted. */
  percentOfTotalSleepSentence: string | null;
  currentPercentDisplay: number | null;
  personalComparison: SleepStagePersonalComparison | null;
  sevenDay: SleepStageAverageSummary | null;
  thirtyDay: SleepStageAverageSummary | null;
  ninetyDay: SleepStageAverageSummary | null;
  pattern: SleepStagePatternComparison | null;
  explainers: readonly SleepStageDetailExplainerSection[];
  dataAccuracyBody: string;
  /** Always null in consumer v1 — technical provenance stays off the sheet. */
  dataAccuracyContextLine: string | null;
  /** Always null in consumer v1. */
  sourceLine: string | null;
  historyStatus: SleepStageDetailHistoryStatus;
  historyErrorMessage: string | null;
  canRetryHistory: boolean;
  isHistoryLoading: boolean;
  accessibilitySummary: string;
};

function patternRowFromAverage(input: {
  id: SleepStagePatternRowId;
  label: string;
  summary: SleepStageAverageSummary;
}): SleepStagePatternRow {
  return {
    id: input.id,
    label: input.label,
    value: input.summary.displayValue,
    secondaryValue: input.summary.displayPercentValue,
    accessibilitySummary: input.summary.accessibilitySummary,
  };
}

export function buildSleepStagePatternComparison(input: {
  sevenDay: SleepStageAverageSummary;
  thirtyDay: SleepStageAverageSummary;
  ninetyDay: SleepStageAverageSummary;
}): SleepStagePatternComparison {
  return {
    heading: "Your Pattern",
    sevenDay: patternRowFromAverage({
      id: "7d",
      label: "7-day average",
      summary: input.sevenDay,
    }),
    thirtyDay: patternRowFromAverage({
      id: "30d",
      label: "30-day average",
      summary: input.thirtyDay,
    }),
    ninetyDay: patternRowFromAverage({
      id: "90d",
      label: "90-day average",
      summary: input.ninetyDay,
    }),
  };
}

function emptyAverage(window: "7d" | "30d" | "90d"): SleepStageAverageSummary {
  const expectedNightCount =
    window === "7d"
      ? SLEEP_STAGE_AVERAGE_7D_EXPECTED
      : window === "30d"
        ? SLEEP_STAGE_AVERAGE_30D_EXPECTED
        : SLEEP_STAGE_AVERAGE_90D_EXPECTED;
  const minimumRequiredNightCount = window === "7d" ? 3 : window === "30d" ? 10 : 30;
  const title = window === "7d" ? "7 days" : window === "30d" ? "30 days" : "90 days";
  return {
    window,
    averageMinutes: null,
    formattedAverage: null,
    averagePercent: null,
    formattedAveragePercent: null,
    validNightCount: 0,
    validPercentNightCount: 0,
    expectedNightCount,
    minimumRequiredNightCount,
    hasEnoughData: false,
    hasEnoughPercentData: false,
    coverageLabel: `0 of ${expectedNightCount} nights`,
    displayValue: "Not enough data",
    displayPercentValue: null,
    accessibilitySummary: `${title} average not enough data.`,
  };
}

export function buildSleepStageDetailViewModel(input: {
  metricId: SleepStageMetricId;
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  /** Optional preformatted value from the card row (must match SleepNight minutes). */
  currentFormattedOverride?: string | null | undefined;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
  historyStatus: SleepStageDetailHistoryStatus;
  historyErrorMessage?: string | null;
}): SleepStageDetailViewModel {
  void input.resolution;
  const {
    metricId,
    selectedDay,
    todayDayKey,
    sleepNight,
    sleepNightByDay,
    historyStatus,
    historyErrorMessage = null,
  } = input;

  const definition = sleepStageDefinitionFor(metricId);
  const currentValueMinutes = stageMinutesFromNight(sleepNight ?? undefined, metricId);
  const currentPresence = currentValueMinutes != null ? "present" : "absent";
  const currentFormatted =
    currentPresence === "present"
      ? input.currentFormattedOverride && input.currentFormattedOverride !== "—"
        ? input.currentFormattedOverride
        : formatSleepDurationMinutes(currentValueMinutes)
      : "Not available";

  const percentResult =
    currentPresence === "present"
      ? resolveSleepStagePercent({ night: sleepNight ?? undefined, metricId })
      : null;
  const percentOfTotalSleepSentence =
    percentResult != null
      ? formatSleepStagePercentOfTotal(percentResult.displayPercent)
      : null;

  const historyReady = historyStatus === "ready";
  const averages = historyReady
    ? buildSleepStageAverageSummaries({
        selectedDay,
        todayDayKey,
        sleepNightByDay,
        metricId,
      })
    : null;

  const sevenDay = averages?.sevenDay ?? null;
  const thirtyDay = averages?.thirtyDay ?? null;
  const ninetyDay = averages?.ninetyDay ?? null;

  const pattern =
    sevenDay != null && thirtyDay != null && ninetyDay != null
      ? buildSleepStagePatternComparison({ sevenDay, thirtyDay, ninetyDay })
      : historyReady
        ? buildSleepStagePatternComparison({
            sevenDay: emptyAverage("7d"),
            thirtyDay: emptyAverage("30d"),
            ninetyDay: emptyAverage("90d"),
          })
        : null;

  const personalComparison =
    currentPresence === "present" &&
    currentValueMinutes != null &&
    ninetyDay != null &&
    ninetyDay.hasEnoughData &&
    ninetyDay.averageMinutes != null
      ? buildSleepStagePersonalComparison({
          currentMinutes: currentValueMinutes,
          ninetyDayAverageMinutes: ninetyDay.averageMinutes,
        })
      : null;

  const copy = sleepStageExplainerCopyFor(metricId);
  const explainers: SleepStageDetailExplainerSection[] = [
    { heading: copy.whatItMeasures.heading, body: copy.whatItMeasures.body },
    { heading: copy.howToUnderstand.heading, body: copy.howToUnderstand.body },
    { heading: copy.whatCanHelp.heading, body: copy.whatCanHelp.body },
  ];

  const heroA11yParts = [
    `${definition.title}.`,
    currentPresence === "present" ? `${currentFormatted}.` : "Not available.",
  ];
  if (percentOfTotalSleepSentence != null) {
    heroA11yParts.push(`${percentOfTotalSleepSentence}.`);
  }
  const personalA11y = personalComparison?.accessibilitySummary ?? "";
  const patternA11y = pattern
    ? [
        pattern.sevenDay.accessibilitySummary,
        pattern.thirtyDay.accessibilitySummary,
        pattern.ninetyDay.accessibilitySummary,
      ].join(" ")
    : historyStatus === "loading"
      ? "Loading recent sleep averages."
      : historyStatus === "error"
        ? "Could not load recent sleep averages."
        : "";

  return {
    metricId,
    selectedDay,
    title: definition.title,
    currentValueMinutes,
    currentFormatted,
    currentPresence,
    percentOfTotalSleepSentence,
    currentPercentDisplay: percentResult?.displayPercent ?? null,
    personalComparison,
    sevenDay,
    thirtyDay,
    ninetyDay,
    pattern,
    explainers,
    dataAccuracyBody: copy.dataAccuracy.body,
    dataAccuracyContextLine: null,
    sourceLine: null,
    historyStatus,
    historyErrorMessage,
    canRetryHistory: historyStatus === "error",
    isHistoryLoading: historyStatus === "loading",
    accessibilitySummary: `${heroA11yParts.join(" ")} ${personalA11y} ${patternA11y}`.trim(),
  };
}
