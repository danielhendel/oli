/**
 * Presentation-independent Body metric standard definitions.
 * Not persisted; not a backend schema. Stage 3B standards layer only.
 */

export type BodyMetricStandardMetric =
  | "weight"
  | "bodyFatPercentage"
  | "fatMassIndex"
  | "totalLeanMass"
  | "leanMassIndex"
  | "appendicularLeanMassIndex";

export type BodyMetricClassificationPurpose =
  | "screening"
  | "clinical"
  | "populationReference"
  | "performanceReference";

export type BodyMetricSourceAuthority =
  | "government"
  | "internationalGuideline"
  | "clinicalConsensus"
  | "nationalReferenceDataset"
  | "peerReviewedModel";

export type BodyMetricStandardSexApplicability =
  | "female"
  | "male"
  | "all"
  | "standardSpecific";

export type BodyMetricStandardClassification = {
  readonly id: string;
  readonly displayLabel: string;
  /** Inclusive lower bound; null = unbounded below. */
  readonly lowerInclusive: number | null;
  /** Exclusive upper bound; null = unbounded above. */
  readonly upperExclusive: number | null;
  readonly unit: string;
};

export type BodyMetricStandardDefinition = {
  readonly standardId: string;
  readonly version: string;
  readonly metric: BodyMetricStandardMetric;
  readonly classificationPurpose: BodyMetricClassificationPurpose;
  readonly sourceAuthority: BodyMetricSourceAuthority;
  readonly sourceTitle: string;
  readonly sourceOrganization: string | null;
  readonly publicationYear: number;
  readonly citationId: string;
  readonly applicableAge: {
    readonly minimumYears: number | null;
    readonly maximumYears: number | null;
  };
  readonly applicableSex: BodyMetricStandardSexApplicability;
  readonly applicablePopulation: string;
  readonly compatibleMethods: readonly string[];
  readonly requiredInputs: readonly string[];
  readonly classifications: readonly BodyMetricStandardClassification[];
  readonly limitations: readonly string[];
  /**
   * Runtime authorization for personal classification on Body consumer UI.
   * `proposed` standards must fail closed (no personal marker).
   */
  readonly runtimeAuthorization: "approved_for_body_consumer_ui" | "proposed_human_approval_required";
};

export type BodyMetricResolvedClassificationSegment = {
  readonly id: string;
  readonly displayLabel: string;
  readonly numericRangeLabel: string | null;
  readonly unit: string;
  /** Relative start along the categorical presentation axis (0–1). */
  readonly start: number;
  /** Relative end along the categorical presentation axis (0–1). */
  readonly end: number;
  readonly tone: "cool" | "reference" | "caution" | "elevated" | "neutral" | "muted";
  readonly lowerBound: number | null;
  readonly upperBound: number | null;
  readonly lowerInclusive: boolean;
  readonly upperInclusive: boolean;
};

/**
 * Fully formed presentation model for the graph component.
 * Graph must not classify — it only renders this model.
 */
export type BodyMetricStandardPresentationModel = {
  readonly standardId: string;
  readonly standardVersion: string;
  readonly classificationPurpose: BodyMetricClassificationPurpose;
  readonly sourceTitle: string;
  readonly contextLabel: string;
  readonly segments: readonly BodyMetricResolvedClassificationSegment[];
  readonly markerPosition: number | null;
  readonly markerLabel: string | null;
  readonly classifiedId: string | null;
  /** 0–1 within classified segment for categorical placement; null when open-ended or absent. */
  readonly withinSegmentPosition: number | null;
  readonly markerFormattedValue: string | null;
  readonly accessibleSummary: string;
  readonly heightSpecificWeightRangeLabel: string | null;
};
