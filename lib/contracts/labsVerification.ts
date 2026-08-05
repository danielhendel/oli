/**
 * Labs verification / zero-user-work trust contracts (Phase 3D-A additive).
 * Trust = transcription confidence only — never medical validation.
 */
import { z } from "zod";
import {
  LAB_AUTO_IMPORT_POLICY_VERSION,
  LAB_SYSTEM_VERIFICATION_POLICY_VERSION,
  labCandidateConfidenceSchema,
  labExtractionWarningCodeSchema,
} from "./labsOs";

export { LAB_AUTO_IMPORT_POLICY_VERSION, LAB_SYSTEM_VERIFICATION_POLICY_VERSION };

export const LAB_ACTIVE_IMPORT_POLICY_VERSION = LAB_AUTO_IMPORT_POLICY_VERSION;

export const labResultTrustStatusSchema = z.enum([
  "auto_imported",
  "system_verified",
  "professional_verified",
  "user_corrected",
  "withheld",
  "unsupported",
]);

export const labFieldTrustLevelSchema = z.enum([
  "trusted",
  "unresolved",
  "not_required",
  "not_present",
]);

export const labFieldTrustSchema = z
  .object({
    analyte: z.enum(["trusted", "unresolved"]),
    value: z.enum(["trusted", "unresolved"]),
    unit: z.enum(["trusted", "unresolved"]),
    collectionDate: z.enum(["trusted", "unresolved"]),
    referenceRange: labFieldTrustLevelSchema,
    sourceFlag: labFieldTrustLevelSchema,
    panel: labFieldTrustLevelSchema,
    method: labFieldTrustLevelSchema,
    provenance: z.enum(["trusted", "unresolved"]),
  })
  .strip();

export const labWithholdReasonSchema = z.enum([
  "unsupported_report_family",
  "image_only_pdf",
  "encrypted_pdf",
  "analyte_unmatched",
  "analyte_ambiguous",
  "value_ambiguous",
  "unit_ambiguous",
  "unit_incompatible",
  "historical_column_conflict",
  "duplicate_conflict",
  "parser_consensus_conflict",
  "missing_collection_date",
  "missing_provenance",
  "method_conflict",
  "specimen_conflict",
  "unsupported_result_type",
  "unsupported_metric_profile",
  "malformed_source_row",
  "verification_insufficient",
]);

export const labReportProcessingStatusSchema = z.enum([
  "processing",
  "imported",
  "imported_verifying",
  "imported_withheld",
  "unsupported",
  "failed",
]);

export const labVerificationEvidenceSchema = z
  .object({
    policyVersion: z.string().min(1),
    verificationPolicyVersion: z.string().min(1).optional(),
    importPolicyVersion: z.string().min(1).optional(),
    parserStrategies: z.array(z.string().min(1)).optional(),
    verificationMethods: z.array(z.string().min(1)).optional(),
    aliasRegistryVersion: z.string().min(1).optional(),
    unitRegistryVersion: z.string().min(1).optional(),
    metricProfileVersion: z.string().min(1).optional(),
    panelProfileVersion: z.string().min(1).optional(),
    sourcePage: z.number().int().positive().optional(),
    sourceLocator: z.string().min(1).optional(),
    collectionDatePresent: z.boolean().optional(),
    duplicateSafe: z.boolean().optional(),
    fieldTrust: labFieldTrustSchema.optional(),
    confidence: labCandidateConfidenceSchema.optional(),
    warningCodes: z.array(labExtractionWarningCodeSchema).optional(),
  })
  .strip();

export const labVerificationDecisionSchema = z.discriminatedUnion("outcome", [
  z
    .object({
      outcome: z.literal("auto_import"),
      trustStatus: z.literal("auto_imported"),
      evidence: labVerificationEvidenceSchema,
    })
    .strip(),
  z
    .object({
      outcome: z.literal("system_verify"),
      trustStatus: z.literal("system_verified"),
      evidence: labVerificationEvidenceSchema,
    })
    .strip(),
  z
    .object({
      outcome: z.literal("withhold"),
      trustStatus: z.literal("withheld"),
      reasons: z.array(labWithholdReasonSchema).min(1),
      evidence: labVerificationEvidenceSchema.optional(),
    })
    .strip(),
  z
    .object({
      outcome: z.literal("unsupported"),
      trustStatus: z.literal("unsupported"),
      reasons: z.array(labWithholdReasonSchema).min(1),
      evidence: labVerificationEvidenceSchema.optional(),
    })
    .strip(),
]);

export const labReportProcessingSummaryDtoSchema = z
  .object({
    ok: z.literal(true),
    documentId: z.string().min(1),
    reportProcessingStatus: labReportProcessingStatusSchema,
    availableNowCount: z.number().int().nonnegative(),
    verifyingCount: z.number().int().nonnegative(),
    withheldCount: z.number().int().nonnegative(),
    unsupportedCount: z.number().int().nonnegative(),
    autoImportedCount: z.number().int().nonnegative().optional(),
    systemVerifiedCount: z.number().int().nonnegative().optional(),
    hasOptionalCorrections: z.boolean().optional(),
    importPolicyVersion: z.literal(LAB_AUTO_IMPORT_POLICY_VERSION).optional(),
    verificationPolicyVersion: z.literal(LAB_SYSTEM_VERIFICATION_POLICY_VERSION).optional(),
    /** @deprecated Prefer reportProcessingStatus — kept for older clients. */
    reportImportStatus: z.string().min(1).optional(),
    importedCount: z.number().int().nonnegative().optional(),
    reviewNeededCount: z.number().int().nonnegative().optional(),
    unmatchedCount: z.number().int().nonnegative().optional(),
  })
  .strip();

export const labEducationSectionSchema = z.enum([
  "auto_imported",
  "system_verified",
  "withheld",
  "unsupported",
]);

export const labReportEducationDtoSchema = z
  .object({
    ok: z.literal(true),
    documentId: z.string().min(1),
    title: z.literal("How Oli processed your report"),
    sections: z.array(
      z
        .object({
          id: labEducationSectionSchema,
          title: z.string().min(1),
          body: z.string().min(1),
          count: z.number().int().nonnegative(),
        })
        .strip(),
    ),
  })
  .strip();

/** Map legacy candidate review status → consumer trust status. */
export function labTrustStatusFromReviewStatus(
  status: string | null | undefined,
): z.infer<typeof labResultTrustStatusSchema> {
  switch (status) {
    case "auto_published":
    case "auto_imported":
      return "auto_imported";
    case "system_verified":
      return "system_verified";
    case "professional_verified":
      return "professional_verified";
    case "user_corrected":
    case "user_accepted":
    case "accepted":
    case "corrected":
      return status === "user_corrected" || status === "corrected" ? "user_corrected" : "auto_imported";
    case "withheld":
    case "rejected":
      return "withheld";
    case "unsupported":
      return "unsupported";
    case "pending_review":
    case "unresolved":
    case "pending":
    default:
      return "withheld";
  }
}

export type LabResultTrustStatus = z.infer<typeof labResultTrustStatusSchema>;
export type LabFieldTrust = z.infer<typeof labFieldTrustSchema>;
export type LabWithholdReason = z.infer<typeof labWithholdReasonSchema>;
export type LabVerificationDecision = z.infer<typeof labVerificationDecisionSchema>;
export type LabVerificationEvidence = z.infer<typeof labVerificationEvidenceSchema>;
export type LabReportProcessingSummaryDto = z.infer<typeof labReportProcessingSummaryDtoSchema>;
export type LabReportEducationDto = z.infer<typeof labReportEducationDtoSchema>;
export type LabReportProcessingStatus = z.infer<typeof labReportProcessingStatusSchema>;
