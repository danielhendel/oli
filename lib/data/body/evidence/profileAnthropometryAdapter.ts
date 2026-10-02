/**
 * Profile anthropometry → optional evidence observations (pure).
 *
 * Height/waist live primarily in subjectContext. Observations are emitted only
 * when an effective timestamp is available (no invented measuredAt).
 */

import type {
  BodyCompositionEvidenceInvalidReason,
  BodyCompositionEvidenceObservation,
  BodyCompositionSubjectContext,
} from "@oli/contracts";

import { bodyCompositionEvidenceMetricDefinition } from "./metricRegistry";
import { validateEvidenceValue } from "./validateEvidence";

export type ProfileAnthropometryAdapterResult = {
  observations: BodyCompositionEvidenceObservation[];
  invalidReasons: BodyCompositionEvidenceInvalidReason[];
};

function emptyProv() {
  return {
    sourceFactRef: "profile/main",
    sourceEventRef: null,
    scanRef: null,
    sourceDocumentRef: null,
    sourcePage: null,
    adapterId: null,
    adapterVersion: null,
    formulaVersion: null,
    inputObservationRefs: null,
    corrected: null,
  };
}

export function adaptProfileAnthropometryEvidence(
  subject: BodyCompositionSubjectContext,
): ProfileAnthropometryAdapterResult {
  const out: ProfileAnthropometryAdapterResult = { observations: [], invalidReasons: [] };

  if (subject.height.valueCm != null && subject.height.effectiveAt) {
    const invalid = validateEvidenceValue({
      value: subject.height.valueCm,
      unit: "cm",
      measuredAt: subject.height.effectiveAt,
    });
    if (invalid) out.invalidReasons.push(invalid);
    else {
      const def = bodyCompositionEvidenceMetricDefinition("height");
      out.observations.push({
        observationId: `profile:height:total`,
        metricKey: "height",
        region: null,
        value: subject.height.valueCm,
        canonicalUnit: "cm",
        measuredAt: subject.height.effectiveAt,
        evidenceType: "measured",
        sourceReported: true,
        source: {
          sourceSystem: "manual",
          measurementMethod: "manual_anthropometry",
          deviceFamily: null,
          deviceModel: null,
        },
        provenance: emptyProv(),
        continuousTrendEligible: false,
        comparabilityGroup: "profile_anthropometry",
        recencyClass: def.recencyClass,
        constructEligibility: [...def.constructEligibility],
        redundancyGroup: def.redundancyGroup,
      });
    }
  }

  if (subject.waist.valueCm != null && subject.waist.effectiveAt) {
    const invalid = validateEvidenceValue({
      value: subject.waist.valueCm,
      unit: "cm",
      measuredAt: subject.waist.effectiveAt,
    });
    if (invalid) out.invalidReasons.push(invalid);
    else {
      const def = bodyCompositionEvidenceMetricDefinition("waist_circumference");
      out.observations.push({
        observationId: `profile:waist_circumference:total`,
        metricKey: "waist_circumference",
        region: null,
        value: subject.waist.valueCm,
        canonicalUnit: "cm",
        measuredAt: subject.waist.effectiveAt,
        evidenceType: "measured",
        sourceReported: true,
        source: {
          sourceSystem: "manual",
          measurementMethod: "manual_anthropometry",
          deviceFamily: null,
          deviceModel: null,
        },
        provenance: emptyProv(),
        continuousTrendEligible: false,
        comparabilityGroup: "manual_anthropometry",
        recencyClass: def.recencyClass,
        constructEligibility: [...def.constructEligibility],
        redundancyGroup: def.redundancyGroup,
      });
    }
  }

  return out;
}
