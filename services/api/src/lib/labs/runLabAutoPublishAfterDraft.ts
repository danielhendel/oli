/**
 * Server orchestration: auto-import + deterministic system verification after draft persist.
 * Idempotent via deterministic acceptedLabResultId.
 * Preserves prior user overrides (rejected / user_corrected / user_accepted) on reprocess.
 * Deletes orphaned parser-derived accepted/projected rows from superseded extractions candidate IDs.
 * Zero required user review — unresolved matched rows are withheld.
 */
import type {
  AcceptedLabResult,
  LabExtractionDraft,
  LabImportSummaryDto,
  LabReviewRecord,
} from "@oli/contracts";
import { LAB_AUTO_IMPORT_POLICY_VERSION, LABS_OS_SCHEMA_VERSION } from "@oli/contracts";
import {
  buildLabImportSummary,
  partitionLabCandidatesForAutoPublish,
  reviewStatusFromImportSummary,
} from "../../../../../lib/labs/autoPublish/partitionLabAutoPublish";
import {
  acceptedLabResultId,
  buildAcceptedLabResult,
  projectAcceptedWithSourceGuard,
} from "./labsReviewService";

type QuerySnap = {
  docs: { id: string; data: () => unknown }[];
};

type Col = {
  doc: (id: string) => {
    set: (data: Record<string, unknown>, opts?: { merge?: boolean }) => Promise<unknown>;
    get?: () => Promise<{ exists: boolean; data: () => unknown }>;
    delete?: () => Promise<unknown>;
  };
  /** Optional Firestore-style query used for reprocess orphan cleanup. */
  where?: (
    field: string,
    op: string,
    value: unknown,
  ) => {
    get: () => Promise<QuerySnap>;
  };
};

const PRESERVE_STATUSES = new Set(["rejected", "user_corrected", "user_accepted"]);
const USER_KEEP_STATUSES = new Set(["user_corrected", "user_accepted"]);

function isReferenceOrNonCurrentRole(role: string | null | undefined): boolean {
  return (
    role === "reference_optimal" ||
    role === "reference_moderate" ||
    role === "reference_high" ||
    role === "reference_general" ||
    role === "historical_result" ||
    role === "unknown"
  );
}

export type AutoPublishOrchestrationResult = {
  importSummary: LabImportSummaryDto;
  review: LabReviewRecord;
  acceptedIds: string[];
  projectedIds: string[];
  removedStaleIds: string[];
};

async function deleteDoc(col: Col, id: string): Promise<void> {
  if (col.doc(id).delete) {
    await col.doc(id).delete!();
  }
}

/**
 * Remove parser-derived accepted/projected rows for this document that are not
 * in the active keep set. Preserves user-accepted / user-corrected rows.
 */
export async function cleanupStaleLabDerivedRows(args: {
  documentId: string;
  keepAcceptedIds: ReadonlySet<string>;
  labAcceptedResultsCol: Col;
  labResultsCol: Col;
}): Promise<string[]> {
  const removed: string[] = [];
  if (args.labAcceptedResultsCol.where) {
    const snap = await args.labAcceptedResultsCol
      .where("sourceDocumentId", "==", args.documentId)
      .get();
    for (const doc of snap.docs) {
      if (args.keepAcceptedIds.has(doc.id)) continue;
      const data = doc.data() as { review?: { status?: string } } | undefined;
      const status = data?.review?.status;
      if (status && USER_KEEP_STATUSES.has(status)) continue;
      await deleteDoc(args.labAcceptedResultsCol, doc.id);
      await deleteDoc(args.labResultsCol, doc.id);
      removed.push(doc.id);
    }
  }
  if (args.labResultsCol.where) {
    const snap = await args.labResultsCol.where("uploadId", "==", args.documentId).get();
    for (const doc of snap.docs) {
      if (args.keepAcceptedIds.has(doc.id)) continue;
      await deleteDoc(args.labResultsCol, doc.id);
      if (!removed.includes(doc.id)) removed.push(doc.id);
    }
  }
  return removed;
}

export async function runLabAutoPublishAfterDraft(args: {
  uid: string;
  draft: LabExtractionDraft;
  now: string;
  labReviewsCol: Col;
  labAcceptedResultsCol: Col;
  labResultsCol: Col;
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

  const autoFiltered = partition.autoPublishable.filter(({ candidate }) => {
    if (isReferenceOrNonCurrentRole(candidate.provenance.sourceValueRole)) return false;
    const prior = priorStatuses[candidate.id];
    return !prior || !PRESERVE_STATUSES.has(prior);
  });
  const verifiedFiltered = partition.systemVerifiable.filter(({ candidate }) => {
    if (isReferenceOrNonCurrentRole(candidate.provenance.sourceValueRole)) return false;
    const prior = priorStatuses[candidate.id];
    return !prior || !PRESERVE_STATUSES.has(prior);
  });

  for (const { candidate } of partition.withheld) {
    const prior = priorStatuses[candidate.id];
    if (prior && PRESERVE_STATUSES.has(prior)) {
      candidateStatuses[candidate.id] = prior as LabReviewRecord["candidateStatuses"][string];
    } else {
      candidateStatuses[candidate.id] = "withheld";
    }
  }
  for (const { candidate } of autoFiltered) {
    candidateStatuses[candidate.id] = "auto_published";
  }
  for (const { candidate } of verifiedFiltered) {
    candidateStatuses[candidate.id] = "system_verified";
  }
  for (const { candidate } of [...partition.autoPublishable, ...partition.systemVerifiable]) {
    const prior = priorStatuses[candidate.id];
    if (prior && PRESERVE_STATUSES.has(prior)) {
      candidateStatuses[candidate.id] = prior as LabReviewRecord["candidateStatuses"][string];
    }
  }

  const importSummary = buildLabImportSummary({
    documentId: args.draft.documentId,
    draft: args.draft,
    partition: {
      ...partition,
      autoPublishable: [
        ...autoFiltered,
        ...partition.autoPublishable.filter(({ candidate }) => {
          const p = priorStatuses[candidate.id];
          return p === "user_accepted" || p === "user_corrected";
        }),
      ],
      systemVerifiable: verifiedFiltered,
    },
  });

  const acceptedIds: string[] = [];
  const projectedIds: string[] = [];
  const collectedAt = args.draft.reportCandidate.collectedAt ?? null;
  const reportedAt = args.draft.reportCandidate.reportedAt ?? null;
  const fasting = args.draft.reportCandidate.fasting ?? null;

  const publishOne = async (
    candidate: LabExtractionDraft["results"][number],
    reviewStatus: "auto_published" | "system_verified",
    methods?: readonly string[],
  ) => {
    const accepted: AcceptedLabResult = {
      ...buildAcceptedLabResult({
        userId: args.uid,
        draft: args.draft,
        candidate,
        reviewStatus,
        reviewVersion: "0",
        acceptedAt: args.now,
        collectedAt,
        reportedAt,
        fasting,
        policyVersion: LAB_AUTO_IMPORT_POLICY_VERSION,
        ...(methods ? { verificationMethods: methods } : {}),
      }),
    };
    await args.labAcceptedResultsCol.doc(accepted.id).set(accepted as unknown as Record<string, unknown>, {
      merge: true,
    });
    acceptedIds.push(accepted.id);
    const { projection } = projectAcceptedWithSourceGuard({
      accepted,
      sourceResult: candidate.result!,
      sourceUnit: candidate.unit.normalizedUnit ?? candidate.unit.rawUnit,
    });
    if (projection) {
      await args.labResultsCol.doc(projection.id).set(projection as unknown as Record<string, unknown>, {
        merge: true,
      });
      projectedIds.push(projection.id);
    } else {
      // Do not leave a prior wrong projection for this accepted id.
      await deleteDoc(args.labResultsCol, accepted.id);
    }
  };

  for (const { candidate } of autoFiltered) {
    await publishOne(candidate, "auto_published");
  }
  for (const { candidate, methods } of verifiedFiltered) {
    await publishOne(candidate, "system_verified", methods);
  }

  for (const [candidateId, status] of Object.entries(priorStatuses)) {
    if (status !== "rejected") continue;
    const id = acceptedLabResultId(args.draft.documentId, candidateId);
    await deleteDoc(args.labAcceptedResultsCol, id);
    await deleteDoc(args.labResultsCol, id);
  }

  const keepAcceptedIds = new Set<string>(acceptedIds);
  for (const [candidateId, status] of Object.entries(priorStatuses)) {
    if (!USER_KEEP_STATUSES.has(status)) continue;
    keepAcceptedIds.add(acceptedLabResultId(args.draft.documentId, candidateId));
  }
  // Also keep any ids we just projected (same as accepted for this path).
  for (const id of projectedIds) keepAcceptedIds.add(id);

  const removedStaleIds = await cleanupStaleLabDerivedRows({
    documentId: args.draft.documentId,
    keepAcceptedIds,
    labAcceptedResultsCol: args.labAcceptedResultsCol,
    labResultsCol: args.labResultsCol,
  });

  const reviewStatus = reviewStatusFromImportSummary(importSummary);
  const publishedCount = autoFiltered.length + verifiedFiltered.length;
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
        : publishedCount > 0
          ? 1
          : 0,
    candidateStatuses,
    corrections: priorCorrections,
    createdAt: args.priorReview?.createdAt ?? args.now,
    updatedAt: args.now,
    ...(publishedCount > 0 || importSummary.importedCount > 0
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

  return { importSummary, review, acceptedIds, projectedIds, removedStaleIds };
}
