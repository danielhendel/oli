/**
 * Body Fat — Stage 3C educational reference standard.
 *
 * Personal classification remains PROPOSED / NOT APPROVED.
 * No Gallagher, ACE, or ACSM/NSCA numeric cutoffs are shipped as approved ranges.
 * Educational range labels are qualitative concepts only (no invented %BF thresholds).
 */

import type { BodyMetricEducationalReferenceDefinition } from "@/lib/body/standards/educationalReferenceTypes";

export const BODY_FAT_EDUCATIONAL_REFERENCE_STANDARD_ID =
  "body-fat-educational-reference" as const;
export const BODY_FAT_EDUCATIONAL_REFERENCE_VERSION = "2026.3c.1" as const;

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
    "Adult educational framing only. Age-, sex-, and method-specific consumer cutoffs are not authorized in Stage 3C.",
  applicableMethodsSummary:
    "Educational reference applies to method-labeled composition measurements (for example DXA or another explicitly validated method). Apple Health is a transport layer, not a measurement method.",
  compatibleMethods: ["DXA", "method_labeled_validated_composition"],
  incompatibleMethods: [
    "unknown_method",
    "apple_health_transport_without_method",
    "unlabeled_manual",
    "silent_bia_dxa_interchange",
  ],
  educationalRanges: [
    {
      id: "higher_adiposity_context",
      displayLabel: "Higher adiposity context",
      meaning:
        "Educational concept: relatively higher body-fat context can matter for health-protection interpretation when a verified, method-compatible standard exists.",
      tone: "elevated",
      numericRangeLabel: null,
      lowerBound: null,
      upperBound: null,
    },
    {
      id: "typical_adiposity_context",
      displayLabel: "Typical adiposity context",
      meaning:
        "Educational concept: a mid-range body-fat context relative to a future verified standard — not a universal healthy target or peak athletic claim.",
      tone: "reference",
      numericRangeLabel: null,
      lowerBound: null,
      upperBound: null,
    },
    {
      id: "lower_adiposity_context",
      displayLabel: "Lower adiposity context",
      meaning:
        "Educational concept: relatively lower body-fat context. Very low body fat is not automatically a peak athletic claim.",
      tone: "cool",
      numericRangeLabel: null,
      lowerBound: null,
      upperBound: null,
    },
  ],
  rangeMeaningSummary:
    "These ranges are educational concepts only. Oli does not map your body-fat percentage onto them until a primary-verified, method-compatible standard is approved.",
  evidenceCitations: [
    {
      citationId: "gallagher-2000-percent-body-fat-bmi-linked",
      title:
        "Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index",
      organization: "Am J Clin Nutr (Gallagher et al.)",
      publicationYear: 2000,
      role: "primary_candidate",
      note: "Primary candidate for future personal classification after primary-source verification and human approval. Not authorized for runtime personal markers in Stage 3C.",
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
    "Gallagher candidate cutoffs and consumer labels are not verified for Stage 3C runtime personal classification.",
    "Unknown-method Apple Health values cannot become device-inferred personal markers.",
    "Not a peak athletic, universal athletic, or personal rating range.",
  ],
  personalPlacementWithheldReasons: [
    "No primary-verified Body Fat personal classification standard is approved for Body consumer UI.",
    "Personal placement requires a known, standard-compatible measurement method.",
    "Apple Health transport without method labeling is not sufficient for personal classification.",
    "Commercial body-fat chart substitutes are not used as health truth.",
  ],
};
