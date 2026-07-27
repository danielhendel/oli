/**
 * Pure readiness contributor detail view model (Phase 2F-C2).
 *
 * Composes exact-day provider contributor score + shared 7/30/90 history averages
 * into presentation-ready fields for MetricDetailShell.
 *
 * No React/RN, no I/O, no population HRV/temperature targets, no formula reconstruction,
 * no YTD, no chart, no °C/ms confusion, no classification or averaging in JSX.
 */

import { normalizeReadinessContributorScore } from "@/lib/data/readiness/readinessContributorScore";
import {
  buildReadinessContributorAverageSummaries,
  type ReadinessContributorAverageSummary,
} from "@/lib/data/readiness/readinessContributorAverages";
import { readinessContributorDetailConfigFor } from "@/lib/data/readiness/readinessContributorDetailConfig";
import { readinessContributorDetailCopyFor } from "@/lib/data/readiness/readinessContributorDetailCopy";
import type {
  ReadinessContributorDetailExplainerSection,
  ReadinessContributorDetailHistoryStatus,
  ReadinessContributorDetailMetric,
  ReadinessContributorDetailViewModel,
  ReadinessContributorPatternComparison,
  ReadinessContributorPatternRow,
  ReadinessContributorPatternRowId,
  ReadinessContributorScoreBarPresentation,
} from "@/lib/data/readiness/readinessContributorDetailTypes";
import type { ReadinessContributorDayCell } from "@/lib/data/readiness/readinessContributorHistoryTypes";
import {
  classifyReadinessContributorAverageScore,
  formatReadinessContributorScoreDisplay,
  READINESS_CONTRIBUTOR_SCORE_ZONE_FRACTIONS,
  readinessContributorScoreBarAccessibilitySummary,
  readinessContributorScoreMarkerPosition01,
} from "@/lib/data/readiness/readinessContributorScoreBar";
import {
  classifyOuraProviderScore,
  normalizeOuraScore0to100,
  type OuraRatingLabel,
} from "@/lib/format/ouraScore";
import type { DayKey } from "@/lib/ui/calendar/types";

function patternRowFromAverage(input: {
  id: ReadinessContributorPatternRowId;
  label: string;
  summary: ReadinessContributorAverageSummary;
}): ReadinessContributorPatternRow {
  const classification = classifyReadinessContributorAverageScore(input.summary.averageScore);
  const display =
    input.summary.hasEnoughData && input.summary.averageScore != null
      ? formatReadinessContributorScoreDisplay(input.summary.averageScore)
      : null;

  let value: string;
  let statusLabel: OuraRatingLabel | null = null;
  let accessibilitySummary: string;

  if (display == null || !input.summary.hasEnoughData) {
    value = "Not enough data";
    accessibilitySummary = `Your ${input.label} is not enough data.`;
  } else {
    value = display;
    statusLabel = classification;
    accessibilitySummary =
      statusLabel != null
        ? `Your ${input.label} is ${display} and is ${statusLabel}.`
        : `Your ${input.label} is ${display}.`;
  }

  return {
    id: input.id,
    label: input.label,
    value,
    statusLabel,
    accessibilitySummary,
  };
}

export function buildReadinessContributorPatternComparison(input: {
  sevenDay: ReadinessContributorAverageSummary;
  thirtyDay: ReadinessContributorAverageSummary;
  ninetyDay: ReadinessContributorAverageSummary;
}): ReadinessContributorPatternComparison {
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

function emptyAverage(
  contributorKey: ReadinessContributorAverageSummary["contributorKey"],
  window: "7d" | "30d" | "90d",
): ReadinessContributorAverageSummary {
  return {
    window,
    contributorKey,
    averageScore: null,
    validDayCount: 0,
    expectedDayCount: window === "7d" ? 7 : window === "30d" ? 30 : 90,
    minimumRequiredDayCount: window === "7d" ? 3 : window === "30d" ? 10 : 30,
    hasEnoughData: false,
    selectedDayScore: null,
  };
}

function buildScoreBarPresentation(input: {
  score: number;
  displayScore: number;
  classification: OuraRatingLabel;
}): ReadinessContributorScoreBarPresentation {
  return {
    supportingLabel: "Oura contributor score",
    payAttentionLabel: "Pay Attention",
    fairLabel: "Fair",
    goodLabel: "Good",
    optimalLabel: "Optimal",
    payAttentionRangeText: "0–59",
    fairRangeText: "60–69",
    goodRangeText: "70–84",
    optimalRangeText: "85–100",
    zoneFractions: { ...READINESS_CONTRIBUTOR_SCORE_ZONE_FRACTIONS },
    currentMarkerPosition01: readinessContributorScoreMarkerPosition01(input.score),
    currentDisplayScore: input.displayScore,
    currentClassification: input.classification,
    accessibilitySummary: readinessContributorScoreBarAccessibilitySummary({
      displayScore: input.displayScore,
      classification: input.classification,
    }),
  };
}

/**
 * Resolve the exact-day contributor score from the readiness view contributor map.
 * Does not accept overall readiness score, deviation, raw HRV, or wrong keys.
 */
export function resolveExactDayContributorScore(input: {
  metric: ReadinessContributorDetailMetric;
  contributors: Record<string, unknown> | null | undefined;
}): number | null {
  const config = readinessContributorDetailConfigFor(input.metric);
  const raw = input.contributors?.[config.contributorKey];
  return normalizeReadinessContributorScore(raw);
}

export function buildReadinessContributorDetailViewModel(input: {
  metric: ReadinessContributorDetailMetric;
  selectedDay: DayKey;
  todayDayKey: DayKey;
  /** Exact-day readiness view contributor score (validated). */
  currentScore: number | null | undefined;
  dayByDay: Readonly<Partial<Record<DayKey, ReadinessContributorDayCell>>>;
  historyStatus: ReadinessContributorDetailHistoryStatus;
  historyErrorMessage?: string | null;
}): ReadinessContributorDetailViewModel {
  const config = readinessContributorDetailConfigFor(input.metric);
  const copy = readinessContributorDetailCopyFor(input.metric);
  const currentScore = normalizeReadinessContributorScore(input.currentScore);
  const currentPresence = currentScore != null ? "present" : "absent";
  const currentDisplayScore =
    currentScore != null ? normalizeOuraScore0to100(currentScore) : null;
  // Classify the validated unrounded score with existing provider thresholds
  // (do not round before classification — matches 59.99 → Pay attention contract).
  const currentClassification =
    currentScore != null ? classifyOuraProviderScore(currentScore) : null;
  const currentFormatted =
    currentDisplayScore != null ? String(currentDisplayScore) : "Not available";

  const historyReady = input.historyStatus === "ready";
  const averages =
    historyReady && currentPresence === "present"
      ? buildReadinessContributorAverageSummaries({
          contributorKey: config.contributorKey,
          selectedDay: input.selectedDay,
          todayDayKey: input.todayDayKey,
          dayByDay: input.dayByDay,
        })
      : null;

  const pattern =
    averages != null
      ? buildReadinessContributorPatternComparison(averages)
      : historyReady && currentPresence === "present"
        ? buildReadinessContributorPatternComparison({
            sevenDay: emptyAverage(config.contributorKey, "7d"),
            thirtyDay: emptyAverage(config.contributorKey, "30d"),
            ninetyDay: emptyAverage(config.contributorKey, "90d"),
          })
        : null;

  const scoreBar =
    currentScore != null && currentDisplayScore != null && currentClassification != null
      ? buildScoreBarPresentation({
          score: currentScore,
          displayScore: currentDisplayScore,
          classification: currentClassification,
        })
      : null;

  const explainers: ReadinessContributorDetailExplainerSection[] = [
    { heading: copy.whatItMeasures.heading, body: copy.whatItMeasures.body },
    { heading: copy.howToUnderstand.heading, body: copy.howToUnderstand.body },
    { heading: copy.whatCanHelp.heading, body: copy.whatCanHelp.body },
  ];

  const heroA11yParts = [
    `${config.accessibilityMetricName}.`,
    currentPresence === "present" && currentDisplayScore != null
      ? `${currentDisplayScore} out of 100.`
      : "Not available.",
  ];
  if (currentClassification != null) {
    heroA11yParts.push(`${currentClassification}.`);
  }
  if (currentPresence === "present") {
    heroA11yParts.push("This is an Oura contributor score.");
  }

  const patternA11y = pattern
    ? [
        pattern.sevenDay.accessibilitySummary,
        pattern.thirtyDay.accessibilitySummary,
        pattern.ninetyDay.accessibilitySummary,
      ].join(" ")
    : input.historyStatus === "loading" && currentPresence === "present"
      ? "Loading recent contributor averages."
      : input.historyStatus === "error" && currentPresence === "present"
        ? "Could not load recent contributor averages."
        : "";

  return {
    metricId: config.metricId,
    contributorKey: config.contributorKey,
    selectedDay: input.selectedDay,
    title: config.title,
    currentScore,
    currentDisplayScore,
    currentFormatted,
    currentClassification,
    currentPresence,
    supportingLabel: config.supportingLabel,
    statusSentence: currentClassification,
    scoreBar,
    pattern,
    explainers,
    dataAccuracyBody: copy.dataAccuracy.body,
    historyStatus: input.historyStatus,
    historyErrorMessage: input.historyErrorMessage ?? null,
    canRetryHistory: input.historyStatus === "error" && currentPresence === "present",
    isHistoryLoading: input.historyStatus === "loading" && currentPresence === "present",
    accessibilitySummary: `${heroA11yParts.join(" ")} ${patternA11y}`.trim(),
  };
}
