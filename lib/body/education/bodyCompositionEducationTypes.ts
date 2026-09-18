/**
 * Stage 3B Body Composition educational shell — shared types only.
 * No classification, I/O, or personal placement.
 */

export type BodyCompositionEducationDimensionId =
  | "health_protection"
  | "performance_support";

export type BodyCompositionEducationMarkerId =
  | "central_adiposity"
  | "body_fat"
  | "lean_tissue"
  | "visceral_adiposity";

export type BodyCompositionEvidenceTierId = "screening" | "composition" | "advanced";

export type BodyCompositionInfluenceId =
  | "strength"
  | "nutrition"
  | "cardio_fitness"
  | "activity_movement"
  | "sleep"
  | "recovery";

export type BodyCompositionBaselineActionId =
  | "add_weight"
  | "apple_health"
  | "view_history"
  | "ranges_explainer";

/** Stage 3B may surface only educational missing/partial readiness. */
export type BodyCompositionStage3bReadiness = "missing" | "partial";

export type BodyCompositionEducationDimension = {
  readonly id: BodyCompositionEducationDimensionId;
  readonly title: string;
  readonly leftEndpointLabel: string;
  readonly rightEndpointLabel: string;
  readonly accessibilitySummary: string;
};

export type BodyCompositionEducationMarker = {
  readonly id: BodyCompositionEducationMarkerId;
  readonly title: string;
  readonly meaning: string;
  readonly whyItMatters: string;
  readonly evidenceTierId: BodyCompositionEvidenceTierId;
  readonly evidenceTierLabel: string;
  readonly accessibilityLabel: string;
  /** Only set when a real destination exists. */
  readonly learnMoreHref: string | null;
};

export type BodyCompositionEvidenceTier = {
  readonly id: BodyCompositionEvidenceTierId;
  readonly title: string;
  readonly description: string;
  readonly potentialEvidence: readonly string[];
};

export type BodyCompositionInfluenceLink = {
  readonly id: BodyCompositionInfluenceId;
  readonly label: string;
  readonly href: string;
  readonly accessibilityHint: string;
};

export type BodyCompositionBaselineAction = {
  readonly id: BodyCompositionBaselineActionId;
  readonly label: string;
  readonly supportingCopy: string;
  readonly href: string | null;
  /** Opens an in-page modal rather than a route. */
  readonly opensWeightLogModal: boolean;
};

export type BodyCompositionEducationModel = {
  readonly pageTitle: string;
  readonly purpose: string;
  readonly educationalReferenceLabel: string;
  readonly referenceIndependenceCopy: string;
  readonly referencePlacementCopy: string;
  readonly dimensions: readonly BodyCompositionEducationDimension[];
  readonly markersSectionTitle: string;
  readonly markers: readonly BodyCompositionEducationMarker[];
  readonly evidenceSectionTitle: string;
  readonly evidenceTiers: readonly BodyCompositionEvidenceTier[];
  readonly readinessMissingTitle: string;
  readonly readinessMissingBody: string;
  readonly readinessPartialTitle: string;
  readonly readinessPartialBody: string;
  readonly baselineSectionTitle: string;
  readonly baselineIntro: string;
  readonly waistEducationTitle: string;
  readonly waistEducationBody: string;
  readonly dexaEducationTitle: string;
  readonly dexaEducationBody: string;
  readonly baselineActions: readonly BodyCompositionBaselineAction[];
  readonly measurementTrustTitle: string;
  readonly measurementTrustPoints: readonly string[];
  readonly measurementTrustLearnMoreHref: string;
  readonly measurementsSectionTitle: string;
  readonly measurementsSectionNote: string;
  readonly influencesSectionTitle: string;
  readonly influencesIntro: string;
  readonly influences: readonly BodyCompositionInfluenceLink[];
  readonly planBoundaryTitle: string;
  readonly planBoundaryBody: string;
  readonly planActionLabel: string;
  readonly planHref: string;
};
