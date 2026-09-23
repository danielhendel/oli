/**
 * Pure presentation model for Body metric detail trend surfaces.
 *
 * Data authority note (Stage 3C): callers currently feed points from
 * {@link useBodyMetricTrends}, which reads bounded RawEvent history. That path
 * remains the existing governed client series for this UX pass — do not add a
 * second trend truth. Facts-first migration stays an open architecture item
 * (not Stage 3D in this change).
 *
 * Range truth: {@link buildWeightRangePresentation} builds one selected-period
 * series that drives chart points, Change (complete-duration only), Average,
 * High, Low, and observed coverage. Hook `stats` are ignored so graph and
 * summary cannot diverge.
 */
import { buildWeightRangePresentation } from "@/lib/body/presentation/buildWeightRangePresentation";
import type { ObservedDateExtent } from "@/lib/body/presentation/buildObservedDateExtent";
import type { WeightRangeCoverage } from "@/lib/body/presentation/resolveWeightRangeCoverage";
import type { WeightPoint } from "@/lib/data/useWeightSeries";
import type { WeightRangeKey } from "@/lib/data/body/bodyHistoryRange";
import type { BodyMetricStats } from "@/lib/data/body/useBodyMetricTrends";

export type BodyMetricTrendDetailStatus =
  | "partial"
  | "error"
  | "missing"
  | "insufficient"
  | "ready";

export type BodyMetricTrendDetailLatest = {
  readonly valueKg: number;
  readonly observedAt: string;
  readonly dayKey: string;
};

export type BodyMetricTrendDetailModel = {
  readonly range: WeightRangeKey;
  readonly points: readonly WeightPoint[];
  readonly latest: BodyMetricTrendDetailLatest | null;
  readonly change: number | null;
  readonly average: number | null;
  readonly high: number | null;
  readonly low: number | null;
  readonly status: BodyMetricTrendDetailStatus;
  readonly errorMessage: string | null;
  /**
   * Same-day policy: preserve every observation ordered by `observedAt`.
   * Do not average same-day weights — chart X uses observation timestamps.
   */
  readonly sameDayPolicy: "all_observations_by_observedAt";
  readonly coverage: WeightRangeCoverage | null;
  readonly observedExtent: ObservedDateExtent | null;
  /** True when Change is withheld because selected duration is incomplete. */
  readonly changeUnavailableDueToPartialCoverage: boolean;
};

export type BuildBodyMetricTrendDetailModelInput = {
  readonly range: WeightRangeKey;
  readonly points: readonly WeightPoint[];
  /** Ignored for metric math — kept for call-site compatibility. */
  readonly stats: BodyMetricStats;
  readonly trendsStatus: "partial" | "ready" | "error";
  readonly errorMessage?: string | null;
  /** Optional override for tests; defaults to today-anchored presentation. */
  readonly anchorDayKey?: string;
};

function emptyModel(
  range: WeightRangeKey,
  status: BodyMetricTrendDetailStatus,
  errorMessage: string | null,
): BodyMetricTrendDetailModel {
  return {
    range,
    points: [],
    latest: null,
    change: null,
    average: null,
    high: null,
    low: null,
    status,
    errorMessage,
    sameDayPolicy: "all_observations_by_observedAt",
    coverage: null,
    observedExtent: null,
    changeUnavailableDueToPartialCoverage: false,
  };
}

/**
 * Build a single typed trend detail model for Weight (and sibling metric detail screens).
 * Stats are derived from the same selected-period series as the chart — no JSX math.
 */
export function buildBodyMetricTrendDetailModel(
  input: BuildBodyMetricTrendDetailModelInput,
): BodyMetricTrendDetailModel {
  if (input.trendsStatus === "partial") {
    return emptyModel(input.range, "partial", null);
  }

  if (input.trendsStatus === "error") {
    return emptyModel(
      input.range,
      "error",
      input.errorMessage ?? "Couldn’t update history. Try again.",
    );
  }

  const presentation = buildWeightRangePresentation({
    selectedRange: input.range,
    points: input.points,
    ...(input.anchorDayKey != null ? { anchorDayKey: input.anchorDayKey } : {}),
  });
  void input.stats;

  const sorted = presentation.plottedPoints;

  if (sorted.length === 0) {
    return emptyModel(input.range, "missing", null);
  }

  const last = sorted[sorted.length - 1]!;
  const latest: BodyMetricTrendDetailLatest = {
    valueKg: last.weightKg,
    observedAt: last.observedAt,
    dayKey: last.dayKey,
  };

  const status: BodyMetricTrendDetailStatus =
    sorted.length < 2 ? "insufficient" : "ready";

  const changeUnavailableDueToPartialCoverage =
    presentation.coverage.status === "partial" && sorted.length >= 2;

  return {
    range: input.range,
    points: sorted,
    latest,
    change: presentation.changeKg,
    average: presentation.averageKg,
    high: presentation.highKg,
    low: presentation.lowKg,
    status,
    errorMessage: null,
    sameDayPolicy: "all_observations_by_observedAt",
    coverage: presentation.coverage,
    observedExtent: presentation.observedExtent,
    changeUnavailableDueToPartialCoverage,
  };
}

/**
 * VoiceOver summary for the trend region — one string, not every path element.
 * Avoids judgment language (improved/worsened/healthy).
 */
export function buildBodyMetricTrendAccessibilitySummary(args: {
  metricTitle: string;
  rangeLabel: string;
  latestLabel: string | null;
  changeLabel: string | null;
  averageLabel: string | null;
  highLabel: string | null;
  lowLabel: string | null;
  status: BodyMetricTrendDetailStatus;
  changeUnavailableDueToPartialCoverage?: boolean;
  observedCoverageLabel?: string | null;
}): string {
  if (args.status === "missing") {
    return `${args.metricTitle}. No history yet for ${args.rangeLabel}.`;
  }
  if (args.status === "partial") {
    return `${args.metricTitle} trend is updating.`;
  }
  if (args.status === "error") {
    return `${args.metricTitle} history unavailable.`;
  }
  const parts = [`${args.metricTitle} trend for ${args.rangeLabel}.`];
  if (args.latestLabel) parts.push(`Latest ${args.latestLabel}.`);
  if (args.status === "insufficient") {
    parts.push("More measurements are needed to show a trend.");
  } else if (args.changeUnavailableDueToPartialCoverage) {
    parts.push(
      `Change for ${args.rangeLabel} unavailable because a full period of ${args.metricTitle} history is not available.`,
    );
  } else if (args.changeLabel) {
    parts.push(`Change ${args.changeLabel}.`);
  }
  if (args.observedCoverageLabel) {
    parts.push(`${args.metricTitle} data shown from ${args.observedCoverageLabel}.`);
  }
  if (args.averageLabel) parts.push(`Average ${args.averageLabel}.`);
  if (args.highLabel) parts.push(`High ${args.highLabel}.`);
  if (args.lowLabel) parts.push(`Low ${args.lowLabel}.`);
  return parts.join(" ");
}
