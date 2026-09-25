/**
 * Resolve Stage 3C educational reference presentation models.
 * Never attaches a personal marker. Fail closed when educational authorization is absent.
 */

import { BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD } from "@/lib/body/standards/bodyFatEducationalReferenceStandard";
import { LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD } from "@/lib/body/standards/leanMassEducationalReferenceStandard";
import { buildEducationalEvidenceSnapshot } from "@/lib/body/standards/methodProvenanceEligibility";
import type {
  BodyMetricEducationalReferenceDefinition,
  BodyMetricEducationalReferencePresentationModel,
} from "@/lib/body/standards/educationalReferenceTypes";

export type BodyMetricEducationalResolveInput = {
  readonly metric: "bodyFat" | "leanTissue";
  readonly hasMeasuredValue: boolean;
  readonly measurementMethod: string | null;
};

function buildAccessibleSummary(
  definition: BodyMetricEducationalReferenceDefinition,
  evidenceSummary: string,
): string {
  const rangeLabels = definition.educationalRanges.map((r) => r.displayLabel).join(", ");
  const withheld = definition.personalPlacementWithheldReasons[0] ?? "Personal placement is withheld.";
  return [
    `Educational reference for ${definition.constructLabel}.`,
    definition.constructDescription,
    `Educational ranges: ${rangeLabels}.`,
    definition.rangeMeaningSummary,
    `Population: ${definition.applicablePopulation}`,
    `Methods: ${definition.applicableMethodsSummary}`,
    evidenceSummary,
    withheld,
    "No personal marker is shown.",
  ].join(" ");
}

function resolveFromDefinition(
  definition: BodyMetricEducationalReferenceDefinition,
  input: BodyMetricEducationalResolveInput,
): BodyMetricEducationalReferencePresentationModel | null {
  if (definition.educationalAuthorization !== "approved_for_educational_reference_ui") {
    return null;
  }
  // Educational resolver never promotes personal classification.
  if (definition.personalClassificationAuthorization !== "proposed_human_approval_required") {
    return null;
  }
  if (definition.educationalRanges.length < 2) return null;
  if (
    definition.educationalRanges.some(
      (r) => r.numericRangeLabel != null || r.lowerBound != null || r.upperBound != null,
    )
  ) {
    // Stage 3C BF/Lean educational graphs must not invent numeric cutoffs.
    return null;
  }

  const evidence = buildEducationalEvidenceSnapshot({
    hasMeasuredValue: input.hasMeasuredValue,
    measurementMethod: input.measurementMethod,
  });

  return {
    standardId: definition.standardId,
    standardVersion: definition.version,
    badgeLabel: "Educational reference",
    constructLabel: definition.constructLabel,
    constructDescription: definition.constructDescription,
    rangeMeaningSummary: definition.rangeMeaningSummary,
    applicablePopulation: definition.applicablePopulation,
    applicableMethodsSummary: definition.applicableMethodsSummary,
    segments: definition.educationalRanges,
    evidence,
    personalPlacementWithheldReasons: definition.personalPlacementWithheldReasons,
    personalMarker: null,
    accessibleSummary: buildAccessibleSummary(definition, evidence.evidenceSummary),
  };
}

export function resolveBodyFatEducationalReferencePresentation(
  input: BodyMetricEducationalResolveInput,
): BodyMetricEducationalReferencePresentationModel | null {
  if (input.metric !== "bodyFat") return null;
  return resolveFromDefinition(BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD, input);
}

export function resolveLeanMassEducationalReferencePresentation(
  input: BodyMetricEducationalResolveInput,
): BodyMetricEducationalReferencePresentationModel | null {
  if (input.metric !== "leanTissue") return null;
  return resolveFromDefinition(LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD, input);
}

export function resolveBodyMetricEducationalReferencePresentation(
  input: BodyMetricEducationalResolveInput,
): BodyMetricEducationalReferencePresentationModel | null {
  switch (input.metric) {
    case "bodyFat":
      return resolveBodyFatEducationalReferencePresentation(input);
    case "leanTissue":
      return resolveLeanMassEducationalReferencePresentation(input);
    default:
      return null;
  }
}
