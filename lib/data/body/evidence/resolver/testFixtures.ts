/**
 * Shared fixtures for Evidence Resolver tests.
 * Synthetic public values only — no private PHI / filenames / URLs.
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
  BodyCompositionMeasurementMethod,
  BodyCompositionEvidenceMetricKey,
} from "@oli/contracts";

export const AS_OF = "2026-06-01T00:00:00.000Z";

export function baseObservation(
  partial: Partial<BodyCompositionEvidenceObservation> &
    Pick<
      BodyCompositionEvidenceObservation,
      "observationId" | "metricKey" | "value" | "measuredAt"
    >,
): BodyCompositionEvidenceObservation {
  const metricKey = partial.metricKey;
  const method: BodyCompositionMeasurementMethod =
    partial.source?.measurementMethod ?? defaultMethod(metricKey);
  return {
    observationId: partial.observationId,
    metricKey,
    region: partial.region ?? "total",
    value: partial.value,
    canonicalUnit: partial.canonicalUnit ?? defaultUnit(metricKey),
    measuredAt: partial.measuredAt,
    evidenceType: partial.evidenceType ?? "measured",
    sourceReported: partial.sourceReported ?? true,
    source: {
      sourceSystem: partial.source?.sourceSystem ?? "body_scan",
      measurementMethod: method,
      deviceFamily: partial.source?.deviceFamily ?? null,
      deviceModel: partial.source?.deviceModel ?? null,
    },
    provenance: {
      sourceFactRef: null,
      sourceEventRef: null,
      scanRef: partial.provenance?.scanRef ?? null,
      sourceDocumentRef: null,
      sourcePage: null,
      adapterId: null,
      adapterVersion: null,
      formulaVersion: partial.provenance?.formulaVersion ?? null,
      inputObservationRefs: partial.provenance?.inputObservationRefs ?? null,
      corrected: null,
      protocolId: partial.provenance?.protocolId ?? null,
      protocolVersion: partial.provenance?.protocolVersion ?? null,
    },
    continuousTrendEligible: partial.continuousTrendEligible ?? false,
    comparabilityGroup: partial.comparabilityGroup ?? "dxa_total_composition",
    recencyClass: partial.recencyClass ?? "moderate",
    constructEligibility: partial.constructEligibility ?? [],
    redundancyGroup: partial.redundancyGroup ?? "none",
  };
}

function defaultUnit(metric: BodyCompositionEvidenceMetricKey) {
  switch (metric) {
    case "fat_percent":
      return "percent" as const;
    case "whtr":
    case "android_gynoid_ratio":
      return "ratio" as const;
    case "visceral_fat_volume":
      return "cm3" as const;
    case "fmi":
    case "ffmi":
    case "almi":
    case "bmi":
      return "kg_per_m2" as const;
    case "waist_circumference":
    case "height":
      return "cm" as const;
    case "bone_mineral_density":
      return "g_per_cm2" as const;
    default:
      return "kg" as const;
  }
}

function defaultMethod(metric: BodyCompositionEvidenceMetricKey): BodyCompositionMeasurementMethod {
  if (metric === "waist_circumference" || metric === "whtr") return "manual_anthropometry";
  if (
    metric === "visceral_fat_mass" ||
    metric === "visceral_fat_volume" ||
    metric === "android_gynoid_ratio" ||
    metric === "fat_free_mass" ||
    metric === "almi"
  ) {
    return "dxa";
  }
  return "dxa";
}

export function emptyBundle(
  overrides: Partial<BodyCompositionEvidenceBundle> = {},
): BodyCompositionEvidenceBundle {
  return {
    schemaVersion: 1,
    subjectContext: {
      sexAtBirth: null,
      dateOfBirth: null,
      height: { valueCm: null, effectiveAt: null, sourceSystem: null },
      waist: {
        valueCm: null,
        effectiveAt: null,
        sourceSystem: null,
        protocolId: null,
      },
    },
    observations: [],
    diagnostics: { invalidCount: 0, reasons: [] },
    completeness: {
      mode: "caller_supplied_partial",
      profile: "missing",
      continuousEvents: "omitted",
      verifiedScanDetails: "omitted",
    },
    ...overrides,
  };
}

export function bundleWith(
  observations: BodyCompositionEvidenceObservation[],
  overrides: Partial<BodyCompositionEvidenceBundle> = {},
): BodyCompositionEvidenceBundle {
  return emptyBundle({
    observations,
    completeness: {
      mode: "caller_supplied_partial",
      profile: "available",
      continuousEvents: "provided_nonempty",
      verifiedScanDetails: "provided_nonempty",
    },
    ...overrides,
  });
}

export function whoWaist(args: {
  id: string;
  valueCm: number;
  measuredAt: string;
}): BodyCompositionEvidenceObservation {
  return baseObservation({
    observationId: args.id,
    metricKey: "waist_circumference",
    value: args.valueCm,
    measuredAt: args.measuredAt,
    canonicalUnit: "cm",
    constructEligibility: ["H1"],
    redundancyGroup: "waist_whtr",
    comparabilityGroup: "manual_anthropometry",
    provenance: {
      sourceFactRef: null,
      sourceEventRef: null,
      scanRef: null,
      sourceDocumentRef: null,
      sourcePage: null,
      adapterId: null,
      adapterVersion: null,
      formulaVersion: null,
      inputObservationRefs: null,
      corrected: null,
      protocolId: "who_midpoint_v1",
      protocolVersion: 1,
    },
  });
}

export function unknownProtocolWaist(args: {
  id: string;
  valueCm: number;
  measuredAt: string;
}): BodyCompositionEvidenceObservation {
  return baseObservation({
    observationId: args.id,
    metricKey: "waist_circumference",
    value: args.valueCm,
    measuredAt: args.measuredAt,
    canonicalUnit: "cm",
    constructEligibility: ["H1"],
    redundancyGroup: "waist_whtr",
    comparabilityGroup: "manual_anthropometry",
    provenance: {
      sourceFactRef: null,
      sourceEventRef: null,
      scanRef: null,
      sourceDocumentRef: null,
      sourcePage: null,
      adapterId: null,
      adapterVersion: null,
      formulaVersion: null,
      inputObservationRefs: null,
      corrected: null,
      protocolId: "unknown",
      protocolVersion: null,
    },
  });
}
