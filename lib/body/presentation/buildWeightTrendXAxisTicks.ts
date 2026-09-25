/**
 * Range-aware Weight trend X-axis ticks (labels + vertical grid anchors).
 * Positions always come from {@link WeightTrendXScale} — never independent spacing.
 */

import {
  buildWeightTrendDayBuckets,
  type WeightTrendXScale,
} from "@/lib/body/presentation/buildWeightTrendXScale";
import { buildWeightTrendMonthBuckets } from "@/lib/body/presentation/weightTrendMonthBucketScale";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";

export type WeightXAxisTick = {
  readonly atMs: number;
  readonly normalizedX: number;
  readonly label: string;
  readonly showGridLine: boolean;
  readonly showLabel: boolean;
};

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

function lerpMs(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function applyLabelCollision(
  ticks: readonly WeightXAxisTick[],
  plotWidthPx: number,
  minGapPx: number,
): WeightXAxisTick[] {
  if (plotWidthPx <= 0 || ticks.length === 0) {
    return ticks.map((t) => ({ ...t, showLabel: false }));
  }
  const out: WeightXAxisTick[] = [];
  let lastLabelX = Number.NEGATIVE_INFINITY;
  for (const tick of ticks) {
    const x = tick.normalizedX * plotWidthPx;
    const showLabel =
      tick.showLabel && (out.length === 0 || x - lastLabelX >= minGapPx);
    if (showLabel) lastLabelX = x;
    out.push({ ...tick, showLabel });
  }
  return out;
}

function monthCenterMs(year: number, month: number): number {
  const start = Date.UTC(year, month, 1, 0, 0, 0, 0);
  const end = Date.UTC(year, month + 1, 1, 0, 0, 0, 0);
  return (start + end) / 2;
}

function build7DTicks(scale: WeightTrendXScale): WeightXAxisTick[] {
  const days = buildWeightTrendDayBuckets({
    minTimeMs: scale.domainStartMs,
    maxTimeMs: scale.domainEndMs,
  });
  return days.map((day) => {
    const atMs = (day.startMs + day.endMs) / 2;
    // Prefer short weekday; single letter if very dense (handled by collision later).
    const label = day.weekdayShort;
    return {
      atMs,
      normalizedX: scale.toNormalizedX(atMs),
      label,
      showGridLine: true,
      showLabel: true,
    };
  });
}

/** ~5 evenly spaced date anchors across the observed domain. */
function build30DTicks(scale: WeightTrendXScale): WeightXAxisTick[] {
  const count = 5;
  const ticks: WeightXAxisTick[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const atMs = lerpMs(scale.domainStartMs, scale.domainEndMs, t);
    const day = new Date(atMs).getUTCDate();
    ticks.push({
      atMs,
      normalizedX: scale.toNormalizedX(atMs),
      label: String(day),
      showGridLine: true,
      showLabel: true,
    });
  }
  return ticks;
}

function buildMonthLetterTicks(
  scale: WeightTrendXScale,
  opts?: { readonly gridEveryOther?: boolean },
): WeightXAxisTick[] {
  const months = buildWeightTrendMonthBuckets({
    minTimeMs: scale.domainStartMs,
    maxTimeMs: scale.domainEndMs,
  });
  const gridEveryOther = opts?.gridEveryOther === true && months.length > 10;
  return months.map((m, i) => {
    const atMs = monthCenterMs(m.year, m.month);
    return {
      atMs,
      normalizedX: scale.toNormalizedX(atMs),
      label: MONTH_LETTERS[m.month]!,
      showGridLine: !gridEveryOther || i % 2 === 0,
      showLabel: true,
    };
  });
}

function yearsInDomain(startMs: number, endMs: number): number[] {
  const startY = new Date(startMs).getUTCFullYear();
  const endY = new Date(endMs).getUTCFullYear();
  const years: number[] = [];
  for (let y = startY; y <= endY; y++) years.push(y);
  return years;
}

function yearAnchorMs(year: number, domainStartMs: number, domainEndMs: number): number {
  const jan1 = Date.UTC(year, 0, 1, 12, 0, 0);
  if (jan1 < domainStartMs) return domainStartMs;
  if (jan1 > domainEndMs) return domainEndMs;
  return jan1;
}

function buildYearTicks(
  scale: WeightTrendXScale,
  maxLabels: number,
): WeightXAxisTick[] {
  const years = yearsInDomain(scale.domainStartMs, scale.domainEndMs);
  if (years.length === 0) return [];

  let selected = years;
  if (years.length > maxLabels) {
    const step = Math.ceil(years.length / maxLabels);
    selected = years.filter((_, i) => i % step === 0);
    const last = years[years.length - 1]!;
    if (selected[selected.length - 1] !== last) {
      selected = [...selected, last];
    }
    // Trim if still over (first+last dense).
    while (selected.length > maxLabels && selected.length > 2) {
      // Drop second-to-last intermediate.
      selected.splice(selected.length - 2, 1);
    }
  }

  return selected.map((year) => {
    const atMs = yearAnchorMs(year, scale.domainStartMs, scale.domainEndMs);
    return {
      atMs,
      normalizedX: scale.toNormalizedX(atMs),
      label: String(year),
      showGridLine: true,
      showLabel: true,
    };
  });
}

/**
 * Build range-aware X-axis ticks positioned on the shared Weight X-scale.
 */
export function buildWeightTrendXAxisTicks(args: {
  readonly range: WeightRangeKey;
  readonly scale: WeightTrendXScale;
  readonly plotWidthPx: number;
  readonly minGapPx?: number;
}): readonly WeightXAxisTick[] {
  const { range, scale, plotWidthPx } = args;
  const minGapPx = args.minGapPx ?? 14;

  let ticks: WeightXAxisTick[] = [];
  switch (range) {
    case "7D":
      ticks = build7DTicks(scale);
      break;
    case "30D":
      ticks = build30DTicks(scale);
      break;
    case "90D":
      ticks = buildMonthLetterTicks(scale);
      break;
    case "6M":
      ticks = buildMonthLetterTicks(scale);
      break;
    case "1Y":
      ticks = buildMonthLetterTicks(scale, { gridEveryOther: true });
      break;
    case "YTD":
      ticks = buildMonthLetterTicks(scale);
      break;
    case "3Y":
      ticks = buildYearTicks(scale, 4);
      break;
    case "5Y":
      ticks = buildYearTicks(scale, 6);
      break;
    case "All":
      ticks = buildYearTicks(scale, 6);
      break;
    default:
      ticks = [];
  }

  return applyLabelCollision(ticks, plotWidthPx, minGapPx);
}
