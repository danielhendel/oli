/**
 * Pure builders for Stage 3B Body metric summary cards.
 *
 * Guardrails:
 * - No personal Health Protection / Performance Support rails
 * - No Body score / Optimized / Excellence placement
 * - No Apple Health → BIA inference
 * - No universal body-fat range
 * - No personal marker without an approved method-compatible classification
 * - Weight screening personal bands deferred (avoid duplicate BMI truth on Body UI)
 */

import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import type {
  BodyMetricCardModel,
  BodyMetricReferenceBarModel,
} from "@/lib/body/presentation/bodyMetricCardTypes";
import {
  formatBodyLeanMass,
  formatBodyWeight,
} from "@/lib/ui/body/bodyMetricFormatting";

export type BodyMetricSummaryOverviewSlice = {
  overviewDay: string | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  leanBodyMassKg: number | null;
  bmi: number | null;
  hasAnyMetric: boolean;
  latestObservedAtIso?: string | null;
};

const LBS_PER_KG = 2.2046226218;

/** Educational screening segments only — never paired with a personal marker in Stage 3B. */
function buildEducationalScreeningBar(accessibleSummary: string): BodyMetricReferenceBarModel {
  return {
    segments: [
      { id: "below", label: "Below", start: 0, end: 0.25, tone: "caution" },
      { id: "within", label: "Within", start: 0.25, end: 0.55, tone: "reference" },
      { id: "above", label: "Above", start: 0.55, end: 0.78, tone: "caution" },
      { id: "high", label: "High", start: 0.78, end: 1, tone: "elevated" },
    ],
    markerPosition: null,
    markerLabel: null,
    accessibleSummary,
  };
}

function buildMutedUnavailableBar(accessibleSummary: string): BodyMetricReferenceBarModel {
  return {
    segments: [
      { id: "unavailable", label: "Reference unavailable", start: 0, end: 1, tone: "muted" },
    ],
    markerPosition: null,
    markerLabel: null,
    accessibleSummary,
  };
}

function formatMeasuredAtLabel(input: {
  overviewDay: string | null;
  latestObservedAtIso: string | null | undefined;
}): string | null {
  if (typeof input.latestObservedAtIso === "string" && input.latestObservedAtIso.length > 0) {
    const d = new Date(input.latestObservedAtIso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
  }
  if (typeof input.overviewDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.overviewDay)) {
    return input.overviewDay;
  }
  return null;
}

function formatBodyFatPercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

function numericWeightDisplay(kg: number, unit: "kg" | "lb"): number {
  return unit === "lb" ? kg * LBS_PER_KG : kg;
}

/**
 * Build the three primary Stage 3B cards in order: Weight, Body Fat, Lean Tissue.
 * Personal markers remain null — method-compatible Body classification is not authorized here.
 */
export function buildBodyMetricSummaryCards(input: {
  overview: BodyMetricSummaryOverviewSlice;
  unit: "kg" | "lb";
  seriesError?: boolean;
}): readonly [BodyMetricCardModel, BodyMetricCardModel, BodyMetricCardModel] {
  const measuredAtLabel = formatMeasuredAtLabel({
    overviewDay: input.overview.overviewDay,
    latestObservedAtIso: input.overview.latestObservedAtIso,
  });

  const weight = buildWeightCard({
    overview: input.overview,
    unit: input.unit,
    measuredAtLabel,
    seriesError: input.seriesError === true,
  });
  const bodyFat = buildBodyFatCard({
    overview: input.overview,
    measuredAtLabel,
    seriesError: input.seriesError === true,
  });
  const leanTissue = buildLeanTissueCard({
    overview: input.overview,
    unit: input.unit,
    measuredAtLabel,
    seriesError: input.seriesError === true,
  });

  return [weight, bodyFat, leanTissue];
}

function buildWeightCard(input: {
  overview: BodyMetricSummaryOverviewSlice;
  unit: "kg" | "lb";
  measuredAtLabel: string | null;
  seriesError: boolean;
}): BodyMetricCardModel {
  const hasValue = input.overview.weightKg != null && Number.isFinite(input.overview.weightKg);
  const formattedValue = hasValue
    ? formatBodyWeight(input.overview.weightKg as number, input.unit)
    : null;
  const value = hasValue ? numericWeightDisplay(input.overview.weightKg as number, input.unit) : null;

  if (input.seriesError) {
    return {
      metric: "weight",
      title: "Weight",
      value: null,
      formattedValue: null,
      unit: input.unit,
      readiness: "error",
      statusLabel: "Couldn’t load this measurement",
      referenceLabel: "Reference unavailable",
      referenceContextLabel: "Weight-for-height screening",
      referenceBar: buildMutedUnavailableBar(
        "Weight. Error loading measurement. No personal screening comparison is available.",
      ),
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight,
      addDataHref: null,
      accessibilityLabel: "Weight. Couldn’t load this measurement. Reference unavailable.",
    };
  }

  if (!hasValue) {
    return {
      metric: "weight",
      title: "Weight",
      value: null,
      formattedValue: null,
      unit: input.unit,
      readiness: "missing",
      statusLabel: "No measurement yet",
      referenceLabel: "Reference unavailable",
      referenceContextLabel: "Weight-for-height screening",
      referenceBar: buildEducationalScreeningBar(
        "Weight. No measurement yet. Weight-for-height screening reference shown for education only. No personal comparison is available.",
      ),
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight,
      addDataHref: null,
      accessibilityLabel: "Weight. No measurement yet. Weight-for-height screening. Reference unavailable.",
    };
  }

  /**
   * Personal BMI screening bands are not authorized on Body consumer UI in Stage 3B
   * (approved classifyBodyComposition path remains deferred from this surface to avoid
   * duplicate truth vs overview facts). Show value + honest screening context only.
   */
  const hasBmiContext = input.overview.bmi != null && Number.isFinite(input.overview.bmi);

  return {
    metric: "weight",
    title: "Weight",
    value,
    formattedValue,
    unit: input.unit,
    readiness: "partial",
    statusLabel: hasBmiContext
      ? "Weight-for-height screening context available"
      : "Current weight",
    referenceLabel: "Reference unavailable",
    referenceContextLabel: "Weight-for-height screening",
    referenceBar: buildEducationalScreeningBar(
      `Weight ${formattedValue}. Weight-for-height screening. Personal screening placement is not available on this page yet.`,
    ),
    provenance: {
      transportLabel: null,
      sourceApplicationLabel: null,
      measurementMethodLabel: null,
      measuredAtLabel: input.measuredAtLabel,
    },
    detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight,
    addDataHref: null,
    accessibilityLabel: `Weight ${formattedValue}. Weight-for-height screening. Reference unavailable.${
      input.measuredAtLabel ? ` Measured ${input.measuredAtLabel}.` : ""
    } Open weight details.`,
  };
}

function buildBodyFatCard(input: {
  overview: BodyMetricSummaryOverviewSlice;
  measuredAtLabel: string | null;
  seriesError: boolean;
}): BodyMetricCardModel {
  const hasValue =
    input.overview.bodyFatPercent != null && Number.isFinite(input.overview.bodyFatPercent);
  const formattedValue = hasValue
    ? formatBodyFatPercent(input.overview.bodyFatPercent as number)
    : null;
  const value = hasValue ? (input.overview.bodyFatPercent as number) : null;

  if (input.seriesError) {
    return {
      metric: "bodyFat",
      title: "Body Fat",
      value: null,
      formattedValue: null,
      unit: "%",
      readiness: "error",
      statusLabel: "Couldn’t load this measurement",
      referenceLabel: "Reference unavailable",
      referenceContextLabel: null,
      referenceBar: buildMutedUnavailableBar(
        "Body Fat. Error loading measurement. No personal comparison is available.",
      ),
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat,
      addDataHref: null,
      accessibilityLabel: "Body Fat. Couldn’t load this measurement. Reference unavailable.",
    };
  }

  if (!hasValue) {
    return {
      metric: "bodyFat",
      title: "Body Fat",
      value: null,
      formattedValue: null,
      unit: "%",
      readiness: "missing",
      statusLabel: "No measurement yet",
      referenceLabel: "Reference unavailable",
      referenceContextLabel: null,
      referenceBar: buildMutedUnavailableBar(
        "Body Fat. No measurement yet. Measurement method is needed for a reliable comparison. No personal marker is available.",
      ),
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat,
      addDataHref: null,
      accessibilityLabel: "Body Fat. No measurement yet. Reference unavailable. Add measurement.",
    };
  }

  // Method unknown on overview — never place a personal marker; never infer BIA from Apple Health.
  return {
    metric: "bodyFat",
    title: "Body Fat",
    value,
    formattedValue,
    unit: "%",
    readiness: "partial",
    statusLabel: "Measurement method is needed for a reliable comparison",
    referenceLabel: "Reference unavailable",
    referenceContextLabel: null,
    referenceBar: buildMutedUnavailableBar(
      `Body Fat ${formattedValue}. Reference unavailable. Measurement method is needed for a reliable comparison. No personal marker is available.`,
    ),
    provenance: {
      transportLabel: null,
      sourceApplicationLabel: null,
      measurementMethodLabel: "Method unknown",
      measuredAtLabel: input.measuredAtLabel,
    },
    detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat,
    addDataHref: null,
    accessibilityLabel: `Body Fat ${formattedValue}. Reference unavailable. Measurement method is needed for a reliable comparison.${
      input.measuredAtLabel ? ` Measured ${input.measuredAtLabel}.` : ""
    } Open body fat details.`,
  };
}

function buildLeanTissueCard(input: {
  overview: BodyMetricSummaryOverviewSlice;
  unit: "kg" | "lb";
  measuredAtLabel: string | null;
  seriesError: boolean;
}): BodyMetricCardModel {
  const hasValue =
    input.overview.leanBodyMassKg != null && Number.isFinite(input.overview.leanBodyMassKg);
  const formattedValue = hasValue
    ? formatBodyLeanMass(input.overview.leanBodyMassKg as number, input.unit)
    : null;
  const value = hasValue
    ? numericWeightDisplay(input.overview.leanBodyMassKg as number, input.unit)
    : null;

  if (input.seriesError) {
    return {
      metric: "leanTissue",
      title: "Lean Tissue",
      value: null,
      formattedValue: null,
      unit: input.unit,
      readiness: "error",
      statusLabel: "Couldn’t load this measurement",
      referenceLabel: "Method-specific reference unavailable",
      referenceContextLabel: null,
      referenceBar: buildMutedUnavailableBar(
        "Lean Tissue. Error loading measurement. No personal comparison is available.",
      ),
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass,
      addDataHref: null,
      accessibilityLabel: "Lean Tissue. Couldn’t load this measurement. Method-specific reference unavailable.",
    };
  }

  if (!hasValue) {
    return {
      metric: "leanTissue",
      title: "Lean Tissue",
      value: null,
      formattedValue: null,
      unit: input.unit,
      readiness: "missing",
      statusLabel: "No measurement yet",
      referenceLabel: "Method-specific reference unavailable",
      referenceContextLabel: null,
      referenceBar: buildMutedUnavailableBar(
        "Lean Tissue. No measurement yet. Method-specific reference unavailable. No personal marker is available.",
      ),
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass,
      addDataHref: null,
      accessibilityLabel: "Lean Tissue. No measurement yet. Method-specific reference unavailable. Add measurement.",
    };
  }

  return {
    metric: "leanTissue",
    title: "Lean Tissue",
    value,
    formattedValue,
    unit: input.unit,
    readiness: "partial",
    statusLabel: "Method-specific reference unavailable",
    referenceLabel: "Method-specific reference unavailable",
    referenceContextLabel: null,
    referenceBar: buildMutedUnavailableBar(
      `Lean Tissue ${formattedValue}. Method-specific reference unavailable. No personal marker is available.`,
    ),
    provenance: {
      transportLabel: null,
      sourceApplicationLabel: null,
      measurementMethodLabel: "Method unknown",
      measuredAtLabel: input.measuredAtLabel,
    },
    detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass,
    addDataHref: null,
    accessibilityLabel: `Lean Tissue ${formattedValue}. Method-specific reference unavailable.${
      input.measuredAtLabel ? ` Measured ${input.measuredAtLabel}.` : ""
    } Open lean tissue details.`,
  };
}

/** Landing copy constants for the simplified Stage 3B shell. */
export const BODY_COMPOSITION_SUMMARY_COPY = {
  pageTitle: "Body Composition",
  purpose: "Track weight, body fat, and lean tissue.",
  actionsTitle: "Add or connect measurements",
  /** Omitted from landing until a real advanced-markers destination exists (Stage 3C+). */
  moreMarkersHref: null as string | null,
  moreMarkersLabel: "More Body Composition markers",
  rangesExplainerLabel: "Learn about measurement ranges",
  historyLabel: "View measurement history",
  settingsLabel: "View Body settings",
  addWeightLabel: "Add weight",
  historyHref: "/(app)/body/list",
  settingsHref: "/(app)/body/settings",
} as const;
