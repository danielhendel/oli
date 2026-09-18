/**
 * Pure builders for Stage 3B Body metric summary cards.
 * Classification comes only from approved standards resolvers — never generic labels.
 */

import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import type {
  BodyMetricCardModel,
  BodyMetricReferenceBarModel,
} from "@/lib/body/presentation/bodyMetricCardTypes";
import {
  resolveBodyMetricStandardPresentation,
  type BodyMetricStandardResolveInput,
} from "@/lib/body/standards/resolveBodyMetricStandardPresentation";
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

function toReferenceBar(
  presentation: NonNullable<ReturnType<typeof resolveBodyMetricStandardPresentation>>,
): BodyMetricReferenceBarModel {
  return {
    segments: presentation.segments.map((s) => ({
      id: s.id,
      label: s.displayLabel,
      numericRangeLabel: s.numericRangeLabel,
      start: s.start,
      end: s.end,
      tone: s.tone,
    })),
    markerPosition: presentation.markerPosition,
    markerLabel: presentation.markerLabel,
    accessibleSummary: presentation.accessibleSummary,
    standardId: presentation.standardId,
    standardVersion: presentation.standardVersion,
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
  const referenceBar = presentation ? toReferenceBar(presentation) : null;

  if (input.seriesError) {
    return {
      metric: "weight",
      title: "Weight",
      value: null,
      formattedValue: null,
      unit: input.unit,
      readiness: "error",
      statusLabel: "Couldn’t load this measurement",
      referenceLabel: null,
      referenceContextLabel: "BMI screening (CDC / WHO)",
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
      accessibilityLabel: "Weight. Couldn’t load this measurement.",
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
      referenceLabel: presentation
        ? "Personal screening placement unavailable"
        : "Adult BMI screening not applicable",
      referenceContextLabel: presentation?.contextLabel ?? "BMI screening (CDC / WHO)",
      referenceBar,
      heightSpecificRangeLabel: null,
      provenance: {
        transportLabel: null,
        sourceApplicationLabel: null,
        measurementMethodLabel: null,
        measuredAtLabel: null,
      },
      detailHref: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight,
      addDataHref: null,
      accessibilityLabel:
        referenceBar?.accessibleSummary ??
        "Weight. No measurement yet. BMI screening reference unavailable.",
    };
  }

  const hasMarker = presentation?.markerPosition != null && presentation.markerLabel != null;

  return {
    metric: "weight",
    title: "Weight",
    value,
    formattedValue,
    unit: input.unit,
    readiness: hasMarker ? "referenceAvailable" : "partial",
    statusLabel: hasMarker
      ? (presentation!.markerLabel as string)
      : presentation == null
        ? "Adult BMI screening not applicable"
        : "Personal screening placement unavailable",
    referenceLabel: hasMarker
      ? presentation!.segments.find((s) => s.id === presentation!.classifiedId)?.numericRangeLabel ??
        null
      : "Needs height and adult age for BMI screening placement",
    referenceContextLabel: presentation?.contextLabel ?? "BMI screening (CDC / WHO)",
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
      referenceBar?.accessibleSummary ??
      `Weight ${formattedValue}. BMI screening. Open weight details.`,
  };
}

function buildBodyFatCard(input: {
  overview: BodyMetricSummaryOverviewSlice;
  profile: BodyMetricSummaryProfileSlice;
  unit: "kg" | "lb";
  measuredAtLabel: string | null;
  seriesError: boolean;
}): BodyMetricCardModel {
  const hasValue =
    input.overview.bodyFatPercent != null && Number.isFinite(input.overview.bodyFatPercent);
  const formattedValue = hasValue
    ? formatBodyFatPercent(input.overview.bodyFatPercent as number)
    : null;
  const value = hasValue ? (input.overview.bodyFatPercent as number) : null;

  // Body Fat: no runtime classification graph (standard not approved).
  if (input.seriesError) {
    return {
      metric: "bodyFat",
      title: "Body Fat",
      value: null,
      formattedValue: null,
      unit: "%",
      readiness: "error",
      statusLabel: "Couldn’t load this measurement",
      referenceLabel: null,
      referenceContextLabel: null,
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
      accessibilityLabel: "Body Fat. Couldn’t load this measurement.",
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
      referenceLabel: null,
      referenceContextLabel: null,
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
      accessibilityLabel: "Body Fat. No measurement yet. Add measurement.",
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
  };
}

function buildLeanTissueCard(input: {
  overview: BodyMetricSummaryOverviewSlice;
  profile: BodyMetricSummaryProfileSlice;
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

  // Lean Tissue: total lean mass only — no ASM/ALMI classification graph.
  if (input.seriesError) {
    return {
      metric: "leanTissue",
      title: "Lean Tissue",
      value: null,
      formattedValue: null,
      unit: input.unit,
      readiness: "error",
      statusLabel: "Couldn’t load this measurement",
      referenceLabel: null,
      referenceContextLabel: null,
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
      accessibilityLabel: "Lean Tissue. Couldn’t load this measurement.",
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
      referenceLabel: null,
      referenceContextLabel: null,
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
      accessibilityLabel: "Lean Tissue. No measurement yet. Add measurement.",
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
  };
}

/** Landing copy constants for the simplified Stage 3B shell. */
export const BODY_COMPOSITION_SUMMARY_COPY = {
  pageTitle: "Body Composition",
  purpose: "Track weight, body fat, and lean tissue.",
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
