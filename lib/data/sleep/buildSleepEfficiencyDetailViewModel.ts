/**
 * Pure Sleep Efficiency detail view model (Phase 2E-D).
 *
 * Composes vendor-provided SleepNight.efficiency + educational 85% guideline +
 * bounded 7/30/90 history averages into presentation-ready fields.
 *
 * No React/RN, no I/O, no client time-in-bed math, no Optimal ladder, no YTD, no chart.
 */

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  buildSleepEfficiencyAverageSummaries,
  SLEEP_EFFICIENCY_AVERAGE_30D_EXPECTED,
  SLEEP_EFFICIENCY_AVERAGE_7D_EXPECTED,
  SLEEP_EFFICIENCY_AVERAGE_90D_EXPECTED,
  type SleepEfficiencyAverageSummary,
} from "@/lib/data/sleep/sleepEfficiencyAverages";
import { SLEEP_EFFICIENCY_DETAIL_EXPLAINER_COPY } from "@/lib/data/sleep/sleepEfficiencyExplainerCopy";
import {
  classifySleepEfficiencyGuideline,
  classifySleepEfficiencyPatternStatus,
  SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT,
  sleepEfficiencyGuidelineAccessibilitySummary,
  sleepEfficiencyGuidelineMarkerPosition01,
  sleepEfficiencyGuidelineZoneFractions,
  type SleepEfficiencyGuidelineResult,
  type SleepEfficiencyGuidelineStatus,
  type SleepEfficiencyPatternStatusLabel,
} from "@/lib/data/sleep/sleepEfficiencyGuideline";
import {
  resolveSleepEfficiencyPercent,
  type SleepEfficiencyPercent,
} from "@/lib/data/sleep/sleepEfficiencyValue";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepEfficiencyDetailHistoryStatus = "idle" | "loading" | "ready" | "error";

export type SleepEfficiencyDetailExplainerSection = {
  heading: string;
  body: string;
};

export type SleepEfficiencyPatternRowId = "7d" | "30d" | "90d";

/** Presentation-ready Your Pattern row. */
export type SleepEfficiencyPatternRow = {
  id: SleepEfficiencyPatternRowId;
  label: string;
  value: string;
  statusLabel: SleepEfficiencyPatternStatusLabel | null;
  accessibilitySummary: string;
};

export type SleepEfficiencyPatternComparison = {
  heading: "Your Pattern";
  sevenDay: SleepEfficiencyPatternRow;
  thirtyDay: SleepEfficiencyPatternRow;
  ninetyDay: SleepEfficiencyPatternRow;
};

/** Presentation-ready two-zone guideline bar — no model/evidence IDs. */
export type SleepEfficiencyGuidelinePresentation = {
  status: SleepEfficiencyGuidelineStatus;
  statusLabel: string;
  belowLabel: "Below Guideline";
  meetsLabel: "Meets Guideline";
  belowRangeText: string;
  meetsRangeText: string;
  zoneFractions: { below: number; meets: number };
  currentMarkerPosition01: number;
  currentPercentDisplay: number;
  accessibilitySummary: string;
};

export type SleepEfficiencyDetailViewModel = {
  metricId: "sleep_efficiency";
  selectedDay: DayKey;
  title: string;
  currentNormalizedPercent: number | null;
  currentDisplayPercent: number | null;
  currentFormatted: string;
  currentPresence: "present" | "absent";
  guidelineResult: SleepEfficiencyGuidelineResult | null;
  statusSentence: string | null;
  guideline: SleepEfficiencyGuidelinePresentation | null;
  sevenDay: SleepEfficiencyAverageSummary | null;
  thirtyDay: SleepEfficiencyAverageSummary | null;
  ninetyDay: SleepEfficiencyAverageSummary | null;
  pattern: SleepEfficiencyPatternComparison | null;
  explainers: readonly SleepEfficiencyDetailExplainerSection[];
  dataAccuracyBody: string;
  /** Always null in consumer v1 — technical provenance stays off the sheet. */
  dataAccuracyContextLine: string | null;
  /** Always null in consumer v1. */
  sourceLine: string | null;
  historyStatus: SleepEfficiencyDetailHistoryStatus;
  historyErrorMessage: string | null;
  canRetryHistory: boolean;
  isHistoryLoading: boolean;
  accessibilitySummary: string;
};

function resolveCurrentEfficiency(input: {
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
}): SleepEfficiencyPercent | null {
  const { sleepNight, resolution = null } = input;
  if (sleepNight == null) return null;
  if (resolution === "latest_completed_prior_night") return null;
  if (sleepNight.isComplete !== true) return null;
  return resolveSleepEfficiencyPercent(sleepNight.efficiency);
}

function patternRowFromAverage(input: {
  id: SleepEfficiencyPatternRowId;
  label: string;
  summary: SleepEfficiencyAverageSummary;
}): SleepEfficiencyPatternRow {
  const statusLabel = classifySleepEfficiencyPatternStatus({
    averagePercent: input.summary.averagePercent,
    hasEnoughData: input.summary.hasEnoughData,
  });
  const accessibilitySummary =
    statusLabel != null && input.summary.displayValue !== "Not enough data"
      ? `Your ${input.label} is ${input.summary.displayValue.replace("%", " percent")} and ${
          statusLabel === "Meets guideline" ? "meets the guideline" : "is below the guideline"
        }.`
      : `Your ${input.label} is not enough data.`;
  return {
    id: input.id,
    label: input.label,
    value: input.summary.displayValue,
    statusLabel,
    accessibilitySummary,
  };
}

export function buildSleepEfficiencyPatternComparison(input: {
  sevenDay: SleepEfficiencyAverageSummary;
  thirtyDay: SleepEfficiencyAverageSummary;
  ninetyDay: SleepEfficiencyAverageSummary;
}): SleepEfficiencyPatternComparison {
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

function emptyAverage(window: "7d" | "30d" | "90d"): SleepEfficiencyAverageSummary {
  const expectedNightCount =
    window === "7d"
      ? SLEEP_EFFICIENCY_AVERAGE_7D_EXPECTED
      : window === "30d"
        ? SLEEP_EFFICIENCY_AVERAGE_30D_EXPECTED
        : SLEEP_EFFICIENCY_AVERAGE_90D_EXPECTED;
  const minimumRequiredNightCount = window === "7d" ? 3 : window === "30d" ? 10 : 30;
  const title = window === "7d" ? "7 days" : window === "30d" ? "30 days" : "90 days";
  return {
    window,
    averagePercent: null,
    formattedAverage: null,
    validNightCount: 0,
    expectedNightCount,
    minimumRequiredNightCount,
    hasEnoughData: false,
    coverageLabel: `0 of ${expectedNightCount} nights`,
    displayValue: "Not enough data",
    accessibilitySummary: `${title} average not enough data.`,
  };
}

function buildGuidelinePresentation(input: {
  result: SleepEfficiencyGuidelineResult;
  currentPercentDisplay: number;
}): SleepEfficiencyGuidelinePresentation {
  const { result } = input;
  const currentMarkerPosition01 = sleepEfficiencyGuidelineMarkerPosition01(
    result.normalizedPercent,
  );
  return {
    status: result.status,
    statusLabel: result.label,
    belowLabel: "Below Guideline",
    meetsLabel: "Meets Guideline",
    belowRangeText: `<${SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT}%`,
    meetsRangeText: `≥${SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT}%`,
    zoneFractions: sleepEfficiencyGuidelineZoneFractions(),
    currentMarkerPosition01,
    currentPercentDisplay: input.currentPercentDisplay,
    accessibilitySummary: sleepEfficiencyGuidelineAccessibilitySummary({
      label: result.label,
      currentPercentDisplay: input.currentPercentDisplay,
    }),
  };
}

export function buildSleepEfficiencyDetailViewModel(input: {
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  /** Optional preformatted value from the card row (must match SleepNight efficiency). */
  currentFormattedOverride?: string | null | undefined;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
  historyStatus: SleepEfficiencyDetailHistoryStatus;
  historyErrorMessage?: string | null;
}): SleepEfficiencyDetailViewModel {
  const {
    selectedDay,
    todayDayKey,
    sleepNight,
    resolution = null,
    sleepNightByDay,
    historyStatus,
    historyErrorMessage = null,
  } = input;

  const current = resolveCurrentEfficiency({ sleepNight, resolution });
  const currentPresence = current != null ? "present" : "absent";
  const currentFormatted =
    currentPresence === "present" && current != null
      ? input.currentFormattedOverride && input.currentFormattedOverride !== "—"
        ? input.currentFormattedOverride
        : current.formatted
      : "Not available";

  const guidelineResult =
    current != null ? classifySleepEfficiencyGuideline(current.normalizedPercent) : null;
  const statusSentence = guidelineResult?.label ?? null;

  const historyReady = historyStatus === "ready";
  const averages = historyReady
    ? buildSleepEfficiencyAverageSummaries({
        selectedDay,
        todayDayKey,
        sleepNightByDay,
      })
    : null;

  const sevenDay = averages?.sevenDay ?? null;
  const thirtyDay = averages?.thirtyDay ?? null;
  const ninetyDay = averages?.ninetyDay ?? null;

  const guideline =
    guidelineResult != null && current != null
      ? buildGuidelinePresentation({
          result: guidelineResult,
          currentPercentDisplay: current.displayPercent,
        })
      : null;

  const pattern =
    sevenDay != null && thirtyDay != null && ninetyDay != null
      ? buildSleepEfficiencyPatternComparison({ sevenDay, thirtyDay, ninetyDay })
      : historyReady
        ? buildSleepEfficiencyPatternComparison({
            sevenDay: emptyAverage("7d"),
            thirtyDay: emptyAverage("30d"),
            ninetyDay: emptyAverage("90d"),
          })
        : null;

  const copy = SLEEP_EFFICIENCY_DETAIL_EXPLAINER_COPY;
  const explainers: SleepEfficiencyDetailExplainerSection[] = [
    { heading: copy.whatItMeasures.heading, body: copy.whatItMeasures.body },
    { heading: copy.howToUnderstand.heading, body: copy.howToUnderstand.body },
    { heading: copy.whatCanHelp.heading, body: copy.whatCanHelp.body },
  ];

  const heroA11yParts = [
    "Sleep Efficiency.",
    currentPresence === "present" && current != null
      ? `${current.displayPercent} percent.`
      : "Not available.",
  ];
  if (statusSentence != null) {
    heroA11yParts.push(`${statusSentence}.`);
  }
  const guidelineA11y = guideline?.accessibilitySummary ?? "";
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
    metricId: "sleep_efficiency",
    selectedDay,
    title: "Sleep Efficiency",
    currentNormalizedPercent: current?.normalizedPercent ?? null,
    currentDisplayPercent: current?.displayPercent ?? null,
    currentFormatted,
    currentPresence,
    guidelineResult,
    statusSentence,
    guideline,
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
    accessibilitySummary: `${heroA11yParts.join(" ")} ${guidelineA11y} ${patternA11y}`.trim(),
  };
}
