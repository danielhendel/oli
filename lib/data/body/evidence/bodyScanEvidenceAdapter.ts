/**
 * Verified Body Scan facts → evidence observations (pure).
 *
 * Candidates / drafts / unverified scans are excluded.
 * continuousTrendEligible is always false for scan-derived evidence.
 */

import type {
  BodyCompositionEvidenceInvalidReason,
  BodyCompositionEvidenceObservation,
  BodyCompositionMeasurementMethod,
  BodyScanDetailDto,
  BodyScanMetricDto,
  BodyScanStatus,
} from "@oli/contracts";

import { mapBodyScanMetricToEvidenceKey, bodyCompositionEvidenceMetricDefinition } from "./metricRegistry";
import { validateEvidenceValue } from "./validateEvidence";

export type BodyScanEvidenceAdapterResult = {
  observations: BodyCompositionEvidenceObservation[];
  invalidReasons: BodyCompositionEvidenceInvalidReason[];
};

const VERIFIED_STATUSES: ReadonlySet<BodyScanStatus> = new Set(["verified"]);

function mapScanMethod(method: string): BodyCompositionMeasurementMethod {
  const m = method.toLowerCase();
  if (m === "dxa") return "dxa";
  if (m === "bia") return "consumer_bia";
  if (m === "air_displacement") return "air_displacement";
  return "other";
}

function comparabilityForScanMetric(
  metricKey: string,
  region: string,
): BodyCompositionEvidenceObservation["comparabilityGroup"] {
  if (metricKey === "visceral_fat_mass" || metricKey === "visceral_fat_volume") return "dxa_vat";
  if (metricKey === "bone_mineral_density" || metricKey === "bone_mineral_content") return "dxa_bone";
  if (region !== "total") return "dxa_regional";
  return "dxa_total_composition";
}

function adaptMetric(args: {
  scan: BodyScanDetailDto;
  metric: BodyScanMetricDto;
}): BodyScanEvidenceAdapterResult {
  const out: BodyScanEvidenceAdapterResult = { observations: [], invalidReasons: [] };
  const evidenceKey = mapBodyScanMetricToEvidenceKey(args.metric.metricId);
  if (!evidenceKey) {
    // Deferred T/Z: ontology may exist on facts later; exclude from V1 evidence emit.
    if (args.metric.metricId === "t_score" || args.metric.metricId === "z_score") {
      return out;
    }
    out.invalidReasons.push("unknown_metric");
    return out;
  }
  // Future SMM: only if source-reported on a non-DXA path; DXA lean must never map here.
  if (evidenceKey === "skeletal_muscle_mass") {
    if (args.scan.method === "dxa") {
      out.invalidReasons.push("ambiguous_semantics");
      return out;
    }
  }

  const def = bodyCompositionEvidenceMetricDefinition(evidenceKey);
  const invalid = validateEvidenceValue({
    value: args.metric.value,
    unit: args.metric.unit,
    measuredAt: args.scan.performedAt,
  });
  if (invalid) {
    out.invalidReasons.push(invalid);
    return out;
  }
  if (!args.scan.performedAt) {
    out.invalidReasons.push("invalid_measured_at");
    return out;
  }

  const observationId = `scan:${args.scan.id}:${args.metric.metricId}:${args.metric.region}`;
  out.observations.push({
    observationId,
    metricKey: evidenceKey,
    region: args.metric.region,
    value: args.metric.value,
    canonicalUnit: args.metric.unit,
    measuredAt: args.scan.performedAt,
    evidenceType: "measured",
    sourceReported: true,
    source: {
      sourceSystem: "body_scan",
      measurementMethod: mapScanMethod(args.scan.method),
      deviceFamily: args.scan.deviceLabel,
      deviceModel: null,
    },
    provenance: {
      sourceFactRef: `fact_${args.scan.id}`,
      sourceEventRef: null,
      scanRef: args.scan.id,
      sourceDocumentRef: null,
      sourcePage: null,
      adapterId: null,
      adapterVersion: null,
      formulaVersion: null,
      inputObservationRefs: null,
      corrected: args.metric.corrected,
    },
    continuousTrendEligible: false,
    comparabilityGroup: comparabilityForScanMetric(evidenceKey, args.metric.region),
    recencyClass: def.recencyClass,
    constructEligibility: [...def.constructEligibility],
    redundancyGroup: def.redundancyGroup,
  });
  return out;
}

/**
 * Adapt a Body Scan detail DTO. Non-verified statuses yield no observations.
 */
export function adaptVerifiedBodyScanEvidence(
  scan: BodyScanDetailDto,
): BodyScanEvidenceAdapterResult {
  const out: BodyScanEvidenceAdapterResult = { observations: [], invalidReasons: [] };
  if (!VERIFIED_STATUSES.has(scan.status)) {
    out.invalidReasons.push("unverified_scan_excluded");
    return out;
  }
  for (const metric of scan.metrics) {
    const part = adaptMetric({ scan, metric });
    out.observations.push(...part.observations);
    out.invalidReasons.push(...part.invalidReasons);
  }
  return out;
}

export function adaptVerifiedBodyScanEvidenceMany(
  scans: readonly BodyScanDetailDto[],
): BodyScanEvidenceAdapterResult {
  const out: BodyScanEvidenceAdapterResult = { observations: [], invalidReasons: [] };
  for (const scan of scans) {
    const part = adaptVerifiedBodyScanEvidence(scan);
    out.observations.push(...part.observations);
    out.invalidReasons.push(...part.invalidReasons);
  }
  return out;
}
