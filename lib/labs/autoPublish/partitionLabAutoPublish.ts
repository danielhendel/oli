/**
 * Partition extraction candidates and build import summary (pure).
 */
import {
  LAB_AUTO_PUBLISH_POLICY_VERSION,
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

export type LabAutoPublishPartition = {
  autoPublishable: { candidate: LabResultCandidate; decision: LabAutoPublishDecision }[];
  reviewRequired: { candidate: LabResultCandidate; decision: LabAutoPublishDecision }[];
  unmatchedCount: number;
  decisionsByCandidateId: Record<string, LabAutoPublishDecision>;
};

function reportFamilyEligible(draft: LabExtractionDraft): boolean {
  const family = (draft.reportCandidate.reportFamily ?? "").toLowerCase();
  const parserOk = draft.parser.id === "quest_text_pdf_v1";
  const unsupported = draft.status === "unsupported" || draft.status === "failed";
  if (unsupported) return false;
  if (!parserOk) return false;
  // Quest/DirectLabs text family or empty family with quest parser (legacy drafts).
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

export function partitionLabCandidatesForAutoPublish(draft: LabExtractionDraft): LabAutoPublishPartition {
  const familyOk = reportFamilyEligible(draft);
  const dups = duplicateIds(draft.results);
  const autoPublishable: LabAutoPublishPartition["autoPublishable"] = [];
  const reviewRequired: LabAutoPublishPartition["reviewRequired"] = [];
  const decisionsByCandidateId: Record<string, LabAutoPublishDecision> = {};

  for (const candidate of draft.results) {
    const confidence = deriveLabCandidateConfidence({
      report: draft.reportCandidate,
      candidate,
      duplicateInReport: dups.has(candidate.id),
    });
    const decision = evaluateLabAutoPublish({
      report: draft.reportCandidate,
      candidate,
      reportFamilyEligible: familyOk,
      confidence,
      warningCodes: candidate.warnings,
    });
    decisionsByCandidateId[candidate.id] = decision;
    if (decision.eligible) {
      autoPublishable.push({ candidate, decision });
    } else {
      reviewRequired.push({ candidate, decision });
    }
  }

  return {
    autoPublishable,
    reviewRequired,
    unmatchedCount: draft.unmatched.length,
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
  const importedCount = args.partition.autoPublishable.length;
  const reviewNeededCount = args.partition.reviewRequired.length;
  const unmatchedCount = args.partition.unmatchedCount;

  let reportImportStatus: LabReportImportStatus;
  if (args.draftFailed || args.draft.status === "failed") {
    reportImportStatus = "failed";
  } else if (args.draftTerminalUnsupported || args.draft.status === "unsupported") {
    reportImportStatus = "unsupported";
  } else if (importedCount > 0 && reviewNeededCount === 0 && unmatchedCount === 0) {
    reportImportStatus = "imported";
  } else if (importedCount > 0) {
    reportImportStatus = "imported_review_recommended";
  } else {
    reportImportStatus = "review_needed";
  }

  return {
    ok: true,
    documentId: args.documentId,
    reportImportStatus,
    importedCount,
    reviewNeededCount,
    unmatchedCount,
    hasAutoPublishedResults: importedCount > 0,
    hasReviewItems: reviewNeededCount > 0 || unmatchedCount > 0,
    policyVersion: LAB_AUTO_PUBLISH_POLICY_VERSION,
  };
}

export function reviewStatusFromImportSummary(
  summary: LabImportSummaryDto,
): "imported" | "imported_with_exceptions" | "not_started" {
  if (summary.reportImportStatus === "imported") return "imported";
  if (summary.reportImportStatus === "imported_review_recommended") return "imported_with_exceptions";
  return "not_started";
}
