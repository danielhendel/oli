/**
 * Continuous Weight / Body Fat / Lean Mass / Waist → evidence observations (pure).
 *
 * Input is a governed RawEvent-shaped record. No Firebase. No source winner.
 * Dated waist events are distinct from undated profile waist context.
 */

import type {
  BodyCompositionEvidenceInvalidReason,
  BodyCompositionEvidenceObservation,
  BodyCompositionWaistProtocolId,
} from "@oli/contracts";

import { bodyCompositionEvidenceMetricDefinition } from "./metricRegistry";
import {
  continuousEvidenceTypeForMetric,
  resolveBodyCompositionSourceSystem,
  resolveContinuousMeasurementMethod,
} from "./sourceTaxonomy";
import { normalizeEvidenceBodyFatPercent, validateEvidenceValue } from "./validateEvidence";

export type ContinuousBodyEvidenceEventInput = {
  rawEventId: string;
  kind: "weight" | "body_composition";
  provider: string;
  sourceId?: string | null;
  /** ISO datetime or day-start ISO for measured time. */
  measuredAt: string;
  recordedAt?: string | null;
  payload: {
    weightKg?: number | null;
    bodyFatPercent?: number | null;
    leanBodyMassKg?: number | null;
    waistCircumferenceCm?: number | null;
    protocolId?: BodyCompositionWaistProtocolId | null;
    protocolVersion?: number | null;
  };
  deviceFamily?: string | null;
  deviceModel?: string | null;
  /** Optional free-form method label from device metadata. */
  measurementMethodLabel?: string | null;
  /** Correction provenance when the source event is a correction. */
  corrected?: boolean | null;
};

export type ContinuousAdapterResult = {
  observations: BodyCompositionEvidenceObservation[];
  invalidReasons: BodyCompositionEvidenceInvalidReason[];
};

function emptyProvenance(
  eventRef: string,
  extras?: {
    protocolId?: BodyCompositionWaistProtocolId | null;
    protocolVersion?: number | null;
    corrected?: boolean | null;
  },
) {
  return {
    sourceFactRef: null,
    sourceEventRef: eventRef,
    scanRef: null,
    sourceDocumentRef: null,
    sourcePage: null,
    adapterId: null,
    adapterVersion: null,
    formulaVersion: null,
    inputObservationRefs: null,
    corrected: extras?.corrected ?? null,
    protocolId: extras?.protocolId ?? null,
    protocolVersion: extras?.protocolVersion ?? null,
  };
}

function pushMetric(
  out: ContinuousAdapterResult,
  args: {
    event: ContinuousBodyEvidenceEventInput;
    metric: "body_mass" | "fat_percent" | "lean_mass" | "waist_circumference";
    value: number;
    unit: "kg" | "percent" | "cm";
  },
): void {
  const sourceSystem = resolveBodyCompositionSourceSystem(
    args.event.sourceId ?? args.event.provider,
  );
  const method = resolveContinuousMeasurementMethod({
    sourceSystem,
    metric: args.metric,
    ...(args.event.measurementMethodLabel !== undefined
      ? { explicitMethod: args.event.measurementMethodLabel }
      : {}),
  });
  const evidenceType = continuousEvidenceTypeForMetric({ metric: args.metric, method });
  const def = bodyCompositionEvidenceMetricDefinition(
    args.metric === "body_mass" ? "body_mass" : args.metric,
  );

  const invalid = validateEvidenceValue({
    value: args.value,
    unit: args.unit,
    measuredAt: args.event.measuredAt,
  });
  if (invalid) {
    out.invalidReasons.push(invalid);
    return;
  }

  const observationId = `cont:${args.event.rawEventId}:${args.metric}:total`;
  const comparabilityGroup =
    args.metric === "waist_circumference"
      ? "manual_anthropometry"
      : args.metric === "body_mass"
        ? "continuous_scale_weight"
        : method === "consumer_bia" || method === "segmental_bia"
          ? "consumer_bia_composition"
          : sourceSystem === "manual"
            ? "manual_composition"
            : "unknown";

  const protocolId =
    args.metric === "waist_circumference"
      ? args.event.payload.protocolId === "who_midpoint_v1" ||
        args.event.payload.protocolId === "unknown"
        ? args.event.payload.protocolId
        : sourceSystem === "manual"
          ? ("who_midpoint_v1" as const)
          : ("unknown" as const)
      : null;
  const protocolVersion =
    args.metric === "waist_circumference"
      ? typeof args.event.payload.protocolVersion === "number" &&
        Number.isFinite(args.event.payload.protocolVersion) &&
        args.event.payload.protocolVersion > 0
        ? Math.trunc(args.event.payload.protocolVersion)
        : protocolId === "who_midpoint_v1"
          ? 1
          : null
      : null;

  out.observations.push({
    observationId,
    metricKey: args.metric === "body_mass" ? "body_mass" : args.metric,
    region: args.metric === "waist_circumference" ? null : "total",
    value: args.value,
    canonicalUnit: args.unit,
    measuredAt: args.event.measuredAt,
    evidenceType,
    sourceReported: true,
    source: {
      sourceSystem,
      measurementMethod: method,
      deviceFamily: args.event.deviceFamily ?? null,
      deviceModel: args.event.deviceModel ?? null,
    },
    provenance: emptyProvenance(args.event.rawEventId, {
      protocolId,
      protocolVersion,
      corrected: args.event.corrected ?? null,
    }),
    continuousTrendEligible:
      args.metric === "waist_circumference" ? true : def.continuousTrendEligibleDefault,
    comparabilityGroup,
    recencyClass: def.recencyClass,
    constructEligibility: [...def.constructEligibility],
    redundancyGroup: def.redundancyGroup,
  });
}

/**
 * Adapt one continuous body RawEvent into zero or more evidence observations.
 * Never maps leanBodyMassKg to fat_free_mass or skeletal_muscle_mass.
 * Never fabricates measuredAt for missing waist timestamps.
 */
export function adaptContinuousBodyEvidenceEvent(
  event: ContinuousBodyEvidenceEventInput,
): ContinuousAdapterResult {
  const out: ContinuousAdapterResult = { observations: [], invalidReasons: [] };
  if (!event.rawEventId?.trim()) {
    out.invalidReasons.push("unknown_metric");
    return out;
  }

  const { payload } = event;
  if (payload.weightKg != null) {
    pushMetric(out, {
      event,
      metric: "body_mass",
      value: payload.weightKg,
      unit: "kg",
    });
  }
  if (payload.bodyFatPercent != null) {
    const normalized = normalizeEvidenceBodyFatPercent(payload.bodyFatPercent);
    if (normalized == null) {
      out.invalidReasons.push("invalid_percent");
    } else {
      pushMetric(out, {
        event,
        metric: "fat_percent",
        value: normalized,
        unit: "percent",
      });
    }
  }
  if (payload.leanBodyMassKg != null) {
    // Apple Health / continuous "lean body mass" → lean_mass (not FFM, not SMM).
    pushMetric(out, {
      event,
      metric: "lean_mass",
      value: payload.leanBodyMassKg,
      unit: "kg",
    });
  }
  if (payload.waistCircumferenceCm != null) {
    pushMetric(out, {
      event,
      metric: "waist_circumference",
      value: payload.waistCircumferenceCm,
      unit: "cm",
    });
  }
  return out;
}

export function adaptContinuousBodyEvidenceEvents(
  events: readonly ContinuousBodyEvidenceEventInput[],
): ContinuousAdapterResult {
  const out: ContinuousAdapterResult = { observations: [], invalidReasons: [] };
  for (const event of events) {
    const part = adaptContinuousBodyEvidenceEvent(event);
    out.observations.push(...part.observations);
    out.invalidReasons.push(...part.invalidReasons);
  }
  return out;
}
