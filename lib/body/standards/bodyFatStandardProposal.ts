/**
 * Body Fat % — PROPOSED standards candidates (not authorized for runtime classification).
 * Fail closed until human approval of a versioned, method-compatible standard.
 */

import type { BodyMetricStandardDefinition } from "@/lib/body/standards/bodyMetricStandardTypes";

export const BODY_FAT_PERCENT_STANDARD_STATUS = "proposed_human_approval_required" as const;

/**
 * Recommended primary candidate after Stage 3A evidence review:
 * Gallagher et al. age- and sex-specific %BF linked to BMI categories
 * (Am J Clin Nutr 2000) — peer-reviewed model; method-sensitive.
 *
 * Exact consumer labels and cutoffs must be verified against the primary paper
 * before runtime authorization. Do not ship invented “Underfat / Healthy / Excess”
 * labels until that verification + human approval.
 */
export const BODY_FAT_GALLAGHER_CANDIDATE_NOTES = {
  candidateId: "gallagher-2000-percent-body-fat-bmi-linked",
  sourceTitle: "Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index",
  sourceOrganization: "Am J Clin Nutr (Gallagher et al.)",
  publicationYear: 2000,
  sourceAuthority: "peerReviewedModel" as const,
  methodCompatibility: ["DXA", "method-labeled composition estimates only when validated against the model’s measurement basis"],
  incompatibilities: [
    "Unknown-method Apple Health values",
    "Silent BIA↔DXA interchange",
    "Manual entry without method",
    "Universal fitness charts (ACE Essential/Athlete/Fitness/Average) as health truth",
    "Legacy ACSM/NSCA bands in lib/classifications/bodyComposition.ts (unverified for consumer v1)",
  ],
  proposedSemanticClassesPendingVerification: [
    "Below Reference",
    "Reference Range",
    "Elevated",
    "High",
  ],
  /**
   * Leadership decision gate (2026-09-20 redesign):
   * Candidate combined African American/White Gallagher table values were proposed for
   * age/sex bands, but silently assigning that table to all users is scientifically
   * unacceptable. Ethnicity/reference-population must not be inferred. No approved
   * sensitive profile field exists for reference population. Therefore personal
   * placement remains BLOCKED. Detail education may continue without ACE categories.
   */
  runtimeVerdict: "EDUCATIONAL_ONLY" as const,
  personalMarkerVerdict: "BLOCKED" as const,
  referencePopulationDecision:
    "Do not silently assign combined African American/White table as a universal default. Asian-specific values require explicit population handling. Leadership approval required before any personal placement.",
  limitations: [
    "No WHO/CDC universal body-fat percentage classification.",
    "Age- and sex-specific; population applicability must be explicit.",
    "Not an Optimal/Elite/Excellence target.",
    "Stage 3A recorded body-fat tables as UNRESOLVED — this candidate does not silently override that.",
  ],
} as const;

/**
 * Secondary candidate: NHANES DXA Fat Mass Index reference/classification models.
 * Prefer FMI when the owned construct is fat mass indexed to height² rather than %BF.
 */
export const BODY_FAT_NHANES_FMI_CANDIDATE_NOTES = {
  candidateId: "nhanes-dxa-fat-mass-index-reference",
  sourceAuthority: "nationalReferenceDataset" as const,
  construct: "fatMassIndex" as const,
  limitations: [
    "Requires fat mass + height (FMI), not interchangeable with unknown-method %BF.",
    "DXA reference cannot automatically classify BIA.",
  ],
} as const;

/** Stub definition — runtimeAuthorization is proposed; resolver must fail closed. */
export const BODY_FAT_PERCENT_PROPOSED_STANDARD_STUB: BodyMetricStandardDefinition = {
  standardId: "body-fat-percent-unresolved-v1",
  version: "proposed.0",
  metric: "bodyFatPercentage",
  classificationPurpose: "populationReference",
  sourceAuthority: "peerReviewedModel",
  sourceTitle: "Body fat percentage — unresolved pending human approval",
  sourceOrganization: null,
  publicationYear: 2026,
  citationId: "stage3a-unresolved-body-fat-tables",
  applicableAge: { minimumYears: null, maximumYears: null },
  applicableSex: "standardSpecific",
  applicablePopulation: "Unresolved",
  compatibleMethods: [],
  requiredInputs: ["bodyFatPercent", "ageYears", "sex", "measurementMethod"],
  classifications: [],
  limitations: [
    ...BODY_FAT_GALLAGHER_CANDIDATE_NOTES.limitations,
    "Runtime classification blocked until standards amendment approval.",
  ],
  runtimeAuthorization: "proposed_human_approval_required",
};
