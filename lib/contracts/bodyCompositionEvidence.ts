/**
 * Canonical Body Composition Evidence contracts (derived view).
 *
 * Source facts remain authoritative. This module defines the typed bridge output
 * only — no persistence, no resolver, no confidence, no scores.
 */

import { z } from "zod";

import { bodyScanMetricIdSchema, bodyScanRegionSchema } from "./bodyScans";
import { profileSexAtBirthSchema } from "./userProfileMain";

/** Broader evidence metrics — extends Body Scan keys with anthropometry / calculated indices. */
export const bodyCompositionEvidenceMetricKeySchema = z.enum([
  // Anthropometry
  "height",
  "body_mass",
  "waist_circumference",
  // Total / regional composition (shared with Body Scan registry where applicable)
  "total_mass",
  "fat_percent",
  "fat_mass",
  "lean_mass",
  "fat_free_mass",
  "bone_mineral_content",
  // Central / distribution
  "visceral_fat_mass",
  "visceral_fat_volume",
  "android_gynoid_ratio",
  // Bone
  "bone_mineral_density",
  // Future source-reported
  "skeletal_muscle_mass",
  // Calculated indices (formula helpers only — not auto-emitted by the bridge)
  "bmi",
  "whtr",
  "fmi",
  "ffmi",
  "almi",
]);

export type BodyCompositionEvidenceMetricKey = z.infer<
  typeof bodyCompositionEvidenceMetricKeySchema
>;

export const bodyCompositionEvidenceTypeSchema = z.enum(["measured", "calculated", "estimated"]);
export type BodyCompositionEvidenceType = z.infer<typeof bodyCompositionEvidenceTypeSchema>;

export const bodyCompositionSourceSystemSchema = z.enum([
  "apple_health",
  "withings",
  "manual",
  "body_scan",
  "imported_document",
  "unknown",
]);
export type BodyCompositionSourceSystem = z.infer<typeof bodyCompositionSourceSystemSchema>;

export const bodyCompositionMeasurementMethodSchema = z.enum([
  "scale_weight",
  "manual_anthropometry",
  "consumer_bia",
  "segmental_bia",
  "dxa",
  "air_displacement",
  "other",
  "unknown",
]);
export type BodyCompositionMeasurementMethod = z.infer<
  typeof bodyCompositionMeasurementMethodSchema
>;

export const bodyCompositionRecencyClassSchema = z.enum([
  "fast",
  "moderate",
  "slow",
  "very_slow",
]);
export type BodyCompositionRecencyClass = z.infer<typeof bodyCompositionRecencyClassSchema>;

export const bodyCompositionComparabilityGroupSchema = z.enum([
  "continuous_scale_weight",
  "consumer_bia_composition",
  "manual_composition",
  "manual_anthropometry",
  "dxa_total_composition",
  "dxa_vat",
  "dxa_regional",
  "dxa_bone",
  "profile_anthropometry",
  "unknown",
]);
export type BodyCompositionComparabilityGroup = z.infer<
  typeof bodyCompositionComparabilityGroupSchema
>;

export const bodyCompositionRedundancyGroupSchema = z.enum([
  "weight_body_mass",
  "waist_whtr",
  "bf_fat_mass_fmi",
  "lean_ffm_ffmi",
  "appendicular_lean_almi",
  "central_adiposity_vat",
  "bone",
  "none",
]);
export type BodyCompositionRedundancyGroup = z.infer<typeof bodyCompositionRedundancyGroupSchema>;

/** Soft construct tags only — never weights. Reuses Body Scan scoring construct ids. */
export const bodyCompositionConstructIdSchema = z.enum([
  "H1",
  "H2",
  "H3",
  "H4",
  "P1",
  "P2",
  "P3",
]);
export type BodyCompositionConstructId = z.infer<typeof bodyCompositionConstructIdSchema>;

export const bodyCompositionEvidenceUnitSchema = z.enum([
  "kg",
  "lb",
  "g",
  "percent",
  "ratio",
  "g_per_cm2",
  "cm3",
  "score",
  "cm",
  "kg_per_m2",
]);
export type BodyCompositionEvidenceUnit = z.infer<typeof bodyCompositionEvidenceUnitSchema>;

export const bodyCompositionEvidenceSourceSchema = z
  .object({
    sourceSystem: bodyCompositionSourceSystemSchema,
    measurementMethod: bodyCompositionMeasurementMethodSchema,
    deviceFamily: z.string().min(1).max(120).nullable(),
    deviceModel: z.string().min(1).max(120).nullable(),
  })
  .strip();

export const bodyCompositionWaistProtocolIdSchema = z.enum(["who_midpoint_v1", "unknown"]);
export type BodyCompositionWaistProtocolId = z.infer<typeof bodyCompositionWaistProtocolIdSchema>;

export const bodyCompositionEvidenceProvenanceSchema = z
  .object({
    sourceFactRef: z.string().min(1).max(200).nullable(),
    sourceEventRef: z.string().min(1).max(200).nullable(),
    scanRef: z.string().min(1).max(200).nullable(),
    /** Opaque document id only — never a storage path or filename. */
    sourceDocumentRef: z.string().min(1).max(200).nullable(),
    sourcePage: z.number().int().positive().nullable(),
    adapterId: z.string().min(1).max(120).nullable(),
    adapterVersion: z.string().min(1).max(40).nullable(),
    formulaVersion: z.string().min(1).max(40).nullable(),
    inputObservationRefs: z.array(z.string().min(1).max(200)).nullable(),
    corrected: z.boolean().nullable(),
    /** Waist protocol identity when known (source observations only). */
    protocolId: bodyCompositionWaistProtocolIdSchema.nullable().optional(),
    protocolVersion: z.number().int().positive().nullable().optional(),
  })
  .strip();

export const bodyCompositionEvidenceObservationSchema = z
  .object({
    observationId: z.string().min(1).max(240),
    metricKey: bodyCompositionEvidenceMetricKeySchema,
    /** Null for whole-body anthropometry that is not region-scoped. */
    region: bodyScanRegionSchema.nullable(),
    value: z.number().finite(),
    canonicalUnit: bodyCompositionEvidenceUnitSchema,
    measuredAt: z.string().min(1),
    evidenceType: bodyCompositionEvidenceTypeSchema,
    sourceReported: z.boolean(),
    source: bodyCompositionEvidenceSourceSchema,
    provenance: bodyCompositionEvidenceProvenanceSchema,
    continuousTrendEligible: z.boolean(),
    comparabilityGroup: bodyCompositionComparabilityGroupSchema,
    recencyClass: bodyCompositionRecencyClassSchema,
    constructEligibility: z.array(bodyCompositionConstructIdSchema),
    redundancyGroup: bodyCompositionRedundancyGroupSchema,
  })
  .strip()
  .superRefine((obs, ctx) => {
    if (obs.evidenceType === "calculated") {
      if (!obs.provenance.formulaVersion) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "calculated evidence requires formulaVersion",
          path: ["provenance", "formulaVersion"],
        });
      }
      if (!obs.provenance.inputObservationRefs || obs.provenance.inputObservationRefs.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "calculated evidence requires inputObservationRefs",
          path: ["provenance", "inputObservationRefs"],
        });
      }
    }
  });

export type BodyCompositionEvidenceObservation = z.infer<
  typeof bodyCompositionEvidenceObservationSchema
>;

export const bodyCompositionHeightContextSchema = z
  .object({
    valueCm: z.number().finite().positive().nullable(),
    effectiveAt: z.string().min(1).nullable(),
    sourceSystem: bodyCompositionSourceSystemSchema.nullable(),
  })
  .strip();

export const bodyCompositionWaistContextSchema = z
  .object({
    valueCm: z.number().finite().positive().nullable(),
    effectiveAt: z.string().min(1).nullable(),
    sourceSystem: bodyCompositionSourceSystemSchema.nullable(),
    /**
     * WHO midpoint protocol when known; null if unspecified.
     * Legacy undated profile waist remains protocolId null.
     * Product capture id is who_midpoint_v1 (WHO midpoint, relaxed, end-expiration).
     */
    protocolId: bodyCompositionWaistProtocolIdSchema.nullable(),
  })
  .strip();

/**
 * Subject context for future interpretation — distinct from measurement observations.
 * Ethnicity is intentionally absent (not in V1 scoring/evidence).
 */
export const bodyCompositionSubjectContextSchema = z
  .object({
    sexAtBirth: profileSexAtBirthSchema.nullable(),
    /** Governed profile DOB only — never copied from scan reports. */
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    height: bodyCompositionHeightContextSchema,
    waist: bodyCompositionWaistContextSchema,
  })
  .strip();

export type BodyCompositionSubjectContext = z.infer<typeof bodyCompositionSubjectContextSchema>;

export const bodyCompositionEvidenceInvalidReasonSchema = z.enum([
  "nan_or_infinite",
  "negative_mass",
  "negative_length",
  "invalid_percent",
  "invalid_measured_at",
  "unsupported_unit",
  "unknown_metric",
  "candidate_excluded",
  "unverified_scan_excluded",
  "ambiguous_semantics",
]);

export type BodyCompositionEvidenceInvalidReason = z.infer<
  typeof bodyCompositionEvidenceInvalidReasonSchema
>;

export const bodyCompositionEvidenceDiagnosticsSchema = z
  .object({
    invalidCount: z.number().int().nonnegative(),
    reasons: z.array(bodyCompositionEvidenceInvalidReasonSchema),
  })
  .strip();

/**
 * Caller-supplied source coverage — descriptive only.
 * Never implies account-wide completeness or source ranking.
 */
export const bodyCompositionEvidenceSourcePresenceSchema = z.enum([
  "omitted",
  "provided_empty",
  "provided_nonempty",
]);
export type BodyCompositionEvidenceSourcePresence = z.infer<
  typeof bodyCompositionEvidenceSourcePresenceSchema
>;

export const bodyCompositionEvidenceProfilePresenceSchema = z.enum(["available", "missing"]);
export type BodyCompositionEvidenceProfilePresence = z.infer<
  typeof bodyCompositionEvidenceProfilePresenceSchema
>;

export const bodyCompositionEvidenceCompletenessSchema = z
  .object({
    /** V1 bridge never proves account-wide enumeration. */
    mode: z.literal("caller_supplied_partial"),
    profile: bodyCompositionEvidenceProfilePresenceSchema,
    continuousEvents: bodyCompositionEvidenceSourcePresenceSchema,
    verifiedScanDetails: bodyCompositionEvidenceSourcePresenceSchema,
  })
  .strip();

export type BodyCompositionEvidenceCompleteness = z.infer<
  typeof bodyCompositionEvidenceCompletenessSchema
>;

export const bodyCompositionEvidenceBundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    subjectContext: bodyCompositionSubjectContextSchema,
    observations: z.array(bodyCompositionEvidenceObservationSchema),
    diagnostics: bodyCompositionEvidenceDiagnosticsSchema,
    completeness: bodyCompositionEvidenceCompletenessSchema,
  })
  .strip();

export type BodyCompositionEvidenceBundle = z.infer<typeof bodyCompositionEvidenceBundleSchema>;

/** Re-export Body Scan metric id for mapping boundary checks. */
export const bodyScanMetricKeyForEvidenceSchema = bodyScanMetricIdSchema;
