/**
 * Shared Weight trend X-scale — one mapping for points, guide, grid, and labels.
 *
 * Day/month ranges use equal-width calendar buckets (no edge pinning) so data
 * sits in the same visual slots as evenly spaced axis labels.
 * Linear ranges (30D / multi-year) map through the even label anchors.
 */

import { buildWeightTrendMonthBuckets } from "@/lib/body/presentation/weightTrendMonthBucketScale";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";

export type WeightTrendXScaleMode = "dayBuckets" | "monthBuckets" | "linear";

export type WeightTrendXLayoutAnchor = {
  readonly atMs: number;
  readonly layoutNormalizedX: number;
};

export type WeightTrendXScale = {
  readonly mode: WeightTrendXScaleMode;
  readonly domainStartMs: number;
  readonly domainEndMs: number;
  /** Observation time → normalized plot X in [0, 1]. */
  readonly toNormalizedX: (timeMs: number) => number;
};

export type WeightTrendDayBucket = {
  readonly key: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly bucketIndex: number;
  readonly weekdayShort: string;
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Equal visual slots across the plot.
 * First/last sit at half-slot insets so middle-anchored text never clips.
 * Shared by x-axis labels, vertical grid, and (for linear ranges) data anchors.
 */
export function evenLayoutNormalizedX(index: number, count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 0.5;
  return (index + 0.5) / count;
}

/**
 * Calendar UTC days intersecting [minTimeMs, maxTimeMs].
 */
export function buildWeightTrendDayBuckets(args: {
  readonly minTimeMs: number;
  readonly maxTimeMs: number;
}): readonly WeightTrendDayBucket[] {
  const { minTimeMs, maxTimeMs } = args;
  if (
    !Number.isFinite(minTimeMs) ||
    !Number.isFinite(maxTimeMs) ||
    maxTimeMs < minTimeMs
  ) {
    return [];
  }

  const start = new Date(minTimeMs);
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  let d = start.getUTCDate();
  const endDay = new Date(maxTimeMs);
  const endKey = Date.UTC(
    endDay.getUTCFullYear(),
    endDay.getUTCMonth(),
    endDay.getUTCDate(),
  );

  const buckets: WeightTrendDayBucket[] = [];
  let bucketIndex = 0;

  for (;;) {
    const startMs = Date.UTC(y, m, d, 0, 0, 0, 0);
    if (startMs > endKey) break;
    const endMs = Date.UTC(y, m, d + 1, 0, 0, 0, 0);
    const weekdayShort = WEEKDAY_SHORT[new Date(startMs).getUTCDay()]!;
    buckets.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      startMs,
      endMs,
      bucketIndex,
      weekdayShort,
    });
    bucketIndex += 1;
    const next = new Date(Date.UTC(y, m, d + 1));
    y = next.getUTCFullYear();
    m = next.getUTCMonth();
    d = next.getUTCDate();
    if (bucketIndex > 400) break;
  }

  return buckets;
}

function bucketRawNorm(
  timeMs: number,
  buckets: readonly { startMs: number; endMs: number; bucketIndex: number }[],
): number {
  const n = buckets.length;
  if (n === 0) return 0;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const b = buckets[i]!;
    if (timeMs >= b.startMs && timeMs < b.endMs) {
      idx = i;
      break;
    }
    if (timeMs < buckets[0]!.startMs) {
      idx = 0;
      break;
    }
    idx = n - 1;
  }
  const bucket = buckets[idx]!;
  const duration = bucket.endMs - bucket.startMs || 1;
  const fraction = Math.min(1, Math.max(0, (timeMs - bucket.startMs) / duration));
  return (idx + fraction) / n;
}

function resolveMode(range: WeightRangeKey): WeightTrendXScaleMode {
  if (range === "7D") return "dayBuckets";
  if (range === "90D" || range === "6M" || range === "1Y" || range === "YTD") {
    return "monthBuckets";
  }
  return "linear";
}

/**
 * Piecewise-linear map through even label anchors so data lands on the same
 * visual slots as x-axis labels / vertical grid.
 */
export function mapTimeThroughLayoutAnchors(
  timeMs: number,
  anchors: readonly WeightTrendXLayoutAnchor[],
): number {
  if (anchors.length === 0) return 0;
  if (anchors.length === 1) return clamp01(anchors[0]!.layoutNormalizedX);

  const sorted = [...anchors].sort((a, b) => a.atMs - b.atMs);
  if (timeMs <= sorted[0]!.atMs) return clamp01(sorted[0]!.layoutNormalizedX);
  const last = sorted[sorted.length - 1]!;
  if (timeMs >= last.atMs) return clamp01(last.layoutNormalizedX);

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (timeMs >= a.atMs && timeMs <= b.atMs) {
      const span = b.atMs - a.atMs || 1;
      const t = (timeMs - a.atMs) / span;
      return clamp01(a.layoutNormalizedX + t * (b.layoutNormalizedX - a.layoutNormalizedX));
    }
  }
  return clamp01(last.layoutNormalizedX);
}

/**
 * Build the shared X-scale for a Weight trend range.
 *
 * When `layoutAnchors` are provided (from the even x-axis tick model), ALL ranges
 * map data through those anchors so points / guide / labels share one X model.
 * Without anchors (tests / pre-layout), day/month use equal-width buckets and
 * linear ranges use a half-slot fallback span.
 */
export function buildWeightTrendXScale(args: {
  readonly range: WeightRangeKey;
  readonly domainStartMs: number;
  readonly domainEndMs: number;
  readonly layoutAnchors?: readonly WeightTrendXLayoutAnchor[];
}): WeightTrendXScale {
  const { range, domainStartMs, domainEndMs, layoutAnchors } = args;
  const mode = resolveMode(range);

  // Authoritative path: even label slots drive data + guide + grid.
  if (layoutAnchors != null && layoutAnchors.length > 0) {
    return {
      mode,
      domainStartMs,
      domainEndMs,
      toNormalizedX: (timeMs) => mapTimeThroughLayoutAnchors(timeMs, layoutAnchors),
    };
  }

  if (mode === "dayBuckets") {
    const buckets = buildWeightTrendDayBuckets({
      minTimeMs: domainStartMs,
      maxTimeMs: domainEndMs,
    });
    return {
      mode,
      domainStartMs,
      domainEndMs,
      toNormalizedX: (timeMs) => clamp01(bucketRawNorm(timeMs, buckets)),
    };
  }

  if (mode === "monthBuckets") {
    const buckets = buildWeightTrendMonthBuckets({
      minTimeMs: domainStartMs,
      maxTimeMs: domainEndMs,
    });
    return {
      mode,
      domainStartMs,
      domainEndMs,
      toNormalizedX: (timeMs) => clamp01(bucketRawNorm(timeMs, buckets)),
    };
  }

  // Fallback before ticks exist: map domain onto half-slot span for a default n.
  const fallbackN = range === "30D" ? 5 : 4;
  const span = domainEndMs - domainStartMs || 1;
  const first = evenLayoutNormalizedX(0, fallbackN);
  const last = evenLayoutNormalizedX(fallbackN - 1, fallbackN);
  const layoutSpan = last - first || 1;
  return {
    mode: "linear",
    domainStartMs,
    domainEndMs,
    toNormalizedX: (timeMs) =>
      clamp01(first + ((timeMs - domainStartMs) / span) * layoutSpan),
  };
}

/** Screen X from normalized plot coordinate. */
export function mapWeightTrendNormalizedXToScreen(
  normalizedX: number,
  plotLeft: number,
  plotWidth: number,
): number {
  return plotLeft + normalizedX * plotWidth;
}

/** Screen X for a timestamp via the shared scale. */
export function mapWeightTrendTimeToScreenX(
  timeMs: number,
  scale: WeightTrendXScale,
  plotLeft: number,
  plotWidth: number,
): number {
  return mapWeightTrendNormalizedXToScreen(
    scale.toNormalizedX(timeMs),
    plotLeft,
    plotWidth,
  );
}
