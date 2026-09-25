/**
 * Stage 3C educational reference graph models.
 * Educational only — never carries a personal classification marker.
 */

import type {
  BodyMetricClassificationPurpose,
  BodyMetricSourceAuthority,
  BodyMetricStandardMetric,
} from "@/lib/body/standards/bodyMetricStandardTypes";
import type { BodyMetricClassificationTone } from "@/lib/ui/theme/bodyMetricClassificationChrome";

/** Authorization for educational (non-personal) reference presentation. */
export type BodyMetricEducationalAuthorization =
  | "approved_for_educational_reference_ui"
  | "not_authorized";

/**
 * Qualitative educational range — no invented numeric cutoffs.
 * Bounds stay null until a primary-verified personal standard is approved.
 */
export type BodyMetricEducationalRangeSegment = {
  readonly id: string;
  readonly displayLabel: string;
  /** Meaning of this educational concept — not a personal class. */
  readonly meaning: string;
  readonly tone: BodyMetricClassificationTone;
  /** Always null for Stage 3C BF/Lean educational graphs (no unverified cutoffs). */
  readonly numericRangeLabel: null;
  readonly lowerBound: null;
  readonly upperBound: null;
};

export type BodyMetricEvidenceCitation = {
  readonly citationId: string;
  readonly title: string;
  readonly organization: string | null;
  readonly publicationYear: number | null;
  readonly role: "primary_candidate" | "secondary_candidate" | "rejected" | "construct_note";
  readonly note: string;
};

/**
 * Versioned educational standard definition.
 * Distinct from personal-classification `BodyMetricStandardDefinition`.
 */
export type BodyMetricEducationalReferenceDefinition = {
  readonly standardId: string;
  readonly version: string;
  readonly metric: BodyMetricStandardMetric;
  readonly constructLabel: string;
  readonly constructDescription: string;
  readonly classificationPurpose: BodyMetricClassificationPurpose;
  readonly sourceAuthority: BodyMetricSourceAuthority;
  readonly educationalAuthorization: BodyMetricEducationalAuthorization;
  /**
   * Personal classification remains blocked independently.
   * Educational graphs must not flip this to approved.
   */
  readonly personalClassificationAuthorization: "proposed_human_approval_required";
  readonly applicablePopulation: string;
  readonly applicableMethodsSummary: string;
  readonly compatibleMethods: readonly string[];
  readonly incompatibleMethods: readonly string[];
  readonly educationalRanges: readonly BodyMetricEducationalRangeSegment[];
  readonly rangeMeaningSummary: string;
  readonly evidenceCitations: readonly BodyMetricEvidenceCitation[];
  readonly limitations: readonly string[];
  readonly personalPlacementWithheldReasons: readonly string[];
};

export type BodyMetricEducationalEvidenceSnapshot = {
  readonly hasMeasuredValue: boolean;
  readonly measurementMethodLabel: string | null;
  readonly methodKnown: boolean;
  readonly methodCompatibleWithEducationalReference: boolean;
  readonly evidenceSummary: string;
};

/**
 * Fully formed educational presentation model.
 * UI must not classify — it only renders this model.
 * `personalMarker` is always null by construction.
 */
export type BodyMetricEducationalReferencePresentationModel = {
  readonly standardId: string;
  readonly standardVersion: string;
  readonly badgeLabel: "Educational reference";
  readonly constructLabel: string;
  readonly constructDescription: string;
  readonly rangeMeaningSummary: string;
  readonly applicablePopulation: string;
  readonly applicableMethodsSummary: string;
  readonly segments: readonly BodyMetricEducationalRangeSegment[];
  readonly evidence: BodyMetricEducationalEvidenceSnapshot;
  readonly personalPlacementWithheldReasons: readonly string[];
  readonly personalMarker: null;
  readonly accessibleSummary: string;
};
