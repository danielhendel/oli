/**
 * Lean Mass — Stage 3C educational reference standard.
 *
 * Owned construct today: total lean body mass (`leanBodyMassKg`).
 * Not ALM / ALMI / skeletal muscle. EWGSOP2 cutoffs must not be applied to total lean.
 * Personal classification remains PROPOSED / NOT APPROVED.
 */

import type { BodyMetricEducationalReferenceDefinition } from "@/lib/body/standards/educationalReferenceTypes";

export const LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD_ID =
  "lean-mass-educational-reference" as const;
export const LEAN_MASS_EDUCATIONAL_REFERENCE_VERSION = "2026.3c.1" as const;

export const LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD: BodyMetricEducationalReferenceDefinition = {
  standardId: LEAN_MASS_EDUCATIONAL_REFERENCE_STANDARD_ID,
  version: LEAN_MASS_EDUCATIONAL_REFERENCE_VERSION,
  metric: "totalLeanMass",
  constructLabel: "Total lean mass",
  constructDescription:
    "Total lean mass (lean body mass) is non-fat mass estimated by a supported measurement method. It is not identical to skeletal muscle or to limb-specific lean constructs used in some clinical screening pathways.",
  classificationPurpose: "populationReference",
  sourceAuthority: "clinicalConsensus",
  educationalAuthorization: "approved_for_educational_reference_ui",
  personalClassificationAuthorization: "proposed_human_approval_required",
  applicablePopulation:
    "Adult educational framing for total lean mass display. Clinical muscle-quantity cutoffs for limb-specific constructs are out of Stage 3C scope.",
  applicableMethodsSummary:
    "Educational reference discusses total lean mass as currently owned in Oli. Clinical limb-specific lean pathways require advanced method-labeled measurement — not total lean alone.",
  compatibleMethods: ["DXA", "method_labeled_validated_composition"],
  incompatibleMethods: [
    "unknown_method",
    "apple_health_transport_without_method",
    "unlabeled_manual",
    "total_lean_as_almi",
    "total_lean_as_ewgsop2_asm",
  ],
  educationalRanges: [
    {
      id: "lower_lean_mass_context",
      displayLabel: "Lower lean-mass context",
      meaning:
        "Educational concept: relatively lower total lean mass context. This is not a clinical muscle-disease label and not a limb-specific low-quantity cutoff.",
      tone: "caution",
      numericRangeLabel: null,
      lowerBound: null,
      upperBound: null,
    },
    {
      id: "typical_lean_mass_context",
      displayLabel: "Typical lean-mass context",
      meaning:
        "Educational concept: a mid-range total lean mass context relative to a future verified population or clinical standard — not a peak athletic rating.",
      tone: "reference",
      numericRangeLabel: null,
      lowerBound: null,
      upperBound: null,
    },
    {
      id: "higher_lean_mass_context",
      displayLabel: "Higher lean-mass context",
      meaning:
        "Educational concept: relatively higher total lean mass context. Higher lean mass does not erase central-adiposity health context.",
      tone: "cool",
      numericRangeLabel: null,
      lowerBound: null,
      upperBound: null,
    },
  ],
  rangeMeaningSummary:
    "These ranges are educational concepts for total lean mass only. Oli does not map your lean mass onto clinical limb-specific cutoffs or population peak labels in Stage 3C.",
  evidenceCitations: [
    {
      citationId: "ewgsop2-appendicular-muscle-quantity",
      title: "Sarcopenia: revised European consensus on definition and diagnosis (EWGSOP2)",
      organization: "EWGSOP2 / Age Ageing",
      publicationYear: 2019,
      role: "primary_candidate",
      note: "Supports appendicular muscle-quantity constructs (ASM/ALMI), not total lean mass alone. Not authorized for Stage 3C personal markers on total lean.",
    },
    {
      citationId: "nhanes-dxa-lean-mass-population-reference",
      title: "NHANES DXA lean mass / LMI population reference",
      organization: "NHANES / CDC",
      publicationYear: null,
      role: "secondary_candidate",
      note: "Future population-reference presentation must be labeled Population reference — never a health rating, performance rating, or peak athletic claim.",
    },
    {
      citationId: "total-lean-not-almi",
      title: "Total lean mass versus appendicular lean mass index",
      organization: null,
      publicationYear: null,
      role: "construct_note",
      note: "Oli’s owned Body overview construct is total lean mass. Do not infer ALM/ALMI or diagnose clinical muscle disease from total lean alone.",
    },
  ],
  limitations: [
    "Total lean tissue is not skeletal muscle and is not limb-specific lean mass.",
    "Clinical ASM/ALMI cutoffs must not be applied to Apple Health or total lean mass.",
    "Clinical muscle-disease labeling requires strength and performance context — not lean mass alone.",
    "Not a peak athletic or personal performance rating rail.",
  ],
  personalPlacementWithheldReasons: [
    "No approved personal classification standard exists for total lean mass on Body consumer UI.",
    "Clinical limb-specific lean cutoffs require constructs Oli does not currently own on Body overview.",
    "Personal placement requires a known, standard-compatible measurement method.",
    "Unknown-method transport values cannot authorize clinical or population personal markers.",
  ],
};
