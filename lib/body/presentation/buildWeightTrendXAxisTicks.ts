/**
 * Range-aware Weight / Body Fat trend X-axis ticks (labels + vertical grid).
 *
 * Short ranges: labels and vertical grid share equal visual slots (no edge clip).
 * Long ranges (3Y / 5Y / All): year labels sit on the same continuous timestamp
 * scale as data points — Jan 1 anchors inside the observed extent.
 */

import {
  buildWeightTrendDayBuckets,
  continuousNormalizedX,
  evenLayoutNormalizedX,
  isWeightTrendLongRange,
  type WeightTrendXScale,
} from "@/lib/body/presentation/buildWeightTrendXScale";
import { buildWeightTrendMonthBuckets } from "@/lib/body/presentation/weightTrendMonthBucketScale";
import type { WeightRangeKey } from "@/lib/data/useWeightSeries";

export type WeightXAxisTick = {
  /** Semantic timestamp for the tick (weekday/month/year meaning). */
  readonly atMs: number;
  /**
   * Visual X in [0, 1] for labels + vertical grid.
   * Short ranges: half-slot centers. Long ranges: continuous time position.
   */
  readonly layoutNormalizedX: number;
  readonly label: string;
  readonly showGridLine: boolean;
  readonly showLabel: boolean;
};

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

function lerpMs(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export { evenLayoutNormalizedX } from "@/lib/body/presentation/buildWeightTrendXScale";

type TickDraft = {
  readonly atMs: number;
  readonly label: string;
};

/** Thin a dense draft set to fit plot width, preserving even chronological sampling. */
function thinDrafts(
  drafts: readonly TickDraft[],
  plotWidthPx: number,
  minGapPx: number,
): TickDraft[] {
  if (drafts.length <= 1) return [...drafts];
  if (!(plotWidthPx > 0) || !(minGapPx > 0)) return [...drafts];
  const maxCount = Math.max(2, Math.floor(plotWidthPx / minGapPx));
  if (drafts.length <= maxCount) return [...drafts];

  const out: TickDraft[] = [];
  const lastIdx = drafts.length - 1;
  for (let i = 0; i < maxCount; i++) {
    const idx = Math.round((i * lastIdx) / (maxCount - 1));
    const draft = drafts[idx]!;
    if (out.length === 0 || out[out.length - 1]!.atMs !== draft.atMs) {
      out.push(draft);
    }
  }
  return out;
}

function finalizeEvenTicks(drafts: readonly TickDraft[]): WeightXAxisTick[] {
  const n = drafts.length;
  return drafts.map((d, i) => ({
    atMs: d.atMs,
    layoutNormalizedX: evenLayoutNormalizedX(i, n),
    label: d.label,
    showGridLine: true,
    showLabel: true,
  }));
}

/** Year ticks share the continuous timestamp scale used by long-range data points. */
function finalizeContinuousTicks(
  drafts: readonly TickDraft[],
  domainStartMs: number,
  domainEndMs: number,
): WeightXAxisTick[] {
  return drafts.map((d) => ({
    atMs: d.atMs,
    layoutNormalizedX: continuousNormalizedX(d.atMs, domainStartMs, domainEndMs),
    label: d.label,
    showGridLine: true,
    showLabel: true,
  }));
}

function monthCenterMs(year: number, month: number): number {
  const start = Date.UTC(year, month, 1, 0, 0, 0, 0);
  const end = Date.UTC(year, month + 1, 1, 0, 0, 0, 0);
  return (start + end) / 2;
}

function build7DDrafts(scale: WeightTrendXScale): TickDraft[] {
  const days = buildWeightTrendDayBuckets({
    minTimeMs: scale.domainStartMs,
    maxTimeMs: scale.domainEndMs,
  });
  return days.map((day) => ({
    atMs: (day.startMs + day.endMs) / 2,
    label: day.weekdayShort,
  }));
}

function build30DDrafts(scale: WeightTrendXScale): TickDraft[] {
  const count = 5;
  const drafts: TickDraft[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const atMs = lerpMs(scale.domainStartMs, scale.domainEndMs, t);
    drafts.push({
      atMs,
      label: String(new Date(atMs).getUTCDate()),
    });
  }
  return drafts;
}

function buildMonthLetterDrafts(scale: WeightTrendXScale): TickDraft[] {
  const months = buildWeightTrendMonthBuckets({
    minTimeMs: scale.domainStartMs,
    maxTimeMs: scale.domainEndMs,
  });
  return months.map((m) => ({
    atMs: monthCenterMs(m.year, m.month),
    label: MONTH_LETTERS[m.month]!,
  }));
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

function buildYearDrafts(scale: WeightTrendXScale, maxLabels: number): TickDraft[] {
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
    while (selected.length > maxLabels && selected.length > 2) {
      selected.splice(selected.length - 2, 1);
    }
  }

  return selected.map((year) => ({
    atMs: yearAnchorMs(year, scale.domainStartMs, scale.domainEndMs),
    label: String(year),
  }));
}

/**
 * Build range-aware X-axis ticks.
 * Short ranges: equal visual spacing. Long ranges: continuous year anchors.
 */
export function buildWeightTrendXAxisTicks(args: {
  readonly range: WeightRangeKey;
  readonly scale: WeightTrendXScale;
  readonly plotWidthPx: number;
  readonly minGapPx?: number;
}): readonly WeightXAxisTick[] {
  const { range, scale, plotWidthPx } = args;
  // Weekday labels need more gap than single month letters.
  const minGapPx =
    args.minGapPx ??
    (range === "7D" ? 36 : range === "3Y" || range === "5Y" || range === "All" ? 48 : 16);

  let drafts: TickDraft[] = [];
  switch (range) {
    case "7D":
      drafts = build7DDrafts(scale);
      break;
    case "30D":
      drafts = build30DDrafts(scale);
      break;
    case "90D":
      drafts = buildMonthLetterDrafts(scale);
      break;
    case "6M":
      drafts = buildMonthLetterDrafts(scale);
      break;
    case "1Y":
      drafts = buildMonthLetterDrafts(scale);
      break;
    case "YTD":
      drafts = buildMonthLetterDrafts(scale);
      break;
    case "3Y":
      drafts = buildYearDrafts(scale, 4);
      break;
    case "5Y":
      drafts = buildYearDrafts(scale, 6);
      break;
    case "All":
      drafts = buildYearDrafts(scale, 6);
      break;
    default:
      drafts = [];
  }

  const thinned = thinDrafts(drafts, plotWidthPx, minGapPx);
  if (isWeightTrendLongRange(range)) {
    return finalizeContinuousTicks(thinned, scale.domainStartMs, scale.domainEndMs);
  }
  return finalizeEvenTicks(thinned);
}
