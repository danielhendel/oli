/**
 * Lean Tissue — PROPOSED standards candidates (not authorized for runtime classification).
 * Oli currently surfaces total lean mass on Body overview — not ALM/ALMI.
 */

import type { BodyMetricStandardDefinition } from "@/lib/body/standards/bodyMetricStandardTypes";

export const LEAN_TISSUE_STANDARD_STATUS = "proposed_human_approval_required" as const;

/**
 * EWGSOP2 supports muscle-quantity cutoffs for appendicular constructs (ASM / ALMI),
 * not a diagnosis of sarcopenia from total lean mass alone.
 */
export const LEAN_TISSUE_EWGSOP2_CANDIDATE_NOTES = {
  candidateId: "ewgsop2-appendicular-muscle-quantity",
  sourceTitle: "Sarcopenia: revised European consensus on definition and diagnosis (EWGSOP2)",
  sourceOrganization: "EWGSOP2 / Age Ageing",
  publicationYear: 2019,
  sourceAuthority: "clinicalConsensus" as const,
  requiredConstruct: "appendicularLeanMassIndex" as const,
  exampleCutoffsDocumentedInEvidenceMatrix: {
    asmKg: { male: "<20 kg", female: "<15 kg" },
    almiKgPerM2: { male: "<7.0 kg/m²", female: "<5.5 kg/m²" },
  },
  potentialClinicalLabelsIfAuthorized: ["Low Muscle Quantity", "Not Low by This Standard"],
  limitations: [
    "Total lean tissue ≠ skeletal muscle ≠ appendicular lean mass.",
    "Do not diagnose sarcopenia from lean mass alone (strength ± performance required).",
    "Older-adult focus; not a general-consumer Excellence rail.",
    "Compatible method typically DXA (or explicitly validated BIA equation) — unknown method fails closed.",
  ],
} as const;

/**
 * NHANES DXA population-reference presentation (future) — must be labeled Population reference,
 * never Health rating / Performance rating / Optimal / Elite.
 *
 * Leadership decision gate (2026-09-20 redesign):
 * Correct construct is Lean Mass Index (total lean kg / height m²). Primary candidates are
 * Kelly et al. 2009 (NHANES/Hologic) and Imboden et al. 2017 (GE/Lunar). Exact LMS
 * coefficients/tables are not verified in-repo. Manufacturers must not be mixed. Apple Health
 * unknown-method values must not receive DXA percentiles. Runtime verdict: BLOCKED.
 */
export const LEAN_TISSUE_NHANES_POPULATION_REFERENCE_NOTES = {
  candidateId: "nhanes-dxa-lean-mass-population-reference",
  sourceAuthority: "nationalReferenceDataset" as const,
  construct: "leanMassIndex" as const,
  potentialLabelsIfAuthorized: [
    "Very Low",
    "Low",
    "Typical",
    "High",
    "Very High",
  ],
  mustLabelAs: "Population reference",
  mustNotLabelAs: ["Health rating", "Performance rating", "Optimal", "Elite", "Excellent", "Sarcopenic"],
  runtimeVerdict: "BLOCKED" as const,
  personalMarkerVerdict: "BLOCKED" as const,
  deviceManufacturerPolicy:
    "Do not mix Hologic and GE/Lunar thresholds. Do not apply DXA LMI bands to unknown-method Apple Health data.",
} as const;

export const LEAN_TISSUE_PROPOSED_STANDARD_STUB: BodyMetricStandardDefinition = {
  standardId: "lean-tissue-unresolved-v1",
  version: "proposed.0",
  metric: "totalLeanMass",
  classificationPurpose: "clinical",
  sourceAuthority: "clinicalConsensus",
  sourceTitle: "Lean tissue — unresolved pending construct + human approval",
  sourceOrganization: null,
  publicationYear: 2026,
  citationId: "stage3a-unresolved-lean-performance",
  applicableAge: { minimumYears: null, maximumYears: null },
  applicableSex: "standardSpecific",
  applicablePopulation: "Unresolved — Oli currently owns total lean mass display only",
  compatibleMethods: [],
  requiredInputs: ["leanMassKg", "measurementMethod", "sex", "ageYears", "heightCm"],
  classifications: [],
  limitations: [
    ...LEAN_TISSUE_EWGSOP2_CANDIDATE_NOTES.limitations,
    "Runtime classification blocked until construct match + standards amendment approval.",
  ],
  runtimeAuthorization: "proposed_human_approval_required",
};
