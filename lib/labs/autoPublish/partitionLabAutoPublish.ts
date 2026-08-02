/**
 * Partition extraction candidates for zero-user-work import + verification.
 */
import {
  LAB_AUTO_IMPORT_POLICY_VERSION,
  type LabAutoPublishDecision,
  type LabExtractionDraft,
  type LabImportSummaryDto,
  type LabReportImportStatus,
  type LabResultCandidate,
} from "@oli/contracts";
import {
  deriveLabCandidateConfidence,
  evaluateLabAutoPublish,
} from "./evaluateLabAutoPublish";
import { applyDeterministicLabVerificationFix } from "../verification/applyDeterministicLabVerificationFix";

export type LabAutoPublishPartition = {
  autoPublishable: { candidate: LabResultCandidate; decision: LabAutoPublishDecision }[];
  /** Deterministically fixed then eligible — publish as system_verified. */
  systemVerifiable: {
    candidate: LabResultCandidate;
    decision: LabAutoPublishDecision;
    methods: string[];
  }[];
  /** Matched but still unsafe after verification — withhold (no user work). */
  withheld: { candidate: LabResultCandidate; decision: LabAutoPublishDecision }[];
  /** @deprecated Prefer withheld — kept for older call sites expecting reviewRequired. */
  reviewRequired: { candidate: LabResultCandidate; decision: LabAutoPublishDecision }[];
  unmatchedCount: number;
  /** Genuine unsupported analytes only (excludes notes/duplicates/headers). */
  unsupportedGenuineCount: number;
  reportContentCount: number;
  duplicateCount: number;
  historicalCount: number;
  decisionsByCandidateId: Record<string, LabAutoPublishDecision>;
};

function reportFamilyEligible(draft: LabExtractionDraft): boolean {
  const family = (draft.reportCandidate.reportFamily ?? "").toLowerCase();
  const parserOk = draft.parser.id === "quest_text_pdf_v1";
  const unsupported = draft.status === "unsupported" || draft.status === "failed";
  if (unsupported) return false;
  if (!parserOk) return false;
  if (!family) return parserOk;
  return /quest|directlabs/.test(family);
}

function duplicateIds(results: readonly LabResultCandidate[]): Set<string> {
  const seen = new Map<string, string>();
  const dups = new Set<string>();
  for (const r of results) {
    const key = `${r.rawAnalyteLabel}|${r.rawResult}|${r.provenance.sourcePage}|${r.provenance.resultRole ?? "current"}`;
    const prior = seen.get(key);
    if (prior) {
      dups.add(prior);
      dups.add(r.id);
    } else {
      seen.set(key, r.id);
    }
  }
  for (const r of results) {
    if (r.warnings.includes("duplicate_candidate")) dups.add(r.id);
  }
  return dups;
}

function evaluateOne(
  draft: LabExtractionDraft,
  candidate: LabResultCandidate,
  familyOk: boolean,
  dups: Set<string>,
): LabAutoPublishDecision {
  const confidence = deriveLabCandidateConfidence({
    report: draft.reportCandidate,
    candidate,
    duplicateInReport: dups.has(candidate.id),
  });
  return evaluateLabAutoPublish({
    report: draft.reportCandidate,
    candidate,
    reportFamilyEligible: familyOk,
    confidence,
    warningCodes: candidate.warnings,
  });
}

export function partitionLabCandidatesForAutoPublish(draft: LabExtractionDraft): LabAutoPublishPartition {
  const familyOk = reportFamilyEligible(draft);
  const dups = duplicateIds(draft.results);
  const autoPublishable: LabAutoPublishPartition["autoPublishable"] = [];
  const systemVerifiable: LabAutoPublishPartition["systemVerifiable"] = [];
  const withheld: LabAutoPublishPartition["withheld"] = [];
  const decisionsByCandidateId: Record<string, LabAutoPublishDecision> = {};

  for (const candidate of draft.results) {
    const decision = evaluateOne(draft, candidate, familyOk, dups);
    decisionsByCandidateId[candidate.id] = decision;
    if (decision.eligible) {
      autoPublishable.push({ candidate, decision });
      continue;
    }

    const fix = applyDeterministicLabVerificationFix(candidate);
    if (fix) {
      const verifiedDecision = evaluateOne(draft, fix.candidate, familyOk, dups);
      decisionsByCandidateId[candidate.id] = verifiedDecision;
      if (verifiedDecision.eligible) {
        systemVerifiable.push({
          candidate: fix.candidate,
          decision: verifiedDecision,
          methods: fix.methods,
        });
        continue;
      }
    }

    withheld.push({ candidate, decision });
  }

  const unsupportedGenuineCount = draft.unmatched.filter(
    (u) => u.reason === "unmatched_alias" || u.reason === "ambiguous_alias" || u.reason === "unsupported_result_type",
  ).length;
  const duplicateCount = draft.unmatched.filter((u) => u.reason === "duplicate_result").length;
  const historicalCount = draft.unmatched.filter((u) => u.reason === "historical_column").length;
  const reportContentCount = draft.unmatched.filter((u) =>
    [
      "non_result_panel_header",
      "non_result_reference_table",
      "non_result_risk_category",
      "non_result_method_note",
      "non_result_report_note",
      "non_result_laboratory_metadata",
      "malformed_row",
      "classified_non_result",
    ].includes(u.reason),
  ).length;

  return {
    autoPublishable,
    systemVerifiable,
    withheld,
    reviewRequired: withheld,
    unmatchedCount: draft.unmatched.length,
    unsupportedGenuineCount,
    reportContentCount,
    duplicateCount,
    historicalCount,
    decisionsByCandidateId,
  };
}

export function buildLabImportSummary(args: {
  documentId: string;
  draft: LabExtractionDraft;
  partition: LabAutoPublishPartition;
  draftTerminalUnsupported?: boolean;
  draftFailed?: boolean;
}): LabImportSummaryDto {
  const autoImportedCount = args.partition.autoPublishable.length;
  const systemVerifiedCount = args.partition.systemVerifiable.length;
  const importedCount = autoImportedCount + systemVerifiedCount;
  const withheldCount = args.partition.withheld.length;
  const unsupportedGenuineCount = args.partition.unsupportedGenuineCount;
  const reportContentCount = args.partition.reportContentCount;
  /** Zero-user-work: never require consumer review for matched leftovers. */
  const reviewNeededCount = 0;

  let reportImportStatus: LabReportImportStatus;
  let reportProcessingStatus: NonNullable<LabImportSummaryDto["reportProcessingStatus"]>;
  if (args.draftFailed || args.draft.status === "failed") {
    reportImportStatus = "failed";
    reportProcessingStatus = "failed";
  } else if (args.draftTerminalUnsupported || args.draft.status === "unsupported") {
    reportImportStatus = "unsupported";
    reportProcessingStatus = "unsupported";
  } else if (importedCount > 0 && withheldCount === 0) {
    reportImportStatus =
      unsupportedGenuineCount > 0 ? "imported_review_recommended" : "imported";
    reportProcessingStatus = "imported";
  } else if (importedCount > 0) {
    reportImportStatus = "imported_review_recommended";
    reportProcessingStatus = "imported_withheld";
  } else {
    reportImportStatus = "review_needed";
    reportProcessingStatus = unsupportedGenuineCount > 0 ? "imported_withheld" : "failed";
  }

  return {
    ok: true,
    documentId: args.documentId,
    reportImportStatus,
    importedCount,
    reviewNeededCount,
    unmatchedCount: unsupportedGenuineCount,
    hasAutoPublishedResults: importedCount > 0,
    hasReviewItems: false,
    policyVersion: LAB_AUTO_IMPORT_POLICY_VERSION,
    autoImportedCount,
    systemVerifiedCount,
    withheldCount,
    unsupportedCount: unsupportedGenuineCount,
    reportProcessingStatus,
    reportContentCount,
    duplicateCount: args.partition.duplicateCount,
    historicalCount: args.partition.historicalCount,
  };
}

export function reviewStatusFromImportSummary(
  summary: LabImportSummaryDto,
): "imported" | "imported_with_exceptions" | "not_started" {
  if (summary.reportImportStatus === "imported") return "imported";
  if (summary.importedCount > 0) return "imported_with_exceptions";
  return "not_started";
}
