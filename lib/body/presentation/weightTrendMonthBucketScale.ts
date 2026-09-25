/**
 * Equal-width calendar-month bucket X scale for Weight trend (≤1Y).
 *
 * Each visible calendar month occupies the same horizontal width. Observations
 * are placed by within-month time fraction — not by raw elapsed-day spacing and
 * not by ordinal point index.
 */

import {
  WEIGHT_TREND_MONTH_LABEL_RANGES,
} from "@/lib/body/presentation/buildWeightTrendMonthMarkers";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

export type WeightTrendMonthBucket = {
  readonly key: string;
  readonly letter: (typeof MONTH_LETTERS)[number];
  readonly year: number;
  /** 0–11 */
  readonly month: number;
  /** Inclusive UTC month-start (noon anchors unused — day fraction uses midnights). */
  readonly startMs: number;
  /** Exclusive next-month start. */
  readonly endMs: number;
  readonly bucketIndex: number;
};

export type WeightTrendMonthBucketScale = {
  readonly buckets: readonly WeightTrendMonthBucket[];
  readonly plotLeft: number;
  readonly plotWidth: number;
};

export type WeightTrendMonthBucketLabel = {
  readonly key: string;
  readonly letter: (typeof MONTH_LETTERS)[number];
  /** Bucket-center X from the equal-width scale. */
  readonly x: number;
  readonly bucketIndex: number;
};

/**
 * Calendar months intersecting [minTimeMs, maxTimeMs], oldest → newest.
 */
export function buildWeightTrendMonthBuckets(args: {
  readonly minTimeMs: number;
  readonly maxTimeMs: number;
}): readonly WeightTrendMonthBucket[] {
  const { minTimeMs, maxTimeMs } = args;
  if (
    !Number.isFinite(minTimeMs) ||
    !Number.isFinite(maxTimeMs) ||
    maxTimeMs < minTimeMs
  ) {
    return [];
  }

  const start = new Date(minTimeMs);
  const end = new Date(maxTimeMs);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();

  const buckets: WeightTrendMonthBucket[] = [];
  let bucketIndex = 0;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const startMs = Date.UTC(year, month, 1, 0, 0, 0, 0);
    const endMs = Date.UTC(year, month + 1, 1, 0, 0, 0, 0);
    if (endMs > minTimeMs && startMs <= maxTimeMs) {
      buckets.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        letter: MONTH_LETTERS[month]!,
        year,
        month,
        startMs,
        endMs,
        bucketIndex,
      });
      bucketIndex += 1;
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return buckets;
}

function findBucketIndex(
  timeMs: number,
  buckets: readonly WeightTrendMonthBucket[],
): number {
  if (buckets.length === 0) return 0;
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i]!;
    if (timeMs >= b.startMs && timeMs < b.endMs) return i;
  }
  if (timeMs < buckets[0]!.startMs) return 0;
  return buckets.length - 1;
}

/**
 * Screen X for a timestamp on the equal-width calendar-month bucket scale.
 */
export function mapWeightTrendTimeToMonthBucketX(
  timeMs: number,
  scale: WeightTrendMonthBucketScale,
): number {
  const { buckets, plotLeft, plotWidth } = scale;
  const n = buckets.length;
  if (n === 0 || plotWidth <= 0) return plotLeft;

  const idx = findBucketIndex(timeMs, buckets);
  const bucket = buckets[idx]!;
  const duration = bucket.endMs - bucket.startMs || 1;
  const fraction = Math.min(1, Math.max(0, (timeMs - bucket.startMs) / duration));
  const normalized = (idx + fraction) / n;
  return plotLeft + normalized * plotWidth;
}

/**
 * Month initials centered in each equal-width bucket.
 * On collision, drop later labels — never shift centers.
 */
export function placeWeightTrendMonthBucketLabels(args: {
  readonly scale: WeightTrendMonthBucketScale;
  readonly minGapPx?: number;
}): readonly WeightTrendMonthBucketLabel[] {
  const minGapPx = args.minGapPx ?? 12;
  const { buckets, plotLeft, plotWidth } = args.scale;
  const n = buckets.length;
  if (n === 0 || plotWidth <= 0) return [];

  const placed: WeightTrendMonthBucketLabel[] = [];
  let lastX = Number.NEGATIVE_INFINITY;

  for (const bucket of buckets) {
    const x = plotLeft + ((bucket.bucketIndex + 0.5) / n) * plotWidth;
    if (placed.length === 0 || x - lastX >= minGapPx) {
      placed.push({
        key: bucket.key,
        letter: bucket.letter,
        x,
        bucketIndex: bucket.bucketIndex,
      });
      lastX = x;
    }
  }
  return placed;
}

/** True when the selected range uses equal-width month buckets. */
export function usesWeightTrendMonthBucketScale(range: WeightRangeKey): boolean {
  return WEIGHT_TREND_MONTH_LABEL_RANGES.has(range);
}

/**
 * Bucket horizontal span for a given index (for alignment tests).
 */
export function weightTrendMonthBucketBounds(
  bucketIndex: number,
  scale: WeightTrendMonthBucketScale,
): { readonly left: number; readonly right: number; readonly center: number } {
  const n = scale.buckets.length || 1;
  const left = scale.plotLeft + (bucketIndex / n) * scale.plotWidth;
  const right = scale.plotLeft + ((bucketIndex + 1) / n) * scale.plotWidth;
  return { left, right, center: (left + right) / 2 };
}
