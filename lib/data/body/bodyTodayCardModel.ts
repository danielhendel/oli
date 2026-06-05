/**
 * Pure view-model for the Body "Today" card — mirrors {@link ActivityTodayCard}'s structure
 * (a dominant primary metric + clean supporting rows). No range/status pills.
 *
 * Primary value: Weight. Supporting rows: BMI, Body Fat, Lean Mass (rendered with a fallback
 * dash when unavailable). Deterministic from the Body overview snapshot — no React, no network.
 */
import {
  formatBodyBmi,
  formatBodyLeanMass,
  formatBodyWeight,
} from "@/lib/ui/body/bodyMetricFormatting";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";

export type BodyTodaySupportingRowKey = "bmi" | "bodyFat" | "lean";

export type BodyTodaySupportingRow = {
  key: BodyTodaySupportingRowKey;
  label: string;
  /** Display value or `"\u2014"` (em dash) when unavailable. */
  value: string;
  hasValue: boolean;
  /** Detail route for the chevron tap target. */
  href: string;
  accessibilityLabel: string;
};

export type BodyTodayCardModel = {
  /** True when at least one body metric (weight/bmi/body fat/lean mass) is available. */
  hasAnyMetric: boolean;
  /** Primary headline weight, e.g. `"159.2 lb"`; null when no weight reading. */
  weightValue: string | null;
  weightHref: string;
  weightAccessibilityLabel: string;
  /** Always three rows (BMI, Body Fat, Lean Mass), each with a value or fallback dash. */
  supportingRows: readonly BodyTodaySupportingRow[];
  /** "As of …" line for the snapshot day; null when no snapshot day. */
  asOfDayKey: string | null;
};

export type BodyTodayOverviewSlice = {
  overviewDay: string | null;
  weightKg: number | null;
  bmi: number | null;
  bodyFatPercent: number | null;
  leanBodyMassKg: number | null;
  hasAnyMetric: boolean;
};

const EMPTY_VALUE = "\u2014";

function formatBodyFat(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

export function buildBodyTodayCardModel(input: {
  overview: BodyTodayOverviewSlice;
  unit: "kg" | "lb";
}): BodyTodayCardModel {
  const { overview, unit } = input;

  const weightValue =
    overview.weightKg != null ? formatBodyWeight(overview.weightKg, unit) : null;
  const weightAccessibilityLabel =
    weightValue != null
      ? `Weight ${weightValue.replace("lb", "pounds").replace("kg", "kilograms")}. Open weight details.`
      : "Weight not available yet.";

  const bmiValue = overview.bmi != null ? formatBodyBmi(overview.bmi) : EMPTY_VALUE;
  const bodyFatValue =
    overview.bodyFatPercent != null ? formatBodyFat(overview.bodyFatPercent) : EMPTY_VALUE;
  const leanValue =
    overview.leanBodyMassKg != null
      ? formatBodyLeanMass(overview.leanBodyMassKg, unit)
      : EMPTY_VALUE;

  const supportingRows: BodyTodaySupportingRow[] = [
    {
      key: "bmi",
      label: "BMI",
      value: bmiValue,
      hasValue: overview.bmi != null,
      href: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bmi,
      accessibilityLabel:
        overview.bmi != null
          ? `BMI ${bmiValue}. Open BMI details.`
          : "BMI not available yet.",
    },
    {
      key: "bodyFat",
      label: "Body Fat",
      value: bodyFatValue,
      hasValue: overview.bodyFatPercent != null,
      href: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat,
      accessibilityLabel:
        overview.bodyFatPercent != null
          ? `Body Fat ${bodyFatValue}. Open body fat details.`
          : "Body Fat not available yet.",
    },
    {
      key: "lean",
      label: "Lean Mass",
      value: leanValue,
      hasValue: overview.leanBodyMassKg != null,
      href: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass,
      accessibilityLabel:
        overview.leanBodyMassKg != null
          ? `Lean Mass ${leanValue.replace("lb", "pounds").replace("kg", "kilograms")}. Open lean body mass details.`
          : "Lean Mass not available yet.",
    },
  ];

  return {
    hasAnyMetric: overview.hasAnyMetric,
    weightValue,
    weightHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight,
    weightAccessibilityLabel,
    supportingRows,
    asOfDayKey: overview.overviewDay,
  };
}
