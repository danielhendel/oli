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
import { LB_PER_KG } from "@/lib/body/bodyCompositionShared";
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
  return unit === "lb" ? kg * LB_PER_KG : kg;
}

function formatMassFaceValue(kg: number, unit: "kg" | "lb"): string {
  const v = unit === "lb" ? kg * LB_PER_KG : kg;
  const oneDecimal = v.toFixed(1);
  return oneDecimal.endsWith(".0") ? oneDecimal.slice(0, -2) : oneDecimal;
}

function mapTone(tone: string): BodyMetricClassificationTone {
  if (
    tone === "cool" ||
    tone === "reference" ||
    tone === "caution" ||
    tone === "elevated" ||
    tone === "neutral"
  ) {
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
function toReferenceBar(chart: BodyMetricClassificationChartModel): BodyMetricReferenceBarModel {
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
 * Build the three primary Stage 3B cards in order: Weight, Body Fat, Lean Mass.
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
  const displayValue = hasValue
    ? formatMassFaceValue(input.overview.weightKg as number, input.unit)
    : null;

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
  const hasMarker = classificationChart?.marker != null;

  return {
    metric: "weight",
    title: "Weight",
    value,
    formattedValue,
    displayValue,
    displayUnit: input.unit,
    unit: input.unit,
    readiness: input.seriesError
      ? "error"
      : hasMarker
        ? "referenceAvailable"
        : hasValue
          ? "partial"
          : "missing",
    statusLabel: "",
    referenceLabel: null,
    referenceContextLabel: presentation?.contextLabel ?? null,
    classificationChart: input.seriesError ? null : classificationChart,
    showUnclassifiedScaffold: false,
    unclassifiedScaffoldAccessibilityLabel: null,
    referenceBar: input.seriesError ? null : referenceBar,
    heightSpecificRangeLabel: presentation?.heightSpecificWeightRangeLabel ?? null,
    provenance: {
      transportLabel: null,
      sourceApplicationLabel: null,
      measurementMethodLabel: null,
      measuredAtLabel: input.seriesError ? null : input.measuredAtLabel,
    },
    recencyLabel: input.seriesError ? null : input.measuredAtLabel,
    detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight,
    addDataHref: null,
    accessibilityLabel: input.seriesError
      ? "Weight. No current measurement. Couldn’t load this measurement."
      : (classificationChart?.accessibleSummary ??
        (hasValue
          ? `Weight ${formattedValue}. Adult BMI screening not applicable. Open weight details.`
          : "Weight. No current measurement. Open weight details.")),
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
  const displayValue = hasValue ? (input.overview.bodyFatPercent as number).toFixed(1) : null;
  const scaffoldA11y =
    "Body Fat visual reference only. No approved classification standard. No personal marker.";

  return {
    metric: "bodyFat",
    title: "Body Fat",
    value: input.seriesError ? null : value,
    formattedValue: input.seriesError ? null : formattedValue,
    displayValue: input.seriesError ? null : displayValue,
    displayUnit: "%",
    unit: "%",
    readiness: input.seriesError ? "error" : hasValue ? "partial" : "missing",
    statusLabel: "",
    referenceLabel: null,
    referenceContextLabel: null,
    classificationChart: null,
    showUnclassifiedScaffold: !input.seriesError,
    unclassifiedScaffoldAccessibilityLabel: scaffoldA11y,
    referenceBar: null,
    heightSpecificRangeLabel: null,
    provenance: {
      transportLabel: null,
      sourceApplicationLabel: null,
      measurementMethodLabel:
        !input.seriesError && hasValue ? "Method unknown" : null,
      measuredAtLabel: input.seriesError || !hasValue ? null : input.measuredAtLabel,
    },
    recencyLabel: input.seriesError || !hasValue ? null : input.measuredAtLabel,
    detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat,
    addDataHref: null,
    accessibilityLabel: input.seriesError
      ? "Body Fat. No current measurement. Couldn’t load this measurement."
      : hasValue
        ? `Body Fat ${formattedValue}. No approved classification. Method unknown.${
            input.measuredAtLabel ? ` Measured ${input.measuredAtLabel}.` : ""
          } Open body fat details.`
        : "Body Fat. No current measurement. Add measurement.",
    featured: true,
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
  const displayValue = hasValue
    ? formatMassFaceValue(input.overview.leanBodyMassKg as number, input.unit)
    : null;
  const scaffoldA11y =
    "Lean Mass visual reference only. Total lean mass. No approved classification standard. No personal marker.";

  return {
    metric: "leanTissue",
    title: "Lean Mass",
    value: input.seriesError ? null : value,
    formattedValue: input.seriesError ? null : formattedValue,
    displayValue: input.seriesError ? null : displayValue,
    displayUnit: input.unit,
    unit: input.unit,
    readiness: input.seriesError ? "error" : hasValue ? "partial" : "missing",
    statusLabel: "",
    referenceLabel: null,
    referenceContextLabel: null,
    classificationChart: null,
    showUnclassifiedScaffold: !input.seriesError,
    unclassifiedScaffoldAccessibilityLabel: scaffoldA11y,
    referenceBar: null,
    heightSpecificRangeLabel: null,
    provenance: {
      transportLabel: null,
      sourceApplicationLabel: null,
      measurementMethodLabel:
        !input.seriesError && hasValue ? "Method unknown" : null,
      measuredAtLabel: input.seriesError || !hasValue ? null : input.measuredAtLabel,
    },
    recencyLabel: input.seriesError || !hasValue ? null : input.measuredAtLabel,
    detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass,
    addDataHref: null,
    accessibilityLabel: input.seriesError
      ? "Lean Mass. No current measurement. Couldn’t load this measurement."
      : hasValue
        ? `Lean Mass ${formattedValue}. Total lean mass. No approved classification.${
            input.measuredAtLabel ? ` Measured ${input.measuredAtLabel}.` : ""
          } Open lean mass details.`
        : "Lean Mass. No current measurement. Add measurement.",
    featured: true,
  };
}

/** Landing copy constants for the simplified Stage 3B shell. */
export const BODY_COMPOSITION_SUMMARY_COPY = {
  pageTitle: "Body Composition",
  /** Removed from landing UI — kept null so tests can assert absence. */
  purpose: null as string | null,
  /** Removed from landing — routes remain reachable via header/cards. */
  actionsTitle: null as string | null,
  moreMarkersHref: null as string | null,
  moreMarkersLabel: "More Body Composition markers",
  rangesExplainerLabel: "Learn about measurement ranges",
  historyLabel: "View measurement history",
  settingsLabel: "View Body settings",
  addWeightLabel: "Add weight",
  historyHref: "/(app)/body/list",
  settingsHref: "/(app)/body/settings",
} as const;
