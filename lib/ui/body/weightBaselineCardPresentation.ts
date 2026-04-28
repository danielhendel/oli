import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";
import type { WeightBaselineCardModel } from "@/lib/data/body/weightBaselineCardModel";
import type { WeightBaselineChartPoint } from "@/lib/ui/body/WeightBaselineChart";

const LBS_PER_KG = 2.2046226218;
const CHART_MIN_LB = 155;
const CHART_MAX_LB = 165;

export type WeightBaselineXAxisLabel = {
  tMs: number;
  label: string;
  anchor: "start" | "middle" | "end";
};

export type WeightBaselineCardPresentation = {
  chartMinKg: number;
  chartMaxKg: number;
  rangeDeltaHeadlineValueLabel: string;
  lowLabel: string;
  highLabel: string;
  averageLabel: string | null;
  changeLabel: string | null;
  rangeLabel: string;
  trendLabel: string;
  xAxisLabels: WeightBaselineXAxisLabel[];
  changeKg: number | null;
};

function formatSignedWeightDelta(kg: number, unit: "kg" | "lb"): string {
  const value = unit === "lb" ? kg * LBS_PER_KG : kg;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)} ${unit}`;
}

function averageWeightKg(points: readonly WeightBaselineChartPoint[]): number | null {
  if (points.length === 0) return null;
  const sum = points.reduce((s, p) => s + p.weightKg, 0);
  return sum / points.length;
}

function changeFromFirstToLastKg(points: readonly WeightBaselineChartPoint[]): number | null {
  const sorted = points
    .map((p) => ({ t: Date.parse(p.observedAt), w: p.weightKg }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
  if (sorted.length < 2) return null;
  return sorted[sorted.length - 1]!.w - sorted[0]!.w;
}

function buildXAxisLabels(points: readonly WeightBaselineChartPoint[]): WeightBaselineXAxisLabel[] {
  const sorted = points
    .map((p) => ({ t: Date.parse(p.observedAt) }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
  if (sorted.length < 2) return [];
  const start = sorted[0]!.t;
  const end = sorted[sorted.length - 1]!.t;
  const count = 5;
  const labels: WeightBaselineXAxisLabel[] = [];
  for (let i = 0; i < count; i++) {
    const ratio = i / (count - 1);
    const tMs = start + (end - start) * ratio;
    labels.push({
      tMs,
      label: new Date(tMs).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      anchor: i === 0 ? "start" : i === count - 1 ? "end" : "middle",
    });
  }
  return labels;
}

export function buildWeightBaselineCardPresentation(input: {
  model: Extract<WeightBaselineCardModel, { kind: "ready" }>;
  points: readonly WeightBaselineChartPoint[];
  unit: "kg" | "lb";
}): WeightBaselineCardPresentation {
  const { model, points, unit } = input;
  const avgKg = averageWeightKg(points);
  const changeKg = changeFromFirstToLastKg(points);
  const trendLabel =
    model.classification === "maintaining"
      ? "Stable over 90 days"
      : model.classification === "gaining"
        ? "Gaining trend"
        : "Losing trend";

  // TODO: replace fixed domain with dynamic 5-lb snapped range around low/high/current.
  const chartMinKg = CHART_MIN_LB / LBS_PER_KG;
  const chartMaxKg = CHART_MAX_LB / LBS_PER_KG;

  return {
    chartMinKg,
    chartMaxKg,
    rangeDeltaHeadlineValueLabel: formatBodyWeight(Math.abs(model.ninetyDayHighKg - model.ninetyDayLowKg), unit),
    lowLabel: formatBodyWeight(model.ninetyDayLowKg, unit),
    highLabel: formatBodyWeight(model.ninetyDayHighKg, unit),
    averageLabel: avgKg != null ? formatBodyWeight(avgKg, unit) : null,
    changeLabel: changeKg != null ? formatSignedWeightDelta(changeKg, unit) : null,
    rangeLabel: formatBodyWeight(Math.abs(model.ninetyDayHighKg - model.ninetyDayLowKg), unit),
    trendLabel,
    xAxisLabels: buildXAxisLabels(points),
    changeKg,
  };
}

