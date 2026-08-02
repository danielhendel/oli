/**
 * GET/PATCH/POST /users/me/labs/reviews/* — Labs OS review (Phase 3D-A).
 */
import { Router, type Response } from "express";
import {
  acceptLabReviewRequestSchema,
  labReviewDetailDtoSchema,
  labReviewSummaryDtoSchema,
  patchLabReviewCandidateRequestSchema,
  rejectLabReviewRequestSchema,
  labExtractionDraftSchema,
  labReviewRecordSchema,
  type LabExtractionDraft,
  type LabReviewRecord,
  type LabReviewCandidateDto,
  type LabReviewSummaryDto,
  normalizeLabCandidateStatusMap,
} from "@oli/contracts";
import { getLabMetricByKey } from "../../../../lib/labs/labMetricCatalog";
import { labWarningConsumerMessage } from "../../../../lib/labs/extraction/labWarningCopy";
import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { userCollection } from "../db";
import {
  buildAcceptedLabResult,
  projectAcceptedToLabMetricResultDto,
  resolveCandidatesForAccept,
  unpublishAcceptedLabResult,
} from "../lib/labs/labsReviewService";
import { transitionDocumentIngestionJobState } from "../../../../lib/data/documents/documentStateMachine";

const router = Router();
const getRid = (req: AuthedRequest): string => (req as RequestWithRid).rid ?? "unknown";

const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);
  return fromHeader ?? undefined;
};

function toIso(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

async function loadLatestDraft(uid: string, documentId: string): Promise<LabExtractionDraft | null> {
  const snap = await userCollection(uid, "labExtractionDrafts")
    .where("documentId", "==", documentId)
    .limit(20)
    .get();
  const drafts: LabExtractionDraft[] = [];
  for (const doc of snap.docs) {
    const raw = doc.data() as Record<string, unknown>;
    const parsed = labExtractionDraftSchema.safeParse({ ...raw, id: (raw.id as string) ?? doc.id });
    if (parsed.success && !parsed.data.superseded) drafts.push(parsed.data);
  }
  drafts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return drafts[0] ?? null;
}

async function loadReview(uid: string, documentId: string): Promise<LabReviewRecord | null> {
  const id = `review_${documentId}`;
  const snap = await userCollection(uid, "labReviews").doc(id).get();
  if (!snap.exists) return null;
  const raw = snap.data() as Record<string, unknown>;
  const parsed = labReviewRecordSchema.safeParse({
    ...raw,
    id,
    candidateStatuses: normalizeLabCandidateStatusMap(
      (raw.candidateStatuses as Record<string, string> | undefined) ?? {},
    ),
    createdAt: toIso(raw.createdAt) ?? raw.createdAt,
    updatedAt: toIso(raw.updatedAt) ?? raw.updatedAt,
  });
  return parsed.success ? parsed.data : null;
}

function unmatchedConsumerMessage(reason: string): string {
  switch (reason) {
    case "duplicate_result":
      return "Repeated presentation of an already imported result.";
    case "historical_column":
      return "Historical value from the report — not treated as the current result.";
    case "non_result_panel_header":
    case "non_result_reference_table":
    case "non_result_risk_category":
    case "non_result_method_note":
    case "non_result_report_note":
    case "non_result_laboratory_metadata":
    case "classified_non_result":
      return "Report content preserved — not treated as a lab result.";
    case "malformed_row":
      return "This row could not be safely reconstructed.";
    default:
      return "This analyte is not yet supported in Labs.";
  }
}

function unmatchedActionsAllowed(reason: string): boolean {
  return reason === "unmatched_alias" || reason === "ambiguous_alias" || reason === "unsupported_result_type";
}

function toCandidateDto(
  c: LabExtractionDraft["results"][number] | LabExtractionDraft["unmatched"][number],
  group: LabReviewCandidateDto["matchGroup"],
  reviewStatus: LabReviewCandidateDto["reviewStatus"],
): LabReviewCandidateDto {
  const isResult = "aliasMatch" in c;
  const metricId = isResult ? c.aliasMatch.canonicalMetricId : null;
  const metric = metricId ? getLabMetricByKey(metricId) : undefined;
  const unmatchedReason = !isResult ? c.reason : null;
  const actionsAllowed = isResult
    ? true
    : unmatchedReason
      ? unmatchedActionsAllowed(unmatchedReason)
      : false;
  return {
    id: c.id,
    rawAnalyteLabel: c.rawAnalyteLabel,
    displayName: metric?.displayName ?? null,
    canonicalMetricId: metricId,
    rawResult: c.rawResult,
    result: isResult ? c.result : null,
    unit: isResult ? c.unit.normalizedUnit ?? c.unit.rawUnit : null,
    rawReferenceRange: isResult ? c.rawReferenceRange : null,
    flagLabel: isResult ? c.flag.rawFlag : null,
    panelName: c.provenance.panelName ?? null,
    sourcePage: c.provenance.sourcePage,
    confidence: c.confidence,
    warnings: isResult
      ? c.warnings.map((code) => labWarningConsumerMessage(code))
      : [unmatchedConsumerMessage(unmatchedReason ?? "unmatched_alias")],
    reviewStatus,
    matchGroup: group,
    actionsAllowed,
    resolutionKind: !isResult ? (c.resolutionKind ?? unmatchedReason) : null,
    classificationReason: unmatchedReason,
  };
}

function buildSummary(args: {
  documentId: string;
  filename: string;
  documentStatus: string;
  draft: LabExtractionDraft;
  review: LabReviewRecord;
}): LabReviewSummaryDto {
  const statuses = Object.values(args.review.candidateStatuses);
  const importedCount = statuses.filter(
    (s) =>
      s === "auto_published" ||
      s === "system_verified" ||
      s === "user_accepted" ||
      s === "user_corrected",
  ).length;
  const reviewNeededCount = statuses.filter((s) => s === "pending_review").length;
  const unmatchedPending = args.draft.unmatched.filter((u) => {
    if (!unmatchedActionsAllowed(u.reason)) return false;
    const status = args.review.candidateStatuses[u.id] ?? "unresolved";
    return status === "unresolved" || status === "pending_review";
  }).length;
  const reportImportStatus =
    args.review.status === "imported"
      ? ("imported" as const)
      : args.review.status === "imported_with_exceptions"
        ? ("imported_review_recommended" as const)
        : args.review.status === "accepted"
          ? ("structured" as const)
          : importedCount > 0
            ? ("imported_review_recommended" as const)
            : ("review_needed" as const);

  return labReviewSummaryDtoSchema.parse({
    documentId: args.documentId,
    safeDisplayFilename: args.filename,
    status: args.review.status,
    documentStatus: args.documentStatus,
    collectedAt: args.draft.reportCandidate.collectedAt ?? null,
    reportedAt: args.draft.reportCandidate.reportedAt ?? null,
    fasting: args.draft.reportCandidate.fasting ?? null,
    laboratoryName: args.draft.reportCandidate.laboratoryName ?? null,
    matchedCount: args.draft.results.length,
    unmatchedCount: args.draft.unmatched.length,
    warningCount: args.draft.warnings.length,
    extractionVersion: args.draft.parser.extractionVersion,
    reviewVersion: args.review.reviewVersion,
    importedCount,
    reviewNeededCount: reviewNeededCount + unmatchedPending,
    reportImportStatus,
    hasAutoPublishedResults: statuses.includes("auto_published"),
    hasReviewItems: reviewNeededCount + unmatchedPending > 0,
  });
}

/** GET /users/me/labs/reviews */
router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const snap = await userCollection(uid, "labReviews").limit(50).get();
    const items: LabReviewSummaryDto[] = [];
    for (const doc of snap.docs) {
      const raw = doc.data() as Record<string, unknown>;
      const reviewParsed = labReviewRecordSchema.safeParse({
        ...raw,
        id: doc.id,
        candidateStatuses: normalizeLabCandidateStatusMap(
          (raw.candidateStatuses as Record<string, string> | undefined) ?? {},
        ),
        createdAt: toIso(raw.createdAt) ?? raw.createdAt,
        updatedAt: toIso(raw.updatedAt) ?? raw.updatedAt,
      });
      if (!reviewParsed.success) continue;
      if (
        reviewParsed.data.status === "accepted" ||
        reviewParsed.data.status === "rejected" ||
        reviewParsed.data.status === "imported"
      ) {
        continue;
      }
      // Keep imported_with_exceptions + not_started + in_progress in the exception queue.
      const draft = await loadLatestDraft(uid, reviewParsed.data.documentId);
      if (!draft) continue;
      const docSnap = await userCollection(uid, "documents").doc(reviewParsed.data.documentId).get();
      const filename =
        docSnap.exists && typeof (docSnap.data() as { safeDisplayFilename?: string }).safeDisplayFilename === "string"
          ? (docSnap.data() as { safeDisplayFilename: string }).safeDisplayFilename
          : "Lab report";
      const documentStatus =
        docSnap.exists && typeof (docSnap.data() as { status?: string }).status === "string"
          ? (docSnap.data() as { status: string }).status
          : "review_needed";
      items.push(
        buildSummary({
          documentId: reviewParsed.data.documentId,
          filename,
          documentStatus,
          draft,
          review: reviewParsed.data,
        }),
      );
    }
    res.status(200).json({ ok: true, items });
  }),
);

/** GET /users/me/labs/reviews/:documentId */
router.get(
  "/:documentId",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const documentId = String(req.params.documentId ?? "");
    const draft = await loadLatestDraft(uid, documentId);
    const review = await loadReview(uid, documentId);
    if (!draft || !review) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", requestId: getRid(req) } });
      return;
    }
    const docSnap = await userCollection(uid, "documents").doc(documentId).get();
    const filename =
      docSnap.exists && typeof (docSnap.data() as { safeDisplayFilename?: string }).safeDisplayFilename === "string"
        ? (docSnap.data() as { safeDisplayFilename: string }).safeDisplayFilename
        : "Lab report";
    const documentStatus =
      docSnap.exists && typeof (docSnap.data() as { status?: string }).status === "string"
        ? (docSnap.data() as { status: string }).status
        : "review_needed";

    const candidates: LabReviewCandidateDto[] = [];
    for (const r of draft.results) {
      const status = review.candidateStatuses[r.id] ?? "pending_review";
      const group =
        status === "auto_published"
          ? "matched"
          : r.aliasMatch.requiresReview || r.confidence < 0.85 || r.warnings.length > 0
            ? "needs_review"
            : "matched";
      candidates.push(toCandidateDto(r, group, status));
    }
    const unmatched = draft.unmatched.map((u) =>
      toCandidateDto(u, "unmatched", review.candidateStatuses[u.id] ?? "unresolved"),
    );

    const detail = labReviewDetailDtoSchema.parse({
      ok: true,
      summary: buildSummary({ documentId, filename, documentStatus, draft, review }),
      metadata: draft.reportCandidate,
      candidates,
      unmatched,
      warningMessages: [...new Set(draft.warnings.map((w) => labWarningConsumerMessage(w.code)))],
    });
    res.status(200).json(detail);
  }),
);

/** PATCH /users/me/labs/reviews/:documentId/candidates/:candidateId */
router.patch(
  "/:documentId/candidates/:candidateId",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const documentId = String(req.params.documentId ?? "");
    const candidateId = String(req.params.candidateId ?? "");
    const body = patchLabReviewCandidateRequestSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_BODY", requestId: getRid(req) } });
      return;
    }
    if (!body.data.reviewStatus && !body.data.correction) {
      res.status(400).json({ ok: false, error: { code: "INVALID_TRANSITION", requestId: getRid(req) } });
      return;
    }
    const review = await loadReview(uid, documentId);
    if (!review) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", requestId: getRid(req) } });
      return;
    }
    const draft = await loadLatestDraft(uid, documentId);
    if (!draft) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", requestId: getRid(req) } });
      return;
    }
    const knownIds = new Set([
      ...draft.results.map((r) => r.id),
      ...draft.unmatched.map((u) => u.id),
    ]);
    if (!knownIds.has(candidateId)) {
      res.status(404).json({ ok: false, error: { code: "CANDIDATE_NOT_FOUND", requestId: getRid(req) } });
      return;
    }
    if (review.reviewVersion !== body.data.reviewVersion) {
      res.status(409).json({ ok: false, error: { code: "REVIEW_VERSION_CONFLICT", requestId: getRid(req) } });
      return;
    }
    const now = new Date().toISOString();
    const nextStatuses = { ...review.candidateStatuses };
    const priorStatus = review.candidateStatuses[candidateId] ?? "pending_review";
    if (body.data.reviewStatus) nextStatuses[candidateId] = body.data.reviewStatus;
    const corrections = [...review.corrections];
    if (body.data.correction) {
      corrections.push({
        candidateId,
        correctedAt: now,
        reviewerType: "user",
        fields: body.data.correction,
      });
      nextStatuses[candidateId] = "user_corrected";
    }
    if (body.data.reviewStatus === "rejected" || nextStatuses[candidateId] === "rejected") {
      await unpublishAcceptedLabResult({
        documentId,
        candidateId,
        labAcceptedResultsCol: userCollection(uid, "labAcceptedResults") as never,
        labResultsCol: userCollection(uid, "labResults") as never,
      });
    } else if (
      body.data.correction &&
      (priorStatus === "auto_published" ||
        priorStatus === "user_accepted" ||
        priorStatus === "user_corrected")
    ) {
      const candidate = draft.results.find((r) => r.id === candidateId);
      if (candidate?.result && candidate.aliasMatch.canonicalMetricId) {
        const fields = body.data.correction;
        const correctedCandidate = {
          ...candidate,
          ...(fields.result ? { result: fields.result } : {}),
          ...(fields.rawUnit !== undefined || fields.normalizedUnit !== undefined
            ? {
                unit: {
                  ...candidate.unit,
                  rawUnit: fields.rawUnit !== undefined ? fields.rawUnit : candidate.unit.rawUnit,
                  normalizedUnit:
                    fields.normalizedUnit !== undefined
                      ? fields.normalizedUnit
                      : candidate.unit.normalizedUnit,
                },
              }
            : {}),
          ...(fields.rawReferenceRange !== undefined
            ? { rawReferenceRange: fields.rawReferenceRange }
            : {}),
          ...(fields.canonicalMetricId !== undefined
            ? {
                aliasMatch: {
                  ...candidate.aliasMatch,
                  canonicalMetricId: fields.canonicalMetricId,
                },
              }
            : {}),
        };
        if (correctedCandidate.result) {
          const accepted = buildAcceptedLabResult({
            userId: uid,
            draft,
            candidate: correctedCandidate,
            reviewStatus: "user_corrected",
            reviewVersion: String(review.reviewVersion + 1),
            acceptedAt: now,
            collectedAt: draft.reportCandidate.collectedAt ?? null,
            reportedAt: draft.reportCandidate.reportedAt ?? null,
            fasting: draft.reportCandidate.fasting ?? null,
          });
          await userCollection(uid, "labAcceptedResults").doc(accepted.id).set(accepted, { merge: true });
          const projection = projectAcceptedToLabMetricResultDto(accepted);
          if (projection) {
            await userCollection(uid, "labResults").doc(projection.id).set(projection, { merge: true });
          }
        }
      }
    }
    const next: LabReviewRecord = {
      ...review,
      candidateStatuses: nextStatuses,
      corrections,
      status:
        review.status === "not_started" ||
        review.status === "imported" ||
        review.status === "imported_with_exceptions"
          ? "in_progress"
          : review.status,
      reviewVersion: review.reviewVersion + 1,
      updatedAt: now,
    };
    await userCollection(uid, "labReviews").doc(review.id).set(next, { merge: true });
    res.status(200).json({ ok: true, reviewVersion: next.reviewVersion });
  }),
);

/** POST /users/me/labs/reviews/:documentId/accept */
router.post(
  "/:documentId/accept",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
      res.status(400).json({
        ok: false,
        error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key header is required", requestId: getRid(req) },
      });
      return;
    }
    const documentId = String(req.params.documentId ?? "");
    const body = acceptLabReviewRequestSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_BODY", requestId: getRid(req) } });
      return;
    }
    const draft = await loadLatestDraft(uid, documentId);
    const review = await loadReview(uid, documentId);
    if (!draft || !review) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", requestId: getRid(req) } });
      return;
    }

    // Idempotent replay when review already accepted under the same key.
    if (review.status === "accepted") {
      const priorKey = review.lastAcceptIdempotencyKey;
      if (priorKey === idempotencyKey) {
        const snap = await userCollection(uid, "labAcceptedResults")
          .where("sourceDocumentId", "==", documentId)
          .limit(200)
          .get();
        const acceptedIds = snap.docs.map((d) => d.id);
        res.status(200).json({
          ok: true,
          acceptedCount: acceptedIds.length,
          acceptedIds,
          unresolvedCount: 0,
          reviewVersion: review.reviewVersion,
          idempotentReplay: true as const,
        });
        return;
      }
      res.status(409).json({
        ok: false,
        error: { code: "REVIEW_ALREADY_ACCEPTED", requestId: getRid(req) },
      });
      return;
    }

    if (review.reviewVersion !== body.data.reviewVersion) {
      res.status(409).json({ ok: false, error: { code: "REVIEW_VERSION_CONFLICT", requestId: getRid(req) } });
      return;
    }

    const resolved = resolveCandidatesForAccept({
      draft,
      review,
      candidateIds: body.data.candidateIds,
    });
    if (resolved.accepted.length === 0) {
      res.status(400).json({
        ok: false,
        error: { code: "NO_ACCEPTABLE_CANDIDATES", requestId: getRid(req) },
      });
      return;
    }

    const now = new Date().toISOString();
    const acceptedIds: string[] = [];
    for (const candidate of resolved.accepted) {
      const accepted = buildAcceptedLabResult({
        userId: uid,
        draft,
        candidate,
        reviewStatus: candidate.reviewStatus === "user_corrected" ? "user_corrected" : "user_accepted",
        reviewVersion: String(review.reviewVersion + 1),
        acceptedAt: now,
        collectedAt: draft.reportCandidate.collectedAt ?? null,
        reportedAt: draft.reportCandidate.reportedAt ?? null,
        fasting: draft.reportCandidate.fasting ?? null,
      });
      await userCollection(uid, "labAcceptedResults").doc(accepted.id).set(accepted, { merge: true });
      const projection = projectAcceptedToLabMetricResultDto(accepted);
      if (projection) {
        await userCollection(uid, "labResults").doc(projection.id).set(projection, { merge: true });
      }
      acceptedIds.push(accepted.id);
    }

    const nextReview: LabReviewRecord = {
      ...review,
      status: "accepted",
      reviewVersion: review.reviewVersion + 1,
      updatedAt: now,
      acceptedAt: now,
      candidateStatuses: {
        ...review.candidateStatuses,
        ...Object.fromEntries(resolved.accepted.map((c) => [c.id, c.reviewStatus])),
      },
      lastAcceptIdempotencyKey: idempotencyKey,
    };
    await userCollection(uid, "labReviews").doc(review.id).set(nextReview, { merge: true });
    await userCollection(uid, "documents").doc(documentId).set(
      { status: "structured", updatedAt: now },
      { merge: true },
    );

    void transitionDocumentIngestionJobState;
    res.status(200).json({
      ok: true,
      acceptedCount: acceptedIds.length,
      acceptedIds,
      unresolvedCount: resolved.skippedUnresolved.length,
      reviewVersion: nextReview.reviewVersion,
    });
  }),
);

/** POST /users/me/labs/reviews/:documentId/reject */
router.post(
  "/:documentId/reject",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
      res.status(400).json({
        ok: false,
        error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key header is required", requestId: getRid(req) },
      });
      return;
    }
    const documentId = String(req.params.documentId ?? "");
    const body = rejectLabReviewRequestSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_BODY", requestId: getRid(req) } });
      return;
    }
    const review = await loadReview(uid, documentId);
    if (!review) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", requestId: getRid(req) } });
      return;
    }
    const priorRejectKey = review.lastRejectIdempotencyKey;
    if (priorRejectKey === idempotencyKey) {
      res.status(200).json({ ok: true, reviewVersion: review.reviewVersion, idempotentReplay: true as const });
      return;
    }
    if (review.reviewVersion !== body.data.reviewVersion) {
      res.status(409).json({ ok: false, error: { code: "REVIEW_VERSION_CONFLICT", requestId: getRid(req) } });
      return;
    }
    const now = new Date().toISOString();
    const nextStatuses = { ...review.candidateStatuses };
    for (const id of body.data.candidateIds) {
      nextStatuses[id] = "rejected";
      await unpublishAcceptedLabResult({
        documentId,
        candidateId: id,
        labAcceptedResultsCol: userCollection(uid, "labAcceptedResults") as never,
        labResultsCol: userCollection(uid, "labResults") as never,
      });
    }
    const next = {
      ...review,
      candidateStatuses: nextStatuses,
      status: "in_progress" as const,
      reviewVersion: review.reviewVersion + 1,
      updatedAt: now,
      lastRejectIdempotencyKey: idempotencyKey,
    };
    await userCollection(uid, "labReviews").doc(review.id).set(next, { merge: true });
    res.status(200).json({ ok: true, reviewVersion: next.reviewVersion });
  }),
);

export default router;
