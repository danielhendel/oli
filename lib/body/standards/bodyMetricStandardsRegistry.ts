/**
 * Typed versioned Body metric standards registry (in-repo modules).
 * Durable persistence location remains UNRESOLVED — no Firestore path.
 */

import { CDC_WHO_ADULT_BMI_SCREENING_STANDARD } from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";
import { BODY_FAT_PERCENT_PROPOSED_STANDARD_STUB } from "@/lib/body/standards/bodyFatStandardProposal";
import { LEAN_TISSUE_PROPOSED_STANDARD_STUB } from "@/lib/body/standards/leanTissueStandardProposal";
import { BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD } from "@/lib/body/standards/bodyFatEducationalReferenceStandard";
import { LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD } from "@/lib/body/standards/leanMassEducationalReferenceStandard";
import type { BodyMetricStandardDefinition } from "@/lib/body/standards/bodyMetricStandardTypes";
import type { BodyMetricEducationalReferenceDefinition } from "@/lib/body/standards/educationalReferenceTypes";

export type BodyMetricRegistryPersonalEntry = {
  readonly kind: "personal_classification";
  readonly definition: BodyMetricStandardDefinition;
};

export type BodyMetricRegistryEducationalEntry = {
  readonly kind: "educational_reference";
  readonly definition: BodyMetricEducationalReferenceDefinition;
};

export type BodyMetricRegistryEntry =
  | BodyMetricRegistryPersonalEntry
  | BodyMetricRegistryEducationalEntry;

const PERSONAL_STANDARDS: readonly BodyMetricStandardDefinition[] = [
  CDC_WHO_ADULT_BMI_SCREENING_STANDARD,
  BODY_FAT_PERCENT_PROPOSED_STANDARD_STUB,
  LEAN_TISSUE_PROPOSED_STANDARD_STUB,
];

const EDUCATIONAL_STANDARDS: readonly BodyMetricEducationalReferenceDefinition[] = [
  BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD,
  LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD,
];

export function listBodyMetricPersonalStandards(): readonly BodyMetricStandardDefinition[] {
  return PERSONAL_STANDARDS;
}

export function listBodyMetricEducationalStandards(): readonly BodyMetricEducationalReferenceDefinition[] {
  return EDUCATIONAL_STANDARDS;
}

export function listBodyMetricStandardsRegistry(): readonly BodyMetricRegistryEntry[] {
  return [
    ...PERSONAL_STANDARDS.map(
      (definition): BodyMetricRegistryPersonalEntry => ({
        kind: "personal_classification",
        definition,
      }),
    ),
    ...EDUCATIONAL_STANDARDS.map(
      (definition): BodyMetricRegistryEducationalEntry => ({
        kind: "educational_reference",
        definition,
      }),
    ),
  ];
}

export function getBodyMetricPersonalStandard(
  standardId: string,
  version?: string,
): BodyMetricStandardDefinition | null {
  const match = PERSONAL_STANDARDS.find((s) => {
    if (s.standardId !== standardId) return false;
    if (version != null && s.version !== version) return false;
    return true;
  });
  return match ?? null;
}

export function getBodyMetricEducationalStandard(
  standardId: string,
  version?: string,
): BodyMetricEducationalReferenceDefinition | null {
  const match = EDUCATIONAL_STANDARDS.find((s) => {
    if (s.standardId !== standardId) return false;
    if (version != null && s.version !== version) return false;
    return true;
  });
  return match ?? null;
}

/** Approved personal classification standards only (Weight BMI today). */
export function listApprovedPersonalClassificationStandards(): readonly BodyMetricStandardDefinition[] {
  return PERSONAL_STANDARDS.filter((s) => s.runtimeAuthorization === "approved_for_body_consumer_ui");
}
