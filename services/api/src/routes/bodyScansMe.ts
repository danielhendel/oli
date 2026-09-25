/**
 * Body Scans routes — /users/me/body-scans/*
 *
 * Authenticated and owner-scoped: every Firestore path is derived from the verified token
 * uid, never from a request body. Uploads stay on the Document Ingestion OS front door
 * (`/users/me/documents`, domain `scans`); these routes cover list, detail, review,
 * confirm, reprocess, and delete.
 *
 * Logs never contain scan values, filenames, storage paths, or signed URLs.
 */
import { Router, type Response } from "express";
import { z } from "zod";
import {
  bodyScanConfirmRequestDtoSchema,
  bodyScanConfirmResponseDtoSchema,
  bodyScanDeleteResponseDtoSchema,
  bodyScanDetailResponseDtoSchema,
  bodyScanReprocessResponseDtoSchema,
  bodyScanReviewResponseDtoSchema,
  bodyScansListResponseDtoSchema,
  userDocumentRecordSchema,
  type BodyScanExtractionDraft,
  type BodyScanRecord,
  type DocumentIngestionJob,
  type UserDocumentRecord,
} from "@oli/contracts";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { userCollection } from "../db";
import { requireFirebaseStorageBucketId } from "../lib/firebaseStorageBucketId";
import {
  createIngestionJobRecord,
  runDocumentIngestionJob,
} from "../lib/documents/runDocumentIngestion";
import {
  deleteDocumentOsRecord,
  type DeleteDocumentLifecycleDeps,
} from "../lib/documents/deleteDocumentLifecycle";
import { logBodyScanEvent, redactedBodyScanToken } from "../lib/bodyScans/bodyScanTelemetry";
import {
  bodyScanIdForDocument,
  buildBodyScanFact,
  loadBodyScanRecord,
  type BodyScanPersistenceDeps,
} from "../lib/bodyScans/persistBodyScan";
import { confirmBodyScanMetrics } from "../../../../lib/data/body-scans/confirmBodyScanMetrics";
import {
  safeBodyScanWarnings,
  toBodyScanDetailDto,
  toBodyScanListItemDto,
  toBodyScanReviewResponseDto,
} from "../../../../lib/data/body-scans/bodyScanDtoMappers";
import {
  canDeleteBodyScan,
  canReprocessBodyScan,
  transitionBodyScanStatus,
} from "../../../../lib/data/body-scans/bodyScanStatusMachine";
import { assertBodyScanWriteTargetAllowed } from "../../../../lib/data/body-scans/bodyScanTrendIsolation";

function getAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../firebaseAdmin").admin as typeof import("../firebaseAdmin").admin;
}

const router = Router();

const getRid = (req: AuthedRequest): string => (req as RequestWithRid).rid ?? "unknown";

const getIdempotencyKey = (req: AuthedRequest): string | undefined =>
  (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
  (typeof req.header("X-Idempotency-Key") === "string"
    ? req.header("X-Idempotency-Key")
    : undefined);

const scanIdParamsSchema = z.object({ scanId: z.string().min(1) });

function bodyScanDeps(uid: string): BodyScanPersistenceDeps {
  return {
    bodyScansCol: userCollection(uid, "bodyScans") as never,
    bodyScanDraftsCol: userCollection(uid, "bodyScanDrafts") as never,
    bodyScanFactsCol: userCollection(uid, "bodyScanFacts") as never,
  };
}

function toIsoFromTimestampLike(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

function parseUserDocument(raw: Record<string, unknown>, id: string): UserDocumentRecord | null {
  const validated = userDocumentRecordSchema.safeParse({
    ...raw,
    id,
    uploadedAt: toIsoFromTimestampLike(raw.uploadedAt) ?? raw.uploadedAt,
    createdAt: toIsoFromTimestampLike(raw.createdAt) ?? raw.createdAt,
    updatedAt: toIsoFromTimestampLike(raw.updatedAt) ?? raw.updatedAt,
  });
  return validated.success ? validated.data : null;
}

async function loadSourceDocument(uid: string, documentId: string): Promise<UserDocumentRecord | null> {
  const snap = await userCollection(uid, "documents").doc(documentId).get();
  if (!snap.exists) return null;
  return parseUserDocument(snap.data() as Record<string, unknown>, documentId);
}

async function loadDraft(uid: string, draftId: string | null): Promise<BodyScanExtractionDraft | null> {
  if (!draftId) return null;
  const snap = await userCollection(uid, "bodyScanDrafts").doc(draftId).get();
  if (!snap.exists) return null;
  return snap.data() as BodyScanExtractionDraft;
}

function draftWarningCodes(draft: BodyScanExtractionDraft | null): string[] {
  if (!draft) return ["unsupported_report_type"];
  const codes = draft.warnings.map((w) => w.code);
  if (draft.confidenceSummary.lowConfidenceFieldCount > 0) codes.push("low_confidence_fields");
  return codes;
}

function documentsDepsForIngestion(uid: string) {
  let bucket: string | null = null;
  try {
    bucket = requireFirebaseStorageBucketId();
  } catch {
    bucket = null;
  }
  return {
    documentsCol: userCollection(uid, "documents") as never,
    jobsCol: userCollection(uid, "documentIngestionJobs") as never,
    extractionsCol: userCollection(uid, "documentExtractions") as never,
    bodyScansCol: userCollection(uid, "bodyScans") as never,
    bodyScanDraftsCol: userCollection(uid, "bodyScanDrafts") as never,
    bodyScanFactsCol: userCollection(uid, "bodyScanFacts") as never,
    readDocumentBytes: async (storageObjectId: string): Promise<Uint8Array> => {
      if (!bucket) throw new Error("STORAGE_BUCKET_MISSING");
      const [buf] = await getAdmin().storage().bucket(bucket).file(storageObjectId).download();
      return new Uint8Array(buf);
    },
  };
}

function deleteLifecycleDeps(uid: string): DeleteDocumentLifecycleDeps {
  let bucket: string | null = null;
  try {
    bucket = requireFirebaseStorageBucketId();
  } catch {
    bucket = null;
  }
  return {
    documentsCol: userCollection(uid, "documents") as never,
    jobsCol: userCollection(uid, "documentIngestionJobs") as never,
    extractionsCol: userCollection(uid, "documentExtractions") as never,
    labUploadsCol: userCollection(uid, "labUploads") as never,
    labResultsCol: userCollection(uid, "labResults") as never,
    parseUserDocument,
    deleteStorageObject: async (objectPath: string) => {
      if (!bucket) return objectPath.length === 0 ? { ok: true } : { ok: false };
      try {
        await getAdmin().storage().bucket(bucket).file(objectPath).delete({ ignoreNotFound: true });
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },
  };
}

/** GET /users/me/body-scans */
router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 50) : 50;

    const snap = await userCollection(uid, "bodyScans")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const items = [];
    for (const doc of snap.docs) {
      const record = doc.data() as BodyScanRecord;
      if (!record || record.retentionStatus === "deleted") continue;
      if (record.status === "deleted" || record.status === "uploading") continue;
      items.push(toBodyScanListItemDto({ ...record, id: doc.id }));
    }

    const payload = { ok: true as const, items, nextCursor: null };
    const validated = bodyScansListResponseDtoSchema.safeParse(payload);
    if (!validated.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(validated.data);
  }),
);

/** GET /users/me/body-scans/:scanId */
router.get(
  "/:scanId",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const params = scanIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    const record = await loadBodyScanRecord(bodyScanDeps(uid), params.data.scanId);
    if (!record || record.retentionStatus === "deleted") {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "body-scans", id: params.data.scanId } });
      return;
    }

    const document = await loadSourceDocument(uid, record.documentId);
    const draft = await loadDraft(uid, record.extractionDraftId);
    const detail = toBodyScanDetailDto({
      record,
      sourceFilename: document?.safeDisplayFilename ?? "Body Scan report",
      safeWarnings: safeBodyScanWarnings(draftWarningCodes(draft)),
    });

    const out = bodyScanDetailResponseDtoSchema.safeParse({ ok: true, scan: detail });
    if (!out.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(out.data);
  }),
);

/** GET /users/me/body-scans/:scanId/review */
router.get(
  "/:scanId/review",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const params = scanIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    const record = await loadBodyScanRecord(bodyScanDeps(uid), params.data.scanId);
    if (!record || record.retentionStatus === "deleted") {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "body-scans", id: params.data.scanId } });
      return;
    }

    const draft = await loadDraft(uid, record.extractionDraftId);
    const payload = {
      ok: true as const,
      ...toBodyScanReviewResponseDto({
        record,
        draft,
        safeWarnings: safeBodyScanWarnings(draftWarningCodes(draft)),
      }),
    };
    const out = bodyScanReviewResponseDtoSchema.safeParse(payload);
    if (!out.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(out.data);
  }),
);

/**
 * POST /users/me/body-scans/:scanId/confirm
 *
 * Explicit human confirmation. Low-confidence fields must be corrected or acknowledged —
 * there is no auto-confirm path — and unanswered fields stay missing rather than zero.
 */
router.post(
  "/:scanId/confirm",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const params = scanIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }
    const parsedBody = bodyScanConfirmRequestDtoSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_BODY", requestId: getRid(req) } });
      return;
    }

    const { scanId } = params.data;
    const deps = bodyScanDeps(uid);
    const record = await loadBodyScanRecord(deps, scanId);
    if (!record || record.retentionStatus === "deleted") {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "body-scans", id: scanId } });
      return;
    }

    // Idempotent replay: a second confirm with the same key returns the settled state.
    const idempotencyKey = getIdempotencyKey(req);
    if (record.status === "verified") {
      const replay = bodyScanConfirmResponseDtoSchema.safeParse({
        ok: true,
        scanId,
        status: record.status,
        metricCount: record.metrics.length,
        idempotentReplay: true,
      });
      if (!replay.success) {
        res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
        return;
      }
      res.status(200).json(replay.data);
      return;
    }

    const transition = transitionBodyScanStatus(record.status, "verified");
    if (!transition.ok) {
      res.status(409).json({
        ok: false,
        error: { code: "BODY_SCAN_NOT_CONFIRMABLE", requestId: getRid(req) },
      });
      return;
    }

    const draft = await loadDraft(uid, record.extractionDraftId);
    if (!draft) {
      res.status(409).json({
        ok: false,
        error: { code: "BODY_SCAN_NO_EXTRACTION_DRAFT", requestId: getRid(req) },
      });
      return;
    }

    const confirmed = confirmBodyScanMetrics({
      draft,
      corrections: parsedBody.data.corrections ?? [],
      acknowledgedFieldIds: parsedBody.data.acknowledgedFieldIds ?? [],
    });
    if (!confirmed.ok) {
      res.status(422).json({
        ok: false,
        error: { code: confirmed.code, fieldIds: confirmed.fieldIds, requestId: getRid(req) },
      });
      return;
    }

    const now = new Date().toISOString();
    const nextRecord: BodyScanRecord = {
      ...record,
      scanType: parsedBody.data.scanType ?? record.scanType,
      performedAt:
        parsedBody.data.performedAt !== undefined ? parsedBody.data.performedAt : record.performedAt,
      status: "verified",
      metrics: confirmed.metrics,
      reviewedAt: now,
      correctionCount: confirmed.correctionCount,
      updatedAt: now,
    };

    assertBodyScanWriteTargetAllowed("bodyScans");
    await deps.bodyScansCol.doc(scanId).set(nextRecord);

    assertBodyScanWriteTargetAllowed("bodyScanFacts");
    await deps.bodyScanFactsCol
      .doc(`fact_${scanId}`)
      .set(buildBodyScanFact({ record: nextRecord, metrics: confirmed.metrics, confirmedAt: now }));

    logBodyScanEvent("body_scan_confirmed", {
      scanToken: redactedBodyScanToken(scanId),
      scanType: nextRecord.scanType,
      method: nextRecord.method,
      metricCount: confirmed.metrics.length,
      correctionCount: confirmed.correctionCount,
      requestId: getRid(req),
      ...(idempotencyKey ? { idempotent: true } : {}),
    });

    const out = bodyScanConfirmResponseDtoSchema.safeParse({
      ok: true,
      scanId,
      status: nextRecord.status,
      metricCount: confirmed.metrics.length,
    });
    if (!out.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(out.data);
  }),
);

/** POST /users/me/body-scans/:scanId/reprocess */
router.post(
  "/:scanId/reprocess",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const params = scanIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    const { scanId } = params.data;
    const deps = bodyScanDeps(uid);
    const record = await loadBodyScanRecord(deps, scanId);
    if (!record || record.retentionStatus === "deleted") {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "body-scans", id: scanId } });
      return;
    }
    if (!canReprocessBodyScan(record.status)) {
      res.status(409).json({ ok: false, error: { code: "BODY_SCAN_NOT_REPROCESSABLE", requestId: getRid(req) } });
      return;
    }

    const document = await loadSourceDocument(uid, record.documentId);
    if (!document) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", resource: "documents", id: record.documentId } });
      return;
    }

    const idempotencyKey = getIdempotencyKey(req);
    const jobsCol = userCollection(uid, "documentIngestionJobs");
    if (idempotencyKey) {
      const existing = await jobsCol.doc(idempotencyKey).get();
      if (existing.exists) {
        const replay = bodyScanReprocessResponseDtoSchema.safeParse({
          ok: true,
          scanId,
          status: record.status,
          idempotentReplay: true,
        });
        if (!replay.success) {
          res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
          return;
        }
        res.status(202).json(replay.data);
        return;
      }
    }

    const now = new Date().toISOString();
    assertBodyScanWriteTargetAllowed("bodyScans");
    await deps.bodyScansCol.doc(scanId).set({ ...record, status: "processing", updatedAt: now });

    const job = createIngestionJobRecord({ document });
    const jobId = idempotencyKey ?? job.id;
    const primed: DocumentIngestionJob = {
      ...job,
      id: jobId,
      state: "stored",
      updatedAt: now,
      stateHistory: [
        ...job.stateHistory,
        { state: "validating", at: now },
        { state: "storing", at: now },
        { state: "stored", at: now },
      ],
    };
    await jobsCol.doc(jobId).set(primed);

    logBodyScanEvent("body_scan_reprocess_requested", {
      scanToken: redactedBodyScanToken(scanId),
      scanType: record.scanType,
      method: record.method,
      requestId: getRid(req),
    });

    try {
      await runDocumentIngestionJob({
        deps: documentsDepsForIngestion(uid),
        uid,
        document,
        job: primed,
      });
    } catch {
      assertBodyScanWriteTargetAllowed("bodyScans");
      await deps.bodyScansCol.doc(scanId).set({
        ...record,
        status: "failed",
        failureCode: "REPROCESS_FAILED",
        updatedAt: new Date().toISOString(),
      });
    }

    const after = await loadBodyScanRecord(deps, scanId);
    const out = bodyScanReprocessResponseDtoSchema.safeParse({
      ok: true,
      scanId,
      status: after?.status ?? "processing",
    });
    if (!out.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(202).json(out.data);
  }),
);

/**
 * DELETE /users/me/body-scans/:scanId
 * Removes designed results, extraction draft, governed facts, and the source document
 * (metadata, ingestion jobs, extraction envelopes, and the private original bytes).
 */
router.delete(
  "/:scanId",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = req.uid;
    if (!uid) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }
    const params = scanIdParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ ok: false, error: { code: "INVALID_PARAMS", requestId: getRid(req) } });
      return;
    }

    const { scanId } = params.data;
    const deps = bodyScanDeps(uid);
    const record = await loadBodyScanRecord(deps, scanId);
    if (!record || record.retentionStatus === "deleted") {
      // Idempotent: a repeated delete of an already-removed scan is not an error state.
      const gone = bodyScanDeleteResponseDtoSchema.safeParse({ ok: true, scanId, deleted: true });
      if (!gone.success) {
        res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
        return;
      }
      res.status(200).json(gone.data);
      return;
    }
    if (!canDeleteBodyScan(record.status)) {
      res.status(409).json({ ok: false, error: { code: "BODY_SCAN_NOT_DELETABLE", requestId: getRid(req) } });
      return;
    }

    // Storage first: metadata is only removed once the original is provably gone.
    const documentResult = await deleteDocumentOsRecord({
      deps: deleteLifecycleDeps(uid),
      documentId: record.documentId,
    });
    if (!documentResult.ok && documentResult.code !== "NOT_FOUND") {
      res.status(500).json({ ok: false, error: { code: documentResult.code, requestId: getRid(req) } });
      return;
    }

    if (record.extractionDraftId) {
      assertBodyScanWriteTargetAllowed("bodyScanDrafts");
      await deps.bodyScanDraftsCol
        .doc(record.extractionDraftId)
        .delete()
        .catch(() => undefined);
    }
    assertBodyScanWriteTargetAllowed("bodyScanFacts");
    await deps.bodyScanFactsCol
      .doc(`fact_${scanId}`)
      .delete()
      .catch(() => undefined);
    assertBodyScanWriteTargetAllowed("bodyScans");
    await deps.bodyScansCol.doc(scanId).delete();

    logBodyScanEvent("body_scan_deleted", {
      scanToken: redactedBodyScanToken(scanId),
      scanType: record.scanType,
      method: record.method,
      requestId: getRid(req),
    });

    const out = bodyScanDeleteResponseDtoSchema.safeParse({ ok: true, scanId, deleted: true });
    if (!out.success) {
      res.status(500).json({ ok: false, error: { code: "INTERNAL_CONTRACT_MISMATCH", requestId: getRid(req) } });
      return;
    }
    res.status(200).json(out.data);
  }),
);

export { bodyScanIdForDocument };
export default router;
