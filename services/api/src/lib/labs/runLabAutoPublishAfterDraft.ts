/**
 * Server orchestration: auto-publish eligible candidates after draft persist.
 * Idempotent via deterministic acceptedLabResultId.
 * Preserves prior user overrides (rejected / user_corrected / user_accepted) on reprocess.
 */
import type {
  AcceptedLabResult,
  LabExtractionDraft,
  LabImportSummaryDto,
  LabReviewRecord,
} from "@oli/contracts";
import { LAB_AUTO_PUBLISH_POLICY_VERSION, LABS_OS_SCHEMA_VERSION } from "@oli/contracts";
import {
  buildLabImportSummary,
  partitionLabCandidatesForAutoPublish,
  reviewStatusFromImportSummary,
} from "../../../../../lib/labs/autoPublish/partitionLabAutoPublish";
import {
  acceptedLabResultId,
  buildAcceptedLabResult,
  projectAcceptedToLabMetricResultDto,
} from "./labsReviewService";

type Col = {
  doc: (id: string) => {
    set: (data: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<unknown>;
    get?: () => Promise<{ exists: boolean; data: () => unknown }>;
    delete?: () => Promise<unknown>;
  };
};

const PRESERVE_STATUSES = new Set(["rejected", "user_corrected", "user_accepted"]);

export type AutoPublishOrchestrationResult = {
  importSummary: LabImportSummaryDto;
  review: LabReviewRecord;
  acceptedIds: string[];
  projectedIds: string[];
};

export async function runLabAutoPublishAfterDraft(args: {
  uid: string;
  draft: LabExtractionDraft;
  now: string;
  labReviewsCol: Col;
  labAcceptedResultsCol: Col;
  labResultsCol: Col;
  /** Prior review when reprocessing — user overrides are preserved. */
  priorReview?: LabReviewRecord | null;
}): Promise<AutoPublishOrchestrationResult> {
  const partition = partitionLabCandidatesForAutoPublish(args.draft);
  const priorStatuses = args.priorReview?.candidateStatuses ?? {};
  const priorCorrections = args.priorReview?.corrections ?? [];

  const candidateStatuses: Record<string, LabReviewRecord["candidateStatuses"][string]> = {};
  for (const u of args.draft.unmatched) {
    const prior = priorStatuses[u.id];
    candidateStatuses[u.id] = prior === "rejected" ? "rejected" : "unresolved";
  }

  const autoPublishableFiltered = partition.autoPublishable.filter(({ candidate }) => {
    const prior = priorStatuses[candidate.id];
    return !prior || !PRESERVE_STATUSES.has(prior);
  });

  for (const { candidate } of partition.reviewRequired) {
    const prior = priorStatuses[candidate.id];
    if (prior && PRESERVE_STATUSES.has(prior)) {
      candidateStatuses[candidate.id] = prior as LabReviewRecord["candidateStatuses"][string];
    } else {
      candidateStatuses[candidate.id] = "pending_review";
    }
  }
  for (const { candidate } of autoPublishableFiltered) {
    candidateStatuses[candidate.id] = "auto_published";
  }
  // Re-apply preserved overrides that were auto-publishable this run
  for (const { candidate } of partition.autoPublishable) {
    const prior = priorStatuses[candidate.id];
    if (prior && PRESERVE_STATUSES.has(prior)) {
      candidateStatuses[candidate.id] = prior as LabReviewRecord["candidateStatuses"][string];
    }
  }

  const effectivePartition = {
    ...partition,
    autoPublishable: autoPublishableFiltered,
  };
  const importSummary = buildLabImportSummary({
    documentId: args.draft.documentId,
    draft: args.draft,
    partition: {
      ...effectivePartition,
      // Count preserved user_accepted/user_corrected as imported for summary honesty
      autoPublishable: [
        ...autoPublishableFiltered,
        ...partition.autoPublishable.filter(({ candidate }) => {
          const p = priorStatuses[candidate.id];
          return p === "user_accepted" || p === "user_corrected";
        }),
      ],
      reviewRequired: partition.reviewRequired.filter(({ candidate }) => {
        const p = priorStatuses[candidate.id];
        return !p || !PRESERVE_STATUSES.has(p);
      }),
    },
  });

  const acceptedIds: string[] = [];
  const projectedIds: string[] = [];
  const collectedAt = args.draft.reportCandidate.collectedAt ?? null;
  const reportedAt = args.draft.reportCandidate.reportedAt ?? null;
  const fasting = args.draft.reportCandidate.fasting ?? null;

  for (const { candidate } of autoPublishableFiltered) {
    const accepted: AcceptedLabResult = {
      ...buildAcceptedLabResult({
        userId: args.uid,
        draft: args.draft,
        candidate,
        reviewStatus: "auto_published",
        reviewVersion: "0",
        acceptedAt: args.now,
        collectedAt,
        reportedAt,
        fasting,
        policyVersion: LAB_AUTO_PUBLISH_POLICY_VERSION,
      }),
    };
    await args.labAcceptedResultsCol.doc(accepted.id).set(accepted as unknown as Record<string, unknown>, {
      merge: true,
    });
    acceptedIds.push(accepted.id);
    const projection = projectAcceptedToLabMetricResultDto(accepted);
    if (projection) {
      await args.labResultsCol.doc(projection.id).set(projection as unknown as Record<string, unknown>, {
        merge: true,
      });
      projectedIds.push(projection.id);
    }
  }

  // Ensure rejected prior candidates do not leave stale projections
  for (const [candidateId, status] of Object.entries(priorStatuses)) {
    if (status !== "rejected") continue;
    const id = acceptedLabResultId(args.draft.documentId, candidateId);
    if (args.labAcceptedResultsCol.doc(id).delete) {
      await args.labAcceptedResultsCol.doc(id).delete!();
    }
    if (args.labResultsCol.doc(id).delete) {
      await args.labResultsCol.doc(id).delete!();
    }
  }

  const reviewStatus = reviewStatusFromImportSummary(importSummary);
  const review: LabReviewRecord = {
    schemaVersion: LABS_OS_SCHEMA_VERSION,
    id: `review_${args.draft.documentId}`,
    documentId: args.draft.documentId,
    userId: args.uid,
    draftId: args.draft.id,
    status: reviewStatus,
    reviewVersion:
      args.priorReview && args.priorReview.reviewVersion > 0
        ? args.priorReview.reviewVersion
        : autoPublishableFiltered.length > 0
          ? 1
          : 0,
    candidateStatuses,
    corrections: priorCorrections,
    createdAt: args.priorReview?.createdAt ?? args.now,
    updatedAt: args.now,
    ...(autoPublishableFiltered.length > 0 || importSummary.importedCount > 0
      ? { acceptedAt: args.priorReview?.acceptedAt ?? args.now }
      : {}),
    importSummary,
    autoPublishDecisions: Object.fromEntries(
      Object.entries(partition.decisionsByCandidateId).map(([id, decision]) => [
        id,
        decision.eligible
          ? {
              eligible: true,
              policyVersion: decision.policyVersion,
              evidence: decision.evidence as unknown as Record<string, unknown>,
            }
          : {
              eligible: false,
              policyVersion: decision.policyVersion,
              reasons: [...decision.reasons],
              ...(decision.evidence
                ? { evidence: decision.evidence as unknown as Record<string, unknown> }
                : {}),
            },
      ]),
    ),
  };

  await args.labReviewsCol.doc(review.id).set(review as unknown as Record<string, unknown>, { merge: true });

  return { importSummary, review, acceptedIds, projectedIds };
}
