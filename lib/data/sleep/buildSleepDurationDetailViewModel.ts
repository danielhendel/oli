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
  sleepDurationReferenceAccessibilitySummary,
  type SleepDurationReferenceResult,
} from "@/lib/data/sleep/sleepDurationReference";
import { formatSleepDurationMinutes } from "@/lib/format/ouraScore";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepDurationDetailHistoryStatus = "idle" | "loading" | "ready" | "error";

export type SleepDurationDetailExplainerSection = {
  heading: string;
  body: string;
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
  explainers: readonly SleepDurationDetailExplainerSection[];
  dataAccuracyBody: string;
  dataAccuracyContextLine: string | null;
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

function buildDataAccuracyBody(input: {
  rangeWithheldReason: SleepDurationDetailViewModel["rangeWithheldReason"];
}): string {
  const base = SLEEP_DURATION_DETAIL_EXPLAINER_COPY.dataAccuracyBase.body;
  if (input.rangeWithheldReason === "unknown_age") {
    return `${base} ${SLEEP_DURATION_DETAIL_EXPLAINER_COPY.unknownAgeNote}`;
  }
  if (input.rangeWithheldReason === "minor") {
    return `${base} ${SLEEP_DURATION_DETAIL_EXPLAINER_COPY.minorAgeNote}`;
  }
  return base;
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

  const explainers: SleepDurationDetailExplainerSection[] = [
    {
      heading: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.whatItMeasures.heading,
      body: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.whatItMeasures.body,
    },
    {
      heading: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.howToUnderstand.heading,
      body: SLEEP_DURATION_DETAIL_EXPLAINER_COPY.howToUnderstand.body,
    },
  ];

  const sourceLine =
    sleepNight != null
      ? "Canonical SleepNight duration (main sleep when present)."
      : null;
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
  const avgA11y = averages
    ? `${averages.sevenDay.accessibilitySummary} ${averages.thirtyDay.accessibilitySummary}`
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
    sevenDay: averages?.sevenDay ?? null,
    thirtyDay: averages?.thirtyDay ?? null,
    explainers,
    dataAccuracyBody: buildDataAccuracyBody({ rangeWithheldReason }),
    dataAccuracyContextLine,
    sourceLine,
    historyStatus,
    historyErrorMessage,
    canRetryHistory: historyStatus === "error",
    isHistoryLoading: historyStatus === "loading",
    accessibilitySummary: `${rangeA11y} ${avgA11y}`.trim(),
  };
}
