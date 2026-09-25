/**
 * Shared Weight trend X-scale — one mapping for points, guide, grid, and labels.
 *
 * Domain is always the first→last plotted observation (no decorative x-padding).
 * First observation → normalizedX 0; latest → normalizedX 1.
 */

import { buildWeightTrendMonthBuckets } from "@/lib/body/presentation/weightTrendMonthBucketScale";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";

export type WeightTrendXScaleMode = "dayBuckets" | "monthBuckets" | "linear";

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

function pinNormalized(
  raw: number,
  rawStart: number,
  rawEnd: number,
): number {
  const span = rawEnd - rawStart;
  if (!(span > 0)) return 0;
  return (raw - rawStart) / span;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
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
  if (range === "90D" || range === "6M" || range === "1Y") return "monthBuckets";
  return "linear";
}

/**
 * Build the shared X-scale for a Weight trend range.
 * Domain pins: first observation → 0, last observation → 1.
 */
export function buildWeightTrendXScale(args: {
  readonly range: WeightRangeKey;
  readonly domainStartMs: number;
  readonly domainEndMs: number;
}): WeightTrendXScale {
  const { range, domainStartMs, domainEndMs } = args;
  const mode = resolveMode(range);

  if (mode === "dayBuckets") {
    const buckets = buildWeightTrendDayBuckets({
      minTimeMs: domainStartMs,
      maxTimeMs: domainEndMs,
    });
    const rawStart = bucketRawNorm(domainStartMs, buckets);
    const rawEnd = bucketRawNorm(domainEndMs, buckets);
    return {
      mode,
      domainStartMs,
      domainEndMs,
      toNormalizedX: (timeMs) =>
        clamp01(pinNormalized(bucketRawNorm(timeMs, buckets), rawStart, rawEnd)),
    };
  }

  if (mode === "monthBuckets") {
    const buckets = buildWeightTrendMonthBuckets({
      minTimeMs: domainStartMs,
      maxTimeMs: domainEndMs,
    });
    const rawStart = bucketRawNorm(domainStartMs, buckets);
    const rawEnd = bucketRawNorm(domainEndMs, buckets);
    return {
      mode,
      domainStartMs,
      domainEndMs,
      toNormalizedX: (timeMs) =>
        clamp01(pinNormalized(bucketRawNorm(timeMs, buckets), rawStart, rawEnd)),
    };
  }

  const span = domainEndMs - domainStartMs || 1;
  return {
    mode: "linear",
    domainStartMs,
    domainEndMs,
    toNormalizedX: (timeMs) =>
      clamp01((timeMs - domainStartMs) / span),
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
