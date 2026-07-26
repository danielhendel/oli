/**
 * Pure Resting Heart Rate detail view model (Phase 2F-B).
 *
 * Composes attributed SleepNight.lowestHeartRateBpm + personal IQR usual range +
 * bounded 7/30/90 history averages into presentation-ready fields.
 *
 * No React/RN, no I/O, no population bpm target, no Optimal ladder, no YTD, no chart.
 * Never treats readiness contributor scores as bpm.
 */

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import type { WeeklyFitnessSleepNightCell } from "@/lib/data/dash/weeklyFitnessCompletedSleepNights";
import {
  buildRestingHeartRateAverageSummaries,
  collectRestingHeartRatePersonalRangeSamples,
  RESTING_HEART_RATE_AVERAGE_30D_EXPECTED,
  RESTING_HEART_RATE_AVERAGE_7D_EXPECTED,
  RESTING_HEART_RATE_AVERAGE_90D_EXPECTED,
  type RestingHeartRateAverageSummary,
} from "@/lib/data/readiness/restingHeartRateAverages";
import { RESTING_HEART_RATE_DETAIL_EXPLAINER_COPY } from "@/lib/data/readiness/restingHeartRateExplainerCopy";
import {
  buildRestingHeartRatePersonalRangeBounds,
  classifyRestingHeartRateAgainstUsualRange,
  restingHeartRatePatternStatusLabel,
  restingHeartRatePersonalRangeAccessibilitySummary,
  restingHeartRatePersonalRangeMarkerPosition01,
  restingHeartRatePersonalRangeZoneCopy,
  restingHeartRatePersonalRangeZoneFractions,
  type RestingHeartRatePatternStatusLabel,
  type RestingHeartRatePersonalRangeBounds,
  type RestingHeartRatePersonalRangeResult,
  type RestingHeartRatePersonalRangeStatus,
} from "@/lib/data/readiness/restingHeartRatePersonalRange";
import {
  resolveRestingHeartRateBpm,
  type RestingHeartRateBpm,
} from "@/lib/data/readiness/restingHeartRateValue";
import type { DayKey } from "@/lib/ui/calendar/types";

export type RestingHeartRateDetailHistoryStatus = "idle" | "loading" | "ready" | "error";

export type RestingHeartRateDetailExplainerSection = {
  heading: string;
  body: string;
};

export type RestingHeartRatePatternRowId = "7d" | "30d" | "90d";

export type RestingHeartRatePatternRow = {
  id: RestingHeartRatePatternRowId;
  label: string;
  value: string;
  statusLabel: RestingHeartRatePatternStatusLabel | null;
  accessibilitySummary: string;
};

export type RestingHeartRatePatternComparison = {
  heading: "Your Pattern";
  sevenDay: RestingHeartRatePatternRow;
  thirtyDay: RestingHeartRatePatternRow;
  ninetyDay: RestingHeartRatePatternRow;
};

/** Presentation-ready three-zone personal usual-range bar — no model IDs. */
export type RestingHeartRatePersonalRangePresentation = {
  status: RestingHeartRatePersonalRangeStatus;
  statusLabel: string;
  belowLabel: "Below Usual";
  usualLabel: "Your Usual";
  aboveLabel: "Above Usual";
  belowRangeText: string;
  usualRangeText: string;
  aboveRangeText: string;
  zoneFractions: { below: number; usual: number; above: number };
  currentMarkerPosition01: number;
  currentDisplayBpm: number;
  accessibilitySummary: string;
};

export type RestingHeartRateDetailViewModel = {
  metricId: "resting_heart_rate";
  selectedDay: DayKey;
  title: string;
  currentBpm: number | null;
  currentDisplayBpm: number | null;
  currentFormatted: string;
  currentPresence: "present" | "absent";
  /** True when current bpm is present but history has fewer than 30 valid nights. */
  isBuildingBaseline: boolean;
  personalRangeResult: RestingHeartRatePersonalRangeResult | null;
  personalRangeBounds: RestingHeartRatePersonalRangeBounds | null;
  statusSentence: string | null;
  personalRange: RestingHeartRatePersonalRangePresentation | null;
  sevenDay: RestingHeartRateAverageSummary | null;
  thirtyDay: RestingHeartRateAverageSummary | null;
  ninetyDay: RestingHeartRateAverageSummary | null;
  pattern: RestingHeartRatePatternComparison | null;
  explainers: readonly RestingHeartRateDetailExplainerSection[];
  dataAccuracyBody: string;
  dataAccuracyContextLine: string | null;
  sourceLine: string | null;
  historyStatus: RestingHeartRateDetailHistoryStatus;
  historyErrorMessage: string | null;
  canRetryHistory: boolean;
  isHistoryLoading: boolean;
  accessibilitySummary: string;
};

function resolveCurrentRestingHeartRate(input: {
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
}): RestingHeartRateBpm | null {
  const { sleepNight, resolution = null } = input;
  if (sleepNight == null) return null;
  if (resolution === "latest_completed_prior_night") return null;
  if (sleepNight.isComplete !== true) return null;
  return resolveRestingHeartRateBpm(sleepNight.lowestHeartRateBpm);
}

function patternRowFromAverage(input: {
  id: RestingHeartRatePatternRowId;
  label: string;
  summary: RestingHeartRateAverageSummary;
  bounds: RestingHeartRatePersonalRangeBounds | null;
}): RestingHeartRatePatternRow {
  let statusLabel: RestingHeartRatePatternStatusLabel | null = null;
  if (input.bounds != null && input.summary.hasEnoughData && input.summary.averageBpm != null) {
    const classified = classifyRestingHeartRateAgainstUsualRange({
      bpm: input.summary.averageBpm,
      bounds: input.bounds,
    });
    statusLabel = classified != null ? restingHeartRatePatternStatusLabel(classified.status) : null;
  }

  let accessibilitySummary: string;
  if (input.summary.displayValue === "Not enough data" || !input.summary.hasEnoughData) {
    accessibilitySummary = `Your ${input.label} is not enough data.`;
  } else if (statusLabel != null && input.summary.averageBpm != null) {
    const statusSpoken =
      statusLabel === "In usual range"
        ? "is in your usual range"
        : statusLabel === "Below usual range"
          ? "is below your usual range"
          : "is above your usual range";
    accessibilitySummary = `Your ${input.label} is ${Math.round(
      input.summary.averageBpm,
    )} beats per minute and ${statusSpoken}.`;
  } else if (input.summary.averageBpm != null) {
    accessibilitySummary = `Your ${input.label} is ${Math.round(
      input.summary.averageBpm,
    )} beats per minute.`;
  } else {
    accessibilitySummary = `Your ${input.label} is not enough data.`;
  }

  return {
    id: input.id,
    label: input.label,
    value: input.summary.displayValue,
    statusLabel,
    accessibilitySummary,
  };
}

export function buildRestingHeartRatePatternComparison(input: {
  sevenDay: RestingHeartRateAverageSummary;
  thirtyDay: RestingHeartRateAverageSummary;
  ninetyDay: RestingHeartRateAverageSummary;
  bounds: RestingHeartRatePersonalRangeBounds | null;
}): RestingHeartRatePatternComparison {
  return {
    heading: "Your Pattern",
    sevenDay: patternRowFromAverage({
      id: "7d",
      label: "7-day average",
      summary: input.sevenDay,
      bounds: input.bounds,
    }),
    thirtyDay: patternRowFromAverage({
      id: "30d",
      label: "30-day average",
      summary: input.thirtyDay,
      bounds: input.bounds,
    }),
    ninetyDay: patternRowFromAverage({
      id: "90d",
      label: "90-day average",
      summary: input.ninetyDay,
      bounds: input.bounds,
    }),
  };
}

function emptyAverage(window: "7d" | "30d" | "90d"): RestingHeartRateAverageSummary {
  const expectedNightCount =
    window === "7d"
      ? RESTING_HEART_RATE_AVERAGE_7D_EXPECTED
      : window === "30d"
        ? RESTING_HEART_RATE_AVERAGE_30D_EXPECTED
        : RESTING_HEART_RATE_AVERAGE_90D_EXPECTED;
  const minimumRequiredNightCount = window === "7d" ? 3 : window === "30d" ? 10 : 30;
  const title = window === "7d" ? "7 days" : window === "30d" ? "30 days" : "90 days";
  return {
    window,
    averageBpm: null,
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

function buildPersonalRangePresentation(input: {
  result: RestingHeartRatePersonalRangeResult;
  bounds: RestingHeartRatePersonalRangeBounds;
  currentDisplayBpm: number;
  currentBpm: number;
}): RestingHeartRatePersonalRangePresentation {
  const copy = restingHeartRatePersonalRangeZoneCopy(input.bounds);
  return {
    status: input.result.status,
    statusLabel: input.result.label,
    belowLabel: copy.belowLabel,
    usualLabel: copy.usualLabel,
    aboveLabel: copy.aboveLabel,
    belowRangeText: copy.belowRangeText,
    usualRangeText: copy.usualRangeText,
    aboveRangeText: copy.aboveRangeText,
    zoneFractions: restingHeartRatePersonalRangeZoneFractions(input.bounds),
    currentMarkerPosition01: restingHeartRatePersonalRangeMarkerPosition01({
      bpm: input.currentBpm,
      bounds: input.bounds,
    }),
    currentDisplayBpm: input.currentDisplayBpm,
    accessibilitySummary: restingHeartRatePersonalRangeAccessibilitySummary({
      displayBpm: input.currentDisplayBpm,
      result: input.result,
    }),
  };
}

export function buildRestingHeartRateDetailViewModel(input: {
  selectedDay: DayKey;
  todayDayKey: DayKey;
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution?: SleepNightResolution | null | undefined;
  /** Optional preformatted value from the card row (must be physiological bpm). */
  currentFormattedOverride?: string | null | undefined;
  sleepNightByDay: Readonly<Partial<Record<DayKey, WeeklyFitnessSleepNightCell>>>;
  historyStatus: RestingHeartRateDetailHistoryStatus;
  historyErrorMessage?: string | null;
}): RestingHeartRateDetailViewModel {
  const {
    selectedDay,
    todayDayKey,
    sleepNight,
    resolution = null,
    sleepNightByDay,
    historyStatus,
    historyErrorMessage = null,
  } = input;

  const current = resolveCurrentRestingHeartRate({ sleepNight, resolution });
  const currentPresence = current != null ? "present" : "absent";
  const currentFormatted =
    currentPresence === "present" && current != null
      ? input.currentFormattedOverride &&
        input.currentFormattedOverride !== "—" &&
        /\d+\s*bpm/i.test(input.currentFormattedOverride)
        ? input.currentFormattedOverride
        : current.formatted
      : "Not available";

  const historyReady = historyStatus === "ready";
  const averages = historyReady
    ? buildRestingHeartRateAverageSummaries({
        selectedDay,
        todayDayKey,
        sleepNightByDay,
      })
    : null;

  const sevenDay = averages?.sevenDay ?? null;
  const thirtyDay = averages?.thirtyDay ?? null;
  const ninetyDay = averages?.ninetyDay ?? null;

  const rangeSamples = historyReady
    ? collectRestingHeartRatePersonalRangeSamples({
        selectedDay,
        todayDayKey,
        sleepNightByDay,
      })
    : [];
  const personalRangeBounds = historyReady
    ? buildRestingHeartRatePersonalRangeBounds(rangeSamples.map((s) => s.bpm))
    : null;

  const isBuildingBaseline =
    currentPresence === "present" &&
    historyReady &&
    personalRangeBounds == null;

  const personalRangeResult =
    current != null && personalRangeBounds != null
      ? classifyRestingHeartRateAgainstUsualRange({
          bpm: current.bpm,
          bounds: personalRangeBounds,
        })
      : null;

  const statusSentence =
    personalRangeResult?.label ??
    (isBuildingBaseline ? "Building your usual range" : null);

  const personalRange =
    personalRangeResult != null && personalRangeBounds != null && current != null
      ? buildPersonalRangePresentation({
          result: personalRangeResult,
          bounds: personalRangeBounds,
          currentDisplayBpm: current.displayBpm,
          currentBpm: current.bpm,
        })
      : null;

  const pattern =
    sevenDay != null && thirtyDay != null && ninetyDay != null
      ? buildRestingHeartRatePatternComparison({
          sevenDay,
          thirtyDay,
          ninetyDay,
          bounds: personalRangeBounds,
        })
      : historyReady
        ? buildRestingHeartRatePatternComparison({
            sevenDay: emptyAverage("7d"),
            thirtyDay: emptyAverage("30d"),
            ninetyDay: emptyAverage("90d"),
            bounds: personalRangeBounds,
          })
        : null;

  const copy = RESTING_HEART_RATE_DETAIL_EXPLAINER_COPY;
  const explainers: RestingHeartRateDetailExplainerSection[] = [
    { heading: copy.whatItMeasures.heading, body: copy.whatItMeasures.body },
    { heading: copy.howToUnderstand.heading, body: copy.howToUnderstand.body },
    { heading: copy.whatCanHelp.heading, body: copy.whatCanHelp.body },
  ];

  const heroA11yParts = [
    "Resting Heart Rate.",
    currentPresence === "present" && current != null
      ? `${current.displayBpm} beats per minute.`
      : "Not available.",
  ];
  if (isBuildingBaseline) {
    heroA11yParts.push("Oli is still building your usual range.");
  } else if (personalRangeResult != null) {
    const spoken =
      personalRangeResult.status === "below_usual"
        ? "This is below your usual range."
        : personalRangeResult.status === "above_usual"
          ? "This is above your usual range."
          : "This is in your usual range.";
    heroA11yParts.push(spoken);
    const lower = Math.round(personalRangeResult.lowerBoundBpm);
    const upper = Math.round(personalRangeResult.upperBoundBpm);
    heroA11yParts.push(`Your usual range is ${lower} to ${upper} beats per minute.`);
  }

  const patternA11y = pattern
    ? [
        pattern.sevenDay.accessibilitySummary,
        pattern.thirtyDay.accessibilitySummary,
        pattern.ninetyDay.accessibilitySummary,
      ].join(" ")
    : historyStatus === "loading"
      ? "Loading recent heart-rate averages."
      : historyStatus === "error"
        ? "Could not load recent heart-rate averages."
        : "";

  return {
    metricId: "resting_heart_rate",
    selectedDay,
    title: "Resting Heart Rate",
    currentBpm: current?.bpm ?? null,
    currentDisplayBpm: current?.displayBpm ?? null,
    currentFormatted,
    currentPresence,
    isBuildingBaseline,
    personalRangeResult,
    personalRangeBounds,
    statusSentence,
    personalRange,
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
    accessibilitySummary: `${heroA11yParts.join(" ")} ${patternA11y}`.trim(),
  };
}
