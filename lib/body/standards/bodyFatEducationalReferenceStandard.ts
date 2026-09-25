/**
 * Body Fat — Stage 3C educational reference standard.
 *
 * Landing-card numerical screening ranges use Gallagher et al. 2000 (version 2000.1)
 * as a general educational screening reference. Personal classification markers remain
 * BLOCKED until method + reference-population eligibility pass.
 * ACE Essential/Athletic/Fitness/Average are rejected as Oli health truth.
 */

import type { BodyMetricEducationalReferenceDefinition } from "@/lib/body/standards/educationalReferenceTypes";

export const BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD_ID =
  "body-fat-educational-reference" as const;
export const BODY_FAT_EDUCATIONAL_REFERENCE_VERSION = "2026.3c.2" as const;

export const BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD: BodyMetricEducationalReferenceDefinition = {
  standardId: BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD_ID,
  version: BODY_FAT_EDUCATIONAL_REFERENCE_VERSION,
  metric: "bodyFatPercentage",
  constructLabel: "Body fat percentage",
  constructDescription:
    "Body fat percentage estimates how much of body mass is fat tissue. Fat mass (kg or lb) is a related construct when percentage can be paired with a compatible weight measurement.",
  classificationPurpose: "populationReference",
  sourceAuthority: "peerReviewedModel",
  educationalAuthorization: "approved_for_educational_reference_ui",
  personalClassificationAuthorization: "proposed_human_approval_required",
  applicablePopulation:
    "Adult ages 20–79 with Female or Male reference sex. Combined African American / White Table 4 is a general educational screening reference — not universal and not ethnicity-inferred.",
  applicableMethodsSummary:
    "Educational numerical ranges may display without placing a personal marker. Personal placement requires a known, standard-compatible measurement method. Apple Health is a transport layer, not a measurement method.",
  compatibleMethods: ["DXA", "method_labeled_validated_composition"],
  incompatibleMethods: [
    "unknown_method",
    "apple_health_transport_without_method",
    "unlabeled_manual",
    "silent_bia_dxa_interchange",
  ],
  educationalRanges: [
    {
      id: "lower",
      displayLabel: "Lower",
      meaning:
        "Educational screening concept: below the age- and reference-sex mid-range lower edge on the Gallagher BMI-equivalent table. Not an athletic claim or prescription.",
      tone: "cool",
      numericRangeLabel: null,
      lowerBound: null,
      upperBound: null,
    },
    {
      id: "mid_range",
      displayLabel: "Mid-range",
      meaning:
        "Educational screening concept: mid-range body-fat context on the Gallagher BMI-equivalent table — not a verified personal healthy target.",
      tone: "reference",
      numericRangeLabel: null,
      lowerBound: null,
      upperBound: null,
    },
    {
      id: "higher",
      displayLabel: "Higher",
      meaning:
        "Educational screening concept: at or above the source Elevated lower edge (landing card merges Elevated and Obesity-linked upper regions). Not a diagnosis.",
      tone: "elevated",
      numericRangeLabel: null,
      lowerBound: null,
      upperBound: null,
    },
  ],
  rangeMeaningSummary:
    "Landing-card numerical ranges are Gallagher et al. 2000 BMI-equivalent adult screening references (standard gallagher-4c-bmi-equivalent-body-fat-reference version 2000.1). They are not personal targets, diagnoses, or performance ratings. Personal markers remain withheld until method and reference-population eligibility pass.",
  evidenceCitations: [
    {
      citationId: "gallagher-2000-percent-body-fat-bmi-linked",
      title:
        "Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index",
      organization: "Am J Clin Nutr (Gallagher et al.)",
      publicationYear: 2000,
      role: "primary_candidate",
      note: "Approved for general educational screening reference ranges on the Body Fat card (combined African American / White Table 4, three-band landing model). Personal markers not authorized without method + reference-population eligibility.",
    },
    {
      citationId: "nhanes-dxa-fat-mass-index-reference",
      title: "NHANES DXA fat mass index / %BF population reference models",
      organization: "NHANES / CDC",
      publicationYear: null,
      role: "secondary_candidate",
      note: "Population reference when Oli owns FMI or DXA-labeled %BF. Not interchangeable with unknown-method transport values.",
    },
    {
      citationId: "ace-fitness-charts-rejected",
      title: "ACE body-fat category charts",
      organization: "ACE",
      publicationYear: null,
      role: "rejected",
      note: "Rejected as health truth for Oli consumer Body Composition.",
    },
  ],
  limitations: [
    "No WHO/CDC universal adult body-fat percentage classification is adopted.",
    "Combined African American / White Table 4 is provisional and population-sensitive; not universal; not ethnicity-inferred; separate Asian models exist in the source.",
    "Unknown-method Apple Health values cannot become device-inferred personal markers.",
    "Not a peak athletic, universal athletic, or personal rating range.",
  ],
  personalPlacementWithheldReasons: [
    "Personal placement requires a known, standard-compatible measurement method.",
    "Combined-table educational ranges are not a verified personal reference-population assignment.",
    "Apple Health transport without method labeling is not sufficient for personal classification.",
    "Commercial body-fat chart substitutes (including ACE) are not used as health truth.",
  ],
};
