/**
 * Pure Sleep Duration detail view model (Phase 2D pilot).
 *
 * Composes current SleepNight duration + bounded history averages + age-aware
 * reference classification into presentation-ready fields.
 *
 * No React/RN, no I/O, no Oura score, no DailyFacts mixing, no YTD, no mini-chart.
 */

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import { ageYearsFromProfileDateOfBirth } from "@/lib/body/bodyCompositionShared";
import {
  buildSleepDurationAverageSummaries,
  SLEEP_DURATION_AVERAGE_30D_EXPECTED,
  SLEEP_DURATION_AVERAGE_7D_EXPECTED,
  SLEEP_DURATION_AVERAGE_90D_EXPECTED,
  type SleepDurationAverageSummary,
} from "@/lib/data/sleep/sleepDurationAverages";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  classifySleepDurationReference,
  formatSleepDurationReferenceStatusSentence,
  SLEEP_DURATION_DETAIL_EXPLAINER_COPY,
  SLEEP_DURATION_REFERENCE_MODEL_VERSION,
  sleepDurationHowToUnderstandBody,
  sleepDurationPatternStatusLabel,
  sleepDurationReferenceAccessibilitySummary,
  type SleepDurationPatternStatusLabel,
  type SleepDurationReferenceResult,
} from "@/lib/data/sleep/sleepDurationReference";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepDurationDetailHistoryStatus = "idle" | "loading" | "ready" | "error";

export type SleepDurationDetailExplainerSection = {
  heading: string;
  body: string;
};

export type SleepDurationPatternRowId = "7d" | "30d" | "90d";

/** Presentation-ready Your Pattern row — no classification in JSX. */
export type SleepDurationPatternRow = {
  id: SleepDurationPatternRowId;
  label: string;
  value: string;
  statusLabel: SleepDurationPatternStatusLabel | null;
  accessibilitySummary: string;
};

export type SleepDurationPatternComparison = {
  heading: "Your Pattern";
  sevenDay: SleepDurationPatternRow;
  thirtyDay: SleepDurationPatternRow;
  ninetyDay: SleepDurationPatternRow;
};

export type SleepDurationDetailViewModel = {
  metricId: "sleep_duration";
  selectedDay: DayKey;
  title: string;
  currentValueMinutes: number | null;
  currentFormatted: string;
  currentPresence: "present" | "absent";
  rangeResult: SleepDurationReferenceResult | null;
  rangeModelVersion: typeof SLEEP_DURATION_REFERENCE_MODEL_VERSION | null;
  statusSentence: string | null;
  ageYears: number | null;
  rangeWithheldReason: "unknown_age" | "minor" | "none";
  sevenDay: SleepDurationAverageSummary | null;
  thirtyDay: SleepDurationAverageSummary | null;
  ninetyDay: SleepDurationAverageSummary | null;
  pattern: SleepDurationPatternComparison | null;
  explainers: readonly SleepDurationDetailExplainerSection[];
  dataAccuracyBody: string;
  /** Always null in consumer v1 — technical provenance stays off the sheet. */
  dataAccuracyContextLine: string | null;
  /** Always null in consumer v1. */
  sourceLine: string | null;
  historyStatus: SleepDurationDetailHistoryStatus;
  historyErrorMessage: string | null;
  canRetryHistory: boolean;
  isHistoryLoading: boolean;
  accessibilitySummary: string;
};

function durationMinutesFromNight(night: SleepNightDocumentDto | null | undefined): number | null {
  if (night == null) return null;
  const m = night.mainSleepMinutes ?? night.totalSleepMinutes;
  if (typeof m !== "number" || !Number.isFinite(m) || m <= 0) return null;
  return Math.round(m);
}

function refDateFromDayKey(day: DayKey): Date {
  const parts = day.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  return new Date(y, m - 1, d);
}

function classifyPatternStatus(
  durationMinutes: number | null,
  ageYears: number | null,
): SleepDurationPatternStatusLabel | null {
  if (durationMinutes == null || ageYears == null) return null;
  return sleepDurationPatternStatusLabel(
    classifySleepDurationReference({
      durationMinutes,
      ageYears,
    }),
  );
}

function patternRowFromAverage(input: {
  id: SleepDurationPatternRowId;
  label: string;
  summary: SleepDurationAverageSummary;
  ageYears: number | null;
}): SleepDurationPatternRow {
  const statusLabel =
    input.summary.hasEnoughData && input.summary.averageMinutes != null
      ? classifyPatternStatus(input.summary.averageMinutes, input.ageYears)
      : null;
  const accessibilitySummary = statusLabel
    ? `${input.label} ${input.summary.displayValue}. ${statusLabel}.`
    : `${input.label} ${input.summary.displayValue}.`;
  return {
    id: input.id,
    label: input.label,
    value: input.summary.displayValue,
    statusLabel,
    accessibilitySummary,
  };
}

export function buildSleepDurationPatternComparison(input: {
  ageYears: number | null;
  sevenDay: SleepDurationAverageSummary;
  thirtyDay: SleepDurationAverageSummary;
  ninetyDay: SleepDurationAverageSummary;
}): SleepDurationPatternComparison {
  return {
    heading: "Your Pattern",
    sevenDay: patternRowFromAverage({
      id: "7d",
      label: "7-day average",
      summary: input.sevenDay,
      ageYears: input.ageYears,
    }),
    thirtyDay: patternRowFromAverage({
      id: "30d",
      label: "30-day average",
      summary: input.thirtyDay,
      ageYears: input.ageYears,
    }),
    ninetyDay: patternRowFromAverage({
      id: "90d",
      label: "90-day average",
      summary: input.ninetyDay,
      ageYears: input.ageYears,
    }),
  };
}

function emptyAverage(window: "7d" | "30d" | "90d"): SleepDurationAverageSummary {
  const expectedNightCount =
    window === "7d"
      ? SLEEP_DURATION_AVERAGE_7D_EXPECTED
      : window === "30d"
        ? SLEEP_DURATION_AVERAGE_30D_EXPECTED
        : SLEEP_DURATION_AVERAGE_90D_EXPECTED;
  const minimumRequiredNightCount = window === "7d" ? 3 : window === "30d" ? 10 : 30;
  return {
    window,
    averageMinutes: null,
    formattedAverage: null,
    validNightCount: 0,
    expectedNightCount,
    minimumRequiredNightCount,
    hasEnoughData: false,
    coverageLabel: `0 of ${expectedNightCount} nights`,
    displayValue: "Not enough data",
    accessibilitySummary: `${window === "7d" ? "7 days" : window === "30d" ? "30 days" : "90 days"} average not enough data.`,
  };
}

export function buildSleepDurationDetailViewModel(input: {
  selectedDay: DayKey;
  /** Device today for future-day exclusion in averages. */
  todayDayKey: DayKey;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  /** Optional preformatted value from the card row (must match SleepNight minutes). */
  currentFormattedOverride?: string | null | undefined;
  dateOfBirth: string | null | undefined;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
  historyStatus: SleepDurationDetailHistoryStatus;
  historyErrorMessage?: string | null;
}): SleepDurationDetailViewModel {
  const {
    selectedDay,
    todayDayKey,
    sleepNight,
    dateOfBirth,
    sleepNightByDay,
    historyStatus,
    historyErrorMessage = null,
  } = input;

  const currentValueMinutes = durationMinutesFromNight(sleepNight ?? undefined);
  const currentPresence = currentValueMinutes != null ? "present" : "absent";
  const currentFormatted =
    currentPresence === "present"
      ? input.currentFormattedOverride && input.currentFormattedOverride !== "—"
        ? input.currentFormattedOverride
        : formatSleepDurationMinutes(currentValueMinutes)
      : "Not available";

  const ageYears = ageYearsFromProfileDateOfBirth(
    dateOfBirth ?? null,
    refDateFromDayKey(selectedDay),
  );

  let rangeWithheldReason: SleepDurationDetailViewModel["rangeWithheldReason"] = "none";
  if (ageYears == null) {
    rangeWithheldReason = "unknown_age";
  } else if (ageYears < 18) {
    rangeWithheldReason = "minor";
  }

  const rangeResult =
    currentPresence === "present"
      ? classifySleepDurationReference({
          durationMinutes: currentValueMinutes,
          ageYears,
        })
      : null;

  const statusSentence = formatSleepDurationReferenceStatusSentence(rangeResult);

  const historyReady = historyStatus === "ready";
  const averages = historyReady
    ? buildSleepDurationAverageSummaries({
        selectedDay,
        todayDayKey,
        sleepNightByDay,
      })
    : null;

  const sevenDay = averages?.sevenDay ?? null;
  const thirtyDay = averages?.thirtyDay ?? null;
  const ninetyDay = averages?.ninetyDay ?? null;

  const pattern =
    sevenDay != null && thirtyDay != null && ninetyDay != null
      ? buildSleepDurationPatternComparison({
          ageYears,
          sevenDay,
          thirtyDay,
          ninetyDay,
        })
      : historyReady
        ? buildSleepDurationPatternComparison({
            ageYears,
            sevenDay: emptyAverage("7d"),
            thirtyDay: emptyAverage("30d"),
            ninetyDay: emptyAverage("90d"),
          })
        : null;

  const explainers: SleepDurationDetailExplainerSection[] = [
    {
      heading: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.whatItMeasures.heading,
      body: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.whatItMeasures.body,
    },
    {
      heading: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.howToUnderstand.heading,
      body: sleepDurationHowToUnderstandBody({ ageYears }),
    },
    {
      heading: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.whatCanHelp.heading,
      body: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.whatCanHelp.body,
    },
  ];

  const rangeA11y = sleepDurationReferenceAccessibilitySummary({
    formattedDuration: currentFormatted,
    result: rangeResult,
  });
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
    metricId: "sleep_duration",
    selectedDay,
    title: "Duration",
    currentValueMinutes,
    currentFormatted,
    currentPresence,
    rangeResult,
    rangeModelVersion: rangeResult?.modelVersion ?? null,
    statusSentence,
    ageYears,
    rangeWithheldReason,
    sevenDay,
    thirtyDay,
    ninetyDay,
    pattern,
    explainers,
    dataAccuracyBody: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.dataAccuracyBase.body,
    dataAccuracyContextLine: null,
    sourceLine: null,
    historyStatus,
    historyErrorMessage,
    canRetryHistory: historyStatus === "error",
    isHistoryLoading: historyStatus === "loading",
    accessibilitySummary: `${rangeA11y} ${patternA11y}`.trim(),
  };
}
