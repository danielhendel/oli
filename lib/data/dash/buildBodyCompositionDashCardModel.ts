/**
 * Pure view-model builder for the Dash Body Composition card. Reuses Body Composition module
 * interpretations — no Dash-local thresholds or progress math.
 */
import type { BodyOverviewInterpretations } from "@/lib/body/bodyCompositionInterpretation";
import type { InterpretationBarModel } from "@/lib/body/bodyOverviewInterpretationBar";
import {
  formatBodyBmi,
  formatBodyHeroWeightLabel,
  formatBodyLeanMass,
} from "@/lib/ui/body/bodyMetricFormatting";
import { interpretationBarAccessibilityLabel } from "@/lib/ui/body/InterpretationQualityBar";

/** Matches upstream weight-series readiness used by Body overview (`useWeightSeries`). */
export type BodyCompositionDashSeriesStatus = "partial" | "ready" | "error";

export type BodyCompositionDashMetricRowKey = "bmi" | "bodyFat" | "leanMass";

export type BodyCompositionDashMetricRow = {
  key: BodyCompositionDashMetricRowKey;
  label: string;
  valueLabel: string;
  /** Pill chrome + label reuse Body Composition overview interpretation bars. */
  bar: InterpretationBarModel;
  accessibilityLabel: string;
};

export type BodyCompositionDashCardOverviewSlice = {
  weightKg: number | null;
  bodyFatPercent: number | null;
  bmi: number | null;
  leanBodyMassKg: number | null;
  hasAnyMetric: boolean;
};

export type BuildBodyCompositionDashCardModelInput = {
  seriesStatus: BodyCompositionDashSeriesStatus;
  seriesError: string | null;
  overview: BodyCompositionDashCardOverviewSlice;
  interpretations: BodyOverviewInterpretations;
  massUnit: "kg" | "lb";
  /** Preformatted “As of …” line from {@link formatAsOfReadingLabel} / day-key fallback. */
  readingAsOfLabel: string | null;
};

export type BuiltBodyCompositionDashCard =
  | { tag: "partial" }
  | { tag: "error"; message: string }
  | { tag: "missing"; cardAccessibilityLabel: string }
  | {
      tag: "ready";
      weightPrimaryLabel: string;
      readingAsOfLabel: string | null;
      rows: BodyCompositionDashMetricRow[];
      cardAccessibilityLabel: string;
    };

function dashMetricRowAccessibility(
  metricLabel: string,
  valueText: string,
  bar: InterpretationBarModel,
): string {
  const tier = bar.hasValue ? bar.displayLabel : "No data";
  return `Open ${metricLabel} ranges. ${valueText}. Tier ${tier}. ${interpretationBarAccessibilityLabel(bar, metricLabel)}`;
}

export function buildBodyCompositionDashCardModel(
  input: BuildBodyCompositionDashCardModelInput,
): BuiltBodyCompositionDashCard {
  const { seriesStatus, seriesError, overview, interpretations, massUnit, readingAsOfLabel } = input;

  if (seriesStatus === "error") {
    return { tag: "error", message: seriesError ?? "Body composition unavailable" };
  }

  if (seriesStatus === "partial") {
    return { tag: "partial" };
  }

  if (!overview.hasAnyMetric) {
    return {
      tag: "missing",
      cardAccessibilityLabel:
        "Body composition. Add body data to see your composition. Opens body composition.",
    };
  }

  const { bmi: bmiIx, bodyFat: bfIx, lean: leanIx } = interpretations;

  const weightPrimaryLabel =
    overview.weightKg != null ? formatBodyHeroWeightLabel(overview.weightKg, massUnit) : "—";

  const rows: BodyCompositionDashMetricRow[] = [
    {
      key: "bmi",
      label: "BMI",
      valueLabel: overview.bmi != null ? formatBodyBmi(overview.bmi) : "—",
      bar: bmiIx.bar,
      accessibilityLabel: dashMetricRowAccessibility(
        "BMI",
        overview.bmi != null ? formatBodyBmi(overview.bmi) : "—",
        bmiIx.bar,
      ),
    },
    {
      key: "bodyFat",
      label: "Body Fat",
      valueLabel:
        overview.bodyFatPercent != null ? `${overview.bodyFatPercent.toFixed(1)}%` : "—",
      bar: bfIx.bar,
      accessibilityLabel: dashMetricRowAccessibility(
        "Body Fat",
        overview.bodyFatPercent != null ? `${overview.bodyFatPercent.toFixed(1)}%` : "—",
        bfIx.bar,
      ),
    },
    {
      key: "leanMass",
      label: "Lean Mass",
      valueLabel:
        overview.leanBodyMassKg != null
          ? formatBodyLeanMass(overview.leanBodyMassKg, massUnit)
          : "—",
      bar: leanIx.bar,
      accessibilityLabel: dashMetricRowAccessibility(
        "Lean Body Mass",
        overview.leanBodyMassKg != null
          ? formatBodyLeanMass(overview.leanBodyMassKg, massUnit)
          : "—",
        leanIx.bar,
      ),
    },
  ];

  const cardParts = ["Body composition card"];
  if (overview.weightKg != null) {
    cardParts.push(weightPrimaryLabel);
  }
  if (readingAsOfLabel != null && readingAsOfLabel.length > 0) {
    cardParts.push(readingAsOfLabel);
  }
  cardParts.push("Opens range details when you activate a metric row.");

  return {
    tag: "ready",
    weightPrimaryLabel,
    readingAsOfLabel,
    rows,
    cardAccessibilityLabel: cardParts.join(". ") + ".",
  };
}
