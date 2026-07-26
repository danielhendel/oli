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
  type SleepDurationAverageSummary,
} from "@/lib/data/sleep/sleepDurationAverages";
import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  classifySleepDurationReference,
  formatSleepDurationReferenceStatusSentence,
  SLEEP_DURATION_DETAIL_EXPLAINER_COPY,
  SLEEP_DURATION_REFERENCE_MODEL_VERSION,
  sleepDurationHowToUnderstandBody,
  sleepDurationReferenceAccessibilitySummary,
  type SleepDurationReferenceLabel,
  type SleepDurationReferenceResult,
} from "@/lib/data/sleep/sleepDurationReference";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepDurationDetailHistoryStatus = "idle" | "loading" | "ready" | "error";

export type SleepDurationDetailExplainerSection = {
  heading: string;
  body: string;
};

export type SleepDurationPatternRowId = "today" | "7d" | "30d";

/** Presentation-ready Your Pattern row — no classification in JSX. */
export type SleepDurationPatternRow = {
  id: SleepDurationPatternRowId;
  label: string;
  value: string;
  statusLabel: SleepDurationReferenceLabel | null;
  coverageLabel: string | null;
  emphasized: boolean;
  accessibilitySummary: string;
};

export type SleepDurationPatternComparison = {
  heading: "Your Pattern";
  today: SleepDurationPatternRow;
  sevenDay: SleepDurationPatternRow;
  thirtyDay: SleepDurationPatternRow;
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
  pattern: SleepDurationPatternComparison | null;
  explainers: readonly SleepDurationDetailExplainerSection[];
  dataAccuracyBody: string;
  dataAccuracyContextLine: string | null;
  /** Consumer sheets omit implementation source lines (always null in v1). */
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

function sleepNightContextLine(input: {
  selectedDay: DayKey;
  anchorDay: string | null;
}): string | null {
  if (input.anchorDay == null || input.anchorDay === "") return null;
  if (input.selectedDay === input.anchorDay) return `Sleep night: ${input.anchorDay}`;
  return `Sleep night: ${input.anchorDay} · Calendar day: ${input.selectedDay}`;
}

function classifyLabel(
  durationMinutes: number | null,
  ageYears: number | null,
): SleepDurationReferenceLabel | null {
  if (durationMinutes == null || ageYears == null) return null;
  return (
    classifySleepDurationReference({
      durationMinutes,
      ageYears,
    })?.label ?? null
  );
}

export function buildSleepDurationPatternComparison(input: {
  currentFormatted: string;
  currentValueMinutes: number | null;
  currentPresence: "present" | "absent";
  ageYears: number | null;
  sevenDay: SleepDurationAverageSummary;
  thirtyDay: SleepDurationAverageSummary;
}): SleepDurationPatternComparison {
  const { ageYears, sevenDay, thirtyDay } = input;

  const todayStatus =
    input.currentPresence === "present"
      ? classifyLabel(input.currentValueMinutes, ageYears)
      : null;

  const sevenStatus =
    sevenDay.hasEnoughData && sevenDay.averageMinutes != null
      ? classifyLabel(sevenDay.averageMinutes, ageYears)
      : null;

  const thirtyStatus =
    thirtyDay.hasEnoughData && thirtyDay.averageMinutes != null
      ? classifyLabel(thirtyDay.averageMinutes, ageYears)
      : null;

  const todayValue =
    input.currentPresence === "present" ? input.currentFormatted : "Not available";

  const todayA11yParts = [
    `Today ${todayValue}`,
    todayStatus,
  ].filter(Boolean);

  const sevenA11yParts = [
    `7-day average ${sevenDay.displayValue}`,
    sevenDay.coverageLabel,
    sevenStatus,
  ].filter(Boolean);

  const thirtyA11yParts = [
    `30-day average ${thirtyDay.displayValue}`,
    thirtyDay.coverageLabel,
    thirtyStatus,
  ].filter(Boolean);

  return {
    heading: "Your Pattern",
    today: {
      id: "today",
      label: "Today",
      value: todayValue,
      statusLabel: todayStatus,
      coverageLabel: null,
      emphasized: true,
      accessibilitySummary: todayA11yParts.join(". ") + ".",
    },
    sevenDay: {
      id: "7d",
      label: "7-day average",
      value: sevenDay.displayValue,
      statusLabel: sevenStatus,
      coverageLabel: sevenDay.coverageLabel,
      emphasized: false,
      accessibilitySummary: sevenA11yParts.join(". ") + ".",
    },
    thirtyDay: {
      id: "30d",
      label: "30-day average",
      value: thirtyDay.displayValue,
      statusLabel: thirtyStatus,
      coverageLabel: thirtyDay.coverageLabel,
      emphasized: false,
      accessibilitySummary: thirtyA11yParts.join(". ") + ".",
    },
  };
}

function emptyAverage(window: "7d" | "30d"): SleepDurationAverageSummary {
  const expectedNightCount = window === "7d" ? 7 : 30;
  return {
    window,
    averageMinutes: null,
    formattedAverage: null,
    validNightCount: 0,
    expectedNightCount,
    hasEnoughData: false,
    coverageLabel: `0 of ${expectedNightCount} nights`,
    displayValue: "Not enough data",
    accessibilitySummary: `${window === "7d" ? "7 days" : "30 days"} average not enough data.`,
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

  const pattern =
    sevenDay != null && thirtyDay != null
      ? buildSleepDurationPatternComparison({
          currentFormatted,
          currentValueMinutes,
          currentPresence,
          ageYears,
          sevenDay,
          thirtyDay,
        })
      : historyReady
        ? buildSleepDurationPatternComparison({
            currentFormatted,
            currentValueMinutes,
            currentPresence,
            ageYears,
            sevenDay: emptyAverage("7d"),
            thirtyDay: emptyAverage("30d"),
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

  const contextLine = sleepNightContextLine({
    selectedDay,
    anchorDay: sleepNight?.anchorDay ?? null,
  });
  const updated =
    sleepNight?.updatedAt != null && sleepNight.updatedAt.length > 0
      ? `Updated ${sleepNight.updatedAt}`
      : null;
  const dataAccuracyContextLine = [contextLine, updated].filter(Boolean).join(" · ") || null;

  const rangeA11y = sleepDurationReferenceAccessibilitySummary({
    formattedDuration: currentFormatted,
    result: rangeResult,
  });
  const patternA11y = pattern
    ? [
        pattern.today.accessibilitySummary,
        pattern.sevenDay.accessibilitySummary,
        pattern.thirtyDay.accessibilitySummary,
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
    pattern,
    explainers,
    dataAccuracyBody: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.dataAccuracyBase.body,
    dataAccuracyContextLine,
    sourceLine: null,
    historyStatus,
    historyErrorMessage,
    canRetryHistory: historyStatus === "error",
    isHistoryLoading: historyStatus === "loading",
    accessibilitySummary: `${rangeA11y} ${patternA11y}`.trim(),
  };
}
