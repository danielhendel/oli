/**
 * Stage 3B Body Composition educational shell — static typed content.
 * Pure model: no user classification, no I/O, no personal rail placement.
 */

import { BODY_METRIC_RANGES_EXPLAINER_HREF } from "@/lib/data/body/bodyCompositionMetricRoutes";
import type {
  BodyCompositionEducationModel,
  BodyCompositionStage3bReadiness,
} from "@/lib/body/education/bodyCompositionEducationTypes";

export const BODY_COMPOSITION_PLAN_HREF = "/(app)/(tabs)/program" as const;
export const BODY_COMPOSITION_HISTORY_HREF = "/(app)/body/list" as const;
export const BODY_COMPOSITION_CANONICAL_HREF = "/(app)/body" as const;
export const BODY_COMPOSITION_WEIGHT_ALIAS_HREF = "/(app)/body/weight" as const;

/**
 * Accepted Stage 3A purpose (product spec §12), refined for Stage 3B value-first shell.
 * Prefer non-diagnostic, non-shaming language without personal classification promises.
 */
export const BODY_COMPOSITION_EDUCATION_MODEL: BodyCompositionEducationModel = {
  pageTitle: "Body Composition",
  purpose:
    "Understand the fat and lean tissues that make up your body — and the evidence Oli has so far.",
  educationalReferenceLabel: "Educational reference",
  referenceIndependenceCopy:
    "Health protection and performance support are related, but they are not the same.",
  referencePlacementCopy:
    "Your personal position will appear only when Oli has enough compatible, method-labeled evidence.",
  dimensions: [
    {
      id: "health_protection",
      title: "Health Protection",
      leftEndpointLabel: "Higher health risk",
      rightEndpointLabel: "More health-protective profile",
      accessibilitySummary:
        "Health Protection educational reference. Ranges from higher health risk to a more health-protective profile. No personal result is available.",
    },
    {
      id: "performance_support",
      title: "Performance Support",
      leftEndpointLabel: "Lower performance support",
      rightEndpointLabel: "Stronger performance-support profile",
      accessibilitySummary:
        "Performance Support educational reference. Ranges from lower to stronger support for physical performance. No personal result is available.",
    },
  ],
  markersSectionTitle: "What determines Body Composition",
  markers: [
    {
      id: "central_adiposity",
      title: "Central Adiposity",
      meaning: "Fat distributed around the waist and abdomen.",
      whyItMatters:
        "It is a useful health-screening marker. Common evidence includes waist circumference and waist-to-height ratio. It is not a complete Body Composition assessment.",
      evidenceTierId: "screening",
      evidenceTierLabel: "Screening",
      accessibilityLabel:
        "Central Adiposity. Fat around the waist and abdomen. Screening evidence. Not a complete Body Composition assessment.",
      learnMoreHref: null,
    },
    {
      id: "body_fat",
      title: "Body Fat",
      meaning: "Fat mass or body-fat percentage.",
      whyItMatters:
        "Interpretation depends on measurement method, age, sex, and context. There is no universal excellent body-fat percentage.",
      evidenceTierId: "composition",
      evidenceTierLabel: "Composition",
      accessibilityLabel:
        "Body Fat. Fat mass or body-fat percentage. Composition evidence. No universal excellent percentage.",
      learnMoreHref: null,
    },
    {
      id: "lean_tissue",
      title: "Lean Mass",
      meaning: "Non-fat mass estimated by a supported measurement method.",
      whyItMatters:
        "Lean tissue is not identical to skeletal muscle. Adequate lean tissue supports physical function and performance context. Interpretation depends on method.",
      evidenceTierId: "composition",
      evidenceTierLabel: "Composition",
      accessibilityLabel:
        "Lean Mass. Non-fat mass. Composition evidence. Not identical to skeletal muscle.",
      learnMoreHref: null,
    },
    {
      id: "visceral_adiposity",
      title: "Visceral Adiposity",
      meaning: "Fat located around internal organs.",
      whyItMatters:
        "It requires supported advanced measurement and is not available from weight alone. Oli shows it only when a supported, method-labeled result exists.",
      evidenceTierId: "advanced",
      evidenceTierLabel: "Advanced",
      accessibilityLabel:
        "Visceral Adiposity. Fat around internal organs. Advanced evidence only when supported and method-labeled.",
      learnMoreHref: null,
    },
  ],
  evidenceSectionTitle: "Evidence levels",
  evidenceTiers: [
    {
      id: "screening",
      title: "Screening",
      description:
        "Screening can help identify important health context, but it is not a complete measurement of fat and lean tissue.",
      potentialEvidence: [
        "Height",
        "Weight",
        "Waist circumference",
        "Waist-to-height ratio",
      ],
    },
    {
      id: "composition",
      title: "Composition",
      description:
        "Composition evidence is more useful when the measurement method and source are known.",
      potentialEvidence: [
        "Body-fat percentage or fat mass",
        "Lean mass",
        "Known measurement method",
        "Observation date",
      ],
    },
    {
      id: "advanced",
      title: "Advanced",
      description:
        "Advanced evidence is shown only when Oli actually has a supported, method-labeled result.",
      potentialEvidence: [
        "DEXA/DXA",
        "Visceral adiposity",
        "Appendicular lean mass",
        "Regional composition",
      ],
    },
  ],
  readinessMissingTitle: "Your Body Composition position is not available yet",
  readinessMissingBody: "Start with a few measurements to build your baseline.",
  readinessPartialTitle: "Some Body measurements are available",
  readinessPartialBody:
    "Oli does not yet have enough compatible, method-labeled evidence to place you on the reference model.",
  baselineSectionTitle: "Build your baseline",
  baselineIntro:
    "Begin with measurements you can collect today. Weight is useful screening context, but it does not measure Body Composition by itself.",
  waistEducationTitle: "Waist (screening)",
  waistEducationBody:
    "Waist circumference and waist-to-height ratio are useful screening markers. In-app waist logging is not available yet in this release.",
  dexaEducationTitle: "Advanced scans",
  dexaEducationBody:
    "DEXA and related advanced results appear only when Oli has a supported, method-labeled import. Upload is not available in this release.",
  baselineActions: [
    {
      id: "add_weight",
      label: "Add weight",
      supportingCopy:
        "Weight is useful screening context, but it does not measure Body Composition by itself.",
      href: null,
      opensWeightLogModal: true,
    },
    {
      id: "apple_health",
      label: "Connect Apple Health",
      supportingCopy:
        "Apple Health can transport Body measurements from manual entry, scales, or other apps. The underlying measurement method may not always be available.",
      href: null,
      opensWeightLogModal: false,
    },
    {
      id: "view_history",
      label: "View measurement history",
      supportingCopy: "Review weight and body measurements already stored in Oli.",
      href: BODY_COMPOSITION_HISTORY_HREF,
      opensWeightLogModal: false,
    },
    {
      id: "ranges_explainer",
      label: "Learn about measurement ranges",
      supportingCopy: "See how existing Body metric ranges are explained in Oli.",
      href: BODY_METRIC_RANGES_EXPLAINER_HREF,
      opensWeightLogModal: false,
    },
  ],
  measurementTrustTitle: "Why the measurement method matters",
  measurementTrustPoints: [
    "Apple Health is a transport layer, not a measurement method.",
    "Different measurement methods estimate different constructs.",
    "Measurements are most useful when compared like with like.",
    "Missing method information limits interpretation.",
    "Oli will not silently combine incompatible methods into one official trend.",
  ],
  measurementTrustLearnMoreHref: BODY_METRIC_RANGES_EXPLAINER_HREF,
  measurementsSectionTitle: "Your measurements",
  measurementsSectionNote:
    "Existing values are shown for reference. They do not place you on the educational reference model.",
  influencesSectionTitle: "What influences Body Composition",
  influencesIntro:
    "Body Composition changes through the interaction of training, nutrition, activity, sleep, and recovery. These categories are tracked separately in Oli.",
  influences: [
    {
      id: "strength",
      label: "Strength",
      href: "/(app)/workouts",
      accessibilityHint: "Opens Strength",
    },
    {
      id: "nutrition",
      label: "Nutrition",
      href: "/(app)/nutrition",
      accessibilityHint: "Opens Nutrition",
    },
    {
      id: "cardio_fitness",
      label: "Cardio Fitness",
      href: "/(app)/cardio",
      accessibilityHint: "Opens Cardio Fitness",
    },
    {
      id: "activity_movement",
      label: "Activity & Movement",
      href: "/(app)/activity",
      accessibilityHint: "Opens Activity and Movement",
    },
    {
      id: "sleep",
      label: "Sleep",
      href: "/(app)/recovery/sleep",
      accessibilityHint: "Opens Sleep",
    },
    {
      id: "recovery",
      label: "Recovery",
      href: "/(app)/recovery",
      accessibilityHint: "Opens Recovery",
    },
  ],
  planBoundaryTitle: "Your plan",
  planBoundaryBody:
    "Body Composition explains what matters and what evidence is available. Individual targets and actions belong in Plan.",
  planActionLabel: "Open Plan",
  planHref: BODY_COMPOSITION_PLAN_HREF,
} as const;

/** Forbidden Stage 3B personalization tokens locked by tests. */
export const BODY_COMPOSITION_EDUCATION_FORBIDDEN_PERSONALIZATION = [
  "Body score",
  "You are here",
  "Optimized",
  "Excellence",
  "ideal body",
  "perfect weight",
  "BMI target",
] as const;

/**
 * Derive Stage 3B educational readiness from an already-approved lightweight
 * measurement-presence signal. Does not classify Health Protection or Performance Support.
 */
export function deriveBodyCompositionStage3bReadiness(input: {
  hasAnyExistingBodyMeasurement: boolean;
}): BodyCompositionStage3bReadiness {
  return input.hasAnyExistingBodyMeasurement ? "partial" : "missing";
}

/** Structural fingerprint of the educational reference — must be identical across users. */
export function getBodyCompositionReferenceFingerprint(
  model: BodyCompositionEducationModel = BODY_COMPOSITION_EDUCATION_MODEL,
): string {
  return JSON.stringify({
    label: model.educationalReferenceLabel,
    dimensions: model.dimensions.map((d) => ({
      id: d.id,
      title: d.title,
      left: d.leftEndpointLabel,
      right: d.rightEndpointLabel,
    })),
  });
}
