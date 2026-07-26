/**
 * Pure Sleep stage detail view model (Phase 2E-B Deep / REM).
 *
 * Composes current stage minutes + percent-of-total-sleep + educational adult
 * context (ages 18–64) + personal numerical comparison + bounded history averages.
 *
 * No React/RN, no I/O, no clinical diagnosis, no quality-score tiers, no YTD, no chart.
 */

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import { ageYearsFromProfileDateOfBirth } from "@/lib/body/bodyCompositionShared";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  buildSleepStageAverageSummaries,
  SLEEP_STAGE_AVERAGE_30D_EXPECTED,
  SLEEP_STAGE_AVERAGE_7D_EXPECTED,
  SLEEP_STAGE_AVERAGE_90D_EXPECTED,
  type SleepStageAverageSummary,
} from "@/lib/data/sleep/sleepStageAverages";
import {
  classifySleepStageAdultContext,
  formatSleepStageAdultContextEquivalentMinutes,
  resolveSleepStageAdultContextWithheldReason,
  sleepStageAdultContextAccessibilitySummary,
  sleepStageAdultContextMarkerPosition01,
  sleepStageAdultContextZoneFractions,
  type SleepStageAdultContextResult,
  type SleepStageAdultContextStatus,
  type SleepStageAdultContextWithheldReason,
} from "@/lib/data/sleep/sleepStageAdultContext";
import {
  sleepStageExplainerCopyFor,
  sleepStageHowToUnderstandBody,
} from "@/lib/data/sleep/sleepStageExplainerCopy";
import {
  sleepStageDefinitionFor,
  stageMinutesFromNight,
  totalSleepMinutesDenominator,
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
  /** Compact `57m · 13%` when percent is valid; minutes-only or Not enough data otherwise. */
  value: string;
  /** Always null in simplified v1 — percent is folded into `value`. */
  secondaryValue: string | null;
  accessibilitySummary: string;
};

export type SleepStagePatternComparison = {
  heading: "Your Pattern";
  sevenDay: SleepStagePatternRow;
  thirtyDay: SleepStagePatternRow;
  ninetyDay: SleepStagePatternRow;
};

/** Presentation-ready dual-marker typical-range bar — no DOB or evidence IDs. */
export type SleepStageAdultContextPresentation = {
  status: SleepStageAdultContextStatus;
  statusLabel: string;
  /** Retained for education/tests; not shown on the primary bar hierarchy. */
  typicalPercentRangeText: string;
  /** Retained for typed model completeness; not shown on the primary sheet. */
  equivalentMinutesSentence: string;
  belowLabel: "Below Typical";
  typicalLabel: "Typical Range";
  aboveLabel: "Above Typical";
  belowRangeText: string;
  typicalRangeText: string;
  aboveRangeText: string;
  zoneFractions: { below: number; typical: number; above: number };
  /** Current-night marker on the visual domain (0–1). */
  markerPosition01: number;
  currentMarkerPosition01: number;
  /** Null when 90-day average percent is insufficient. */
  ninetyDayMarkerPosition01: number | null;
  currentPercentDisplay: number;
  ninetyDayPercentDisplay: number | null;
  accessibilitySummary: string;
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
  adultContext: SleepStageAdultContextPresentation | null;
  adultContextResult: SleepStageAdultContextResult | null;
  adultContextWithheldReason: SleepStageAdultContextWithheldReason;
  ageYears: number | null;
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
  const minutesValue = input.summary.displayValue;
  let value = minutesValue;
  if (
    input.summary.hasEnoughData &&
    minutesValue !== "Not enough data" &&
    input.summary.hasEnoughPercentData &&
    input.summary.averagePercent != null
  ) {
    value = `${minutesValue} · ${Math.round(input.summary.averagePercent)}%`;
  }
  return {
    id: input.id,
    label: input.label,
    value,
    secondaryValue: null,
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

function refDateFromDayKey(day: DayKey): Date {
  const parts = day.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  return new Date(y, m - 1, d);
}

function buildAdultContextPresentation(input: {
  result: SleepStageAdultContextResult;
  totalSleepMinutes: number;
  stagePercentUnrounded: number;
  currentPercentDisplay: number;
  ninetyDayPercentUnrounded: number | null;
}): SleepStageAdultContextPresentation {
  const { result } = input;
  const equivalents = formatSleepStageAdultContextEquivalentMinutes({
    totalSleepMinutes: input.totalSleepMinutes,
    lowerPercent: result.lowerPercent,
    upperPercent: result.upperPercent,
  });
  const typicalPercentRangeText = `${result.lowerPercent}–${result.upperPercent}% of total sleep`;
  const ninetyDayPercentDisplay =
    input.ninetyDayPercentUnrounded != null && Number.isFinite(input.ninetyDayPercentUnrounded)
      ? Math.round(input.ninetyDayPercentUnrounded)
      : null;
  const currentMarkerPosition01 = sleepStageAdultContextMarkerPosition01({
    metricId: result.metricId,
    stagePercentUnrounded: input.stagePercentUnrounded,
  });
  const ninetyDayMarkerPosition01 =
    input.ninetyDayPercentUnrounded != null && Number.isFinite(input.ninetyDayPercentUnrounded)
      ? sleepStageAdultContextMarkerPosition01({
          metricId: result.metricId,
          stagePercentUnrounded: input.ninetyDayPercentUnrounded,
        })
      : null;
  const accessibilitySummary = sleepStageAdultContextAccessibilitySummary({
    label: result.label,
    lowerPercent: result.lowerPercent,
    upperPercent: result.upperPercent,
    currentPercentDisplay: input.currentPercentDisplay,
    ninetyDayPercentDisplay,
  });

  return {
    status: result.status,
    statusLabel: result.label,
    typicalPercentRangeText,
    equivalentMinutesSentence: equivalents.equivalentSentence,
    belowLabel: "Below Typical",
    typicalLabel: "Typical Range",
    aboveLabel: "Above Typical",
    belowRangeText: `<${result.lowerPercent}%`,
    typicalRangeText: `${result.lowerPercent}–${result.upperPercent}%`,
    aboveRangeText: `>${result.upperPercent}%`,
    zoneFractions: sleepStageAdultContextZoneFractions(result.metricId),
    markerPosition01: currentMarkerPosition01,
    currentMarkerPosition01,
    ninetyDayMarkerPosition01,
    currentPercentDisplay: input.currentPercentDisplay,
    ninetyDayPercentDisplay,
    accessibilitySummary,
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
  dateOfBirth?: string | null | undefined;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
  historyStatus: SleepStageDetailHistoryStatus;
  historyErrorMessage?: string | null;
}): SleepStageDetailViewModel {
  const {
    metricId,
    selectedDay,
    todayDayKey,
    sleepNight,
    resolution = null,
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

  const ageYears = ageYearsFromProfileDateOfBirth(
    input.dateOfBirth ?? null,
    refDateFromDayKey(selectedDay),
  );
  const totalSleepMinutes = totalSleepMinutesDenominator(sleepNight ?? undefined);

  const adultContextResult = classifySleepStageAdultContext({
    metricId,
    stageMinutes: currentValueMinutes,
    totalSleepMinutes,
    stagePercentUnrounded: percentResult?.value ?? null,
    ageYears,
    isComplete: sleepNight?.isComplete,
    resolution,
  });
  const adultContextWithheldReason = resolveSleepStageAdultContextWithheldReason({
    ageYears,
    result: adultContextResult,
  });
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

  const ninetyDayPercentUnrounded =
    ninetyDay != null &&
    ninetyDay.hasEnoughPercentData &&
    ninetyDay.averagePercent != null
      ? ninetyDay.averagePercent
      : null;

  const adultContext =
    adultContextResult != null &&
    totalSleepMinutes != null &&
    percentResult != null
      ? buildAdultContextPresentation({
          result: adultContextResult,
          totalSleepMinutes,
          stagePercentUnrounded: percentResult.value,
          currentPercentDisplay: percentResult.displayPercent,
          ninetyDayPercentUnrounded,
        })
      : null;

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
    {
      heading: copy.howToUnderstand.heading,
      body: sleepStageHowToUnderstandBody({
        metricId,
        adultContextAvailable: adultContext != null,
      }),
    },
    { heading: copy.whatCanHelp.heading, body: copy.whatCanHelp.body },
  ];

  const heroA11yParts = [
    `${definition.title}.`,
    currentPresence === "present" ? `${currentFormatted}.` : "Not available.",
  ];
  if (percentOfTotalSleepSentence != null) {
    heroA11yParts.push(`${percentOfTotalSleepSentence}.`);
  }
  const adultA11y = adultContext?.accessibilitySummary ?? "";
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
    adultContext,
    adultContextResult,
    adultContextWithheldReason,
    ageYears,
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
    accessibilitySummary:
      `${heroA11yParts.join(" ")} ${adultA11y} ${patternA11y}`.trim(),
  };
}
