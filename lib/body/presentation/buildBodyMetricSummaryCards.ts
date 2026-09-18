/**
 * Pure builders for Stage 3B Body metric summary cards.
 * Classification comes only from approved standards resolvers — never generic labels.
 */

import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import type {
  BodyMetricCardModel,
  BodyMetricClassificationChartModel,
  BodyMetricReferenceBarModel,
} from "@/lib/body/presentation/bodyMetricCardTypes";
import {
  resolveBodyMetricStandardPresentation,
  type BodyMetricStandardResolveInput,
} from "@/lib/body/standards/resolveBodyMetricStandardPresentation";
import type { BodyMetricClassificationTone } from "@/lib/ui/theme/bodyMetricClassificationChrome";
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

export type BodyMetricSummaryProfileSlice = {
  heightCm: number | null;
  ageYears: number | null;
  sex: "female" | "male" | "unspecified" | null;
};

const LBS_PER_KG = 2.2046226218;

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

function mapTone(tone: string): BodyMetricClassificationTone {
  if (tone === "cool" || tone === "reference" || tone === "caution" || tone === "elevated" || tone === "neutral") {
    return tone;
  }
  if (tone === "muted") return "neutral";
  return "neutral";
}

function toClassificationChart(
  presentation: NonNullable<ReturnType<typeof resolveBodyMetricStandardPresentation>>,
): BodyMetricClassificationChartModel {
  const marker =
    presentation.classifiedId != null &&
    presentation.markerLabel != null &&
    presentation.markerFormattedValue != null
      ? {
          formattedValue: presentation.markerFormattedValue,
          segmentId: presentation.classifiedId,
          withinSegmentPosition: presentation.withinSegmentPosition,
          accessibleLabel: presentation.markerLabel,
        }
      : null;

  return {
    standardId: presentation.standardId,
    standardVersion: presentation.standardVersion,
    contextLabel: presentation.contextLabel,
    segments: presentation.segments.map((s) => ({
      id: s.id,
      label: s.displayLabel,
      formattedRange: s.numericRangeLabel,
      tone: mapTone(s.tone),
      lowerBound: s.lowerBound,
      upperBound: s.upperBound,
      lowerInclusive: s.lowerInclusive,
      upperInclusive: s.upperInclusive,
    })),
    marker,
    accessibleSummary: presentation.accessibleSummary,
  };
}

/** Transitional adapter for legacy reference-bar consumers/tests. */
function toReferenceBar(
  chart: BodyMetricClassificationChartModel,
): BodyMetricReferenceBarModel {
  const n = chart.segments.length || 1;
  return {
    segments: chart.segments.map((s, i) => ({
      id: s.id,
      label: s.label,
      numericRangeLabel: s.formattedRange,
      start: i / n,
      end: (i + 1) / n,
      tone:
        s.tone === "reference"
          ? "reference"
          : s.tone === "elevated"
            ? "elevated"
            : s.tone === "caution"
              ? "caution"
              : "muted",
    })),
    markerPosition:
      chart.marker != null
        ? (() => {
            const idx = chart.segments.findIndex((s) => s.id === chart.marker!.segmentId);
            if (idx < 0) return null;
            const within = chart.marker.withinSegmentPosition ?? 0.42;
            return (idx + within) / n;
          })()
        : null,
    markerLabel: chart.marker?.accessibleLabel ?? null,
    accessibleSummary: chart.accessibleSummary,
    standardId: chart.standardId,
    standardVersion: chart.standardVersion,
  };
}

function resolveInput(params: {
  metric: BodyMetricStandardResolveInput["metric"];
  overview: BodyMetricSummaryOverviewSlice;
  profile: BodyMetricSummaryProfileSlice;
  unit: "kg" | "lb";
  measurementMethod: string | null;
}): BodyMetricStandardResolveInput {
  return {
    metric: params.metric,
    weightKg: params.overview.weightKg,
    bodyFatPercent: params.overview.bodyFatPercent,
    leanBodyMassKg: params.overview.leanBodyMassKg,
    bmi: params.overview.bmi,
    heightCm: params.profile.heightCm,
    ageYears: params.profile.ageYears,
    sex: params.profile.sex,
    measurementMethod: params.measurementMethod,
    massDisplayUnit: params.unit,
  };
}

/**
 * Build the three primary Stage 3B cards in order: Weight, Body Fat, Lean Tissue.
 */
export function buildBodyMetricSummaryCards(input: {
  overview: BodyMetricSummaryOverviewSlice;
  profile: BodyMetricSummaryProfileSlice;
  unit: "kg" | "lb";
  seriesError?: boolean;
}): readonly [BodyMetricCardModel, BodyMetricCardModel, BodyMetricCardModel] {
  const measuredAtLabel = formatMeasuredAtLabel({
    overviewDay: input.overview.overviewDay,
    latestObservedAtIso: input.overview.latestObservedAtIso,
  });

  return [
    buildWeightCard({
      overview: input.overview,
      profile: input.profile,
      unit: input.unit,
      measuredAtLabel,
      seriesError: input.seriesError === true,
    }),
    buildBodyFatCard({
      overview: input.overview,
      profile: input.profile,
      unit: input.unit,
      measuredAtLabel,
      seriesError: input.seriesError === true,
    }),
    buildLeanTissueCard({
      overview: input.overview,
      profile: input.profile,
      unit: input.unit,
      measuredAtLabel,
      seriesError: input.seriesError === true,
    }),
  ];
}

function buildWeightCard(input: {
  overview: BodyMetricSummaryOverviewSlice;
  profile: BodyMetricSummaryProfileSlice;
  unit: "kg" | "lb";
  measuredAtLabel: string | null;
  seriesError: boolean;
}): BodyMetricCardModel {
  const hasValue = input.overview.weightKg != null && Number.isFinite(input.overview.weightKg);
  const formattedValue = hasValue
    ? formatBodyWeight(input.overview.weightKg as number, input.unit)
    : null;
  const value = hasValue ? numericWeightDisplay(input.overview.weightKg as number, input.unit) : null;

  const presentation = input.seriesError
    ? null
    : resolveBodyMetricStandardPresentation(
        resolveInput({
          metric: "weight",
          overview: input.overview,
          profile: input.profile,
          unit: input.unit,
          measurementMethod: "height_and_weight",
        }),
      );
  const classificationChart = presentation ? toClassificationChart(presentation) : null;
  const referenceBar = classificationChart ? toReferenceBar(classificationChart) : null;

  if (input.seriesError) {
    return {
      metric: "weight",
      title: "Weight",
      value: null,
      formattedValue: null,
      unit: input.unit,
      readiness: "error",
      statusLabel: "",
      referenceLabel: null,
      referenceContextLabel: null,
      classificationChart: null,
      referenceBar: null,
      heightSpecificRangeLabel: null,
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight,
      addDataHref: null,
      accessibilityLabel: "Weight. No current measurement. Couldn’t load this measurement.",
      featured: true,
    };
  }

  const hasMarker = classificationChart?.marker != null;

  return {
    metric: "weight",
    title: "Weight",
    value,
    formattedValue,
    unit: input.unit,
    readiness: hasMarker ? "referenceAvailable" : hasValue ? "partial" : "missing",
    statusLabel: "",
    referenceLabel: null,
    referenceContextLabel: presentation?.contextLabel ?? null,
    classificationChart,
    referenceBar,
    heightSpecificRangeLabel: presentation?.heightSpecificWeightRangeLabel ?? null,
    provenance: {
      transportLabel: null,
      sourceApplicationLabel: null,
      measurementMethodLabel: null,
      measuredAtLabel: input.measuredAtLabel,
    },
    detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight,
    addDataHref: null,
    accessibilityLabel:
      classificationChart?.accessibleSummary ??
      (hasValue
        ? `Weight ${formattedValue}. Adult BMI screening not applicable. Open weight details.`
        : "Weight. No current measurement. Open weight details."),
    featured: true,
  };
}

function buildBodyFatCard(input: {
  overview: BodyMetricSummaryOverviewSlice;
  profile: BodyMetricSummaryProfileSlice;
  unit: "kg" | "lb";
  measuredAtLabel: string | null;
  seriesError: boolean;
}): BodyMetricCardModel {
  void input.profile;
  void input.unit;
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
      statusLabel: "",
      referenceLabel: null,
      referenceContextLabel: null,
      classificationChart: null,
      referenceBar: null,
      heightSpecificRangeLabel: null,
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat,
      addDataHref: null,
      accessibilityLabel: "Body Fat. No current measurement. Couldn’t load this measurement.",
      featured: false,
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
      statusLabel: "",
      referenceLabel: null,
      referenceContextLabel: null,
      classificationChart: null,
      referenceBar: null,
      heightSpecificRangeLabel: null,
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat,
      addDataHref: null,
      accessibilityLabel: "Body Fat. No current measurement. Add measurement.",
      featured: false,
    };
  }

  return {
    metric: "bodyFat",
    title: "Body Fat",
    value,
    formattedValue,
    unit: "%",
    readiness: "partial",
    statusLabel: "",
    referenceLabel: null,
    referenceContextLabel: null,
    classificationChart: null,
    referenceBar: null,
    heightSpecificRangeLabel: null,
    provenance: {
      transportLabel: null,
      sourceApplicationLabel: null,
      measurementMethodLabel: "Method unknown",
      measuredAtLabel: input.measuredAtLabel,
    },
    detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat,
    addDataHref: null,
    accessibilityLabel: `Body Fat ${formattedValue}. No classification graph. Method unknown.${
      input.measuredAtLabel ? ` Measured ${input.measuredAtLabel}.` : ""
    } Open body fat details.`,
    featured: false,
  };
}

function buildLeanTissueCard(input: {
  overview: BodyMetricSummaryOverviewSlice;
  profile: BodyMetricSummaryProfileSlice;
  unit: "kg" | "lb";
  measuredAtLabel: string | null;
  seriesError: boolean;
}): BodyMetricCardModel {
  void input.profile;
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
      statusLabel: "",
      referenceLabel: null,
      referenceContextLabel: null,
      classificationChart: null,
      referenceBar: null,
      heightSpecificRangeLabel: null,
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass,
      addDataHref: null,
      accessibilityLabel: "Lean Tissue. No current measurement. Couldn’t load this measurement.",
      featured: false,
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
      statusLabel: "",
      referenceLabel: null,
      referenceContextLabel: null,
      classificationChart: null,
      referenceBar: null,
      heightSpecificRangeLabel: null,
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass,
      addDataHref: null,
      accessibilityLabel: "Lean Tissue. No current measurement. Add measurement.",
      featured: false,
    };
  }

  return {
    metric: "leanTissue",
    title: "Lean Tissue",
    value,
    formattedValue,
    unit: input.unit,
    readiness: "partial",
    statusLabel: "",
    referenceLabel: null,
    referenceContextLabel: null,
    classificationChart: null,
    referenceBar: null,
    heightSpecificRangeLabel: null,
    provenance: {
      transportLabel: null,
      sourceApplicationLabel: null,
      measurementMethodLabel: "Method unknown",
      measuredAtLabel: input.measuredAtLabel,
    },
    detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass,
    addDataHref: null,
    accessibilityLabel: `Lean Tissue ${formattedValue}. Total lean mass. No classification graph.${
      input.measuredAtLabel ? ` Measured ${input.measuredAtLabel}.` : ""
    } Open lean tissue details.`,
    featured: false,
  };
}

/** Landing copy constants for the simplified Stage 3B shell. */
export const BODY_COMPOSITION_SUMMARY_COPY = {
  pageTitle: "Body Composition",
  /** Removed from landing UI — kept null so tests can assert absence. */
  purpose: null as string | null,
  actionsTitle: "Add or connect measurements",
  moreMarkersHref: null as string | null,
  moreMarkersLabel: "More Body Composition markers",
  rangesExplainerLabel: "Learn about measurement ranges",
  historyLabel: "View measurement history",
  settingsLabel: "View Body settings",
  addWeightLabel: "Add weight",
  historyHref: "/(app)/body/list",
  settingsHref: "/(app)/body/settings",
} as const;
