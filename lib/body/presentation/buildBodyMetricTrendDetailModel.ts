/**
 * Pure presentation model for Body metric detail trend surfaces.
 *
 * Data authority note (Stage 3C): callers currently feed points from
 * {@link useBodyMetricTrends}, which reads bounded RawEvent history. That path
 * remains the existing governed client series for this UX pass — do not add a
 * second trend truth. Facts-first migration stays an open architecture item
 * (not Stage 3D in this change).
 */
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
};

export type BuildBodyMetricTrendDetailModelInput = {
  readonly range: WeightRangeKey;
  readonly points: readonly WeightPoint[];
  readonly stats: BodyMetricStats;
  readonly trendsStatus: "partial" | "ready" | "error";
  readonly errorMessage?: string | null;
};

function sortByObservedAt(points: readonly WeightPoint[]): WeightPoint[] {
  return [...points].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

/**
 * Build a single typed trend detail model for Weight (and sibling metric detail screens).
 * Stats must come from the same series — no JSX math.
 */
export function buildBodyMetricTrendDetailModel(
  input: BuildBodyMetricTrendDetailModelInput,
): BodyMetricTrendDetailModel {
  if (input.trendsStatus === "partial") {
    return {
      range: input.range,
      points: [],
      latest: null,
      change: null,
      average: null,
      high: null,
      low: null,
      status: "partial",
      errorMessage: null,
      sameDayPolicy: "all_observations_by_observedAt",
    };
  }

  if (input.trendsStatus === "error") {
    return {
      range: input.range,
      points: [],
      latest: null,
      change: null,
      average: null,
      high: null,
      low: null,
      status: "error",
      errorMessage: input.errorMessage ?? "Couldn’t update history. Try again.",
      sameDayPolicy: "all_observations_by_observedAt",
    };
  }

  const sorted = sortByObservedAt(
    input.points.filter((p) => Number.isFinite(p.weightKg) && p.weightKg > 0),
  );

  if (sorted.length === 0) {
    return {
      range: input.range,
      points: [],
      latest: null,
      change: null,
      average: null,
      high: null,
      low: null,
      status: "missing",
      errorMessage: null,
      sameDayPolicy: "all_observations_by_observedAt",
    };
  }

  const last = sorted[sorted.length - 1]!;
  const latest: BodyMetricTrendDetailLatest = {
    valueKg: last.weightKg,
    observedAt: last.observedAt,
    dayKey: last.dayKey,
  };

  const status: BodyMetricTrendDetailStatus =
    sorted.length < 2 ? "insufficient" : "ready";

  return {
    range: input.range,
    points: sorted,
    latest,
    change: input.stats.change,
    average: input.stats.avg,
    high: input.stats.high,
    low: input.stats.low,
    status,
    errorMessage: null,
    sameDayPolicy: "all_observations_by_observedAt",
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
  const parts = [
    `${args.metricTitle} trend for ${args.rangeLabel}.`,
  ];
  if (args.latestLabel) parts.push(`Latest ${args.latestLabel}.`);
  if (args.status === "insufficient") {
    parts.push("More measurements are needed to show a trend.");
  } else if (args.changeLabel) {
    parts.push(`Change ${args.changeLabel}.`);
  }
  if (args.averageLabel) parts.push(`Average ${args.averageLabel}.`);
  if (args.highLabel) parts.push(`High ${args.highLabel}.`);
  if (args.lowLabel) parts.push(`Low ${args.lowLabel}.`);
  return parts.join(" ");
}
